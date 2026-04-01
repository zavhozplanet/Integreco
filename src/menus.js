/* ================================================================
   CONTEXT MENUS
================================================================ */
let ctxNodeId=null;
let activeBgGroupId=null;

function buildCtxRow(items){
  const row=document.getElementById('ctx-row1');row.innerHTML='';
  items.forEach(it=>{
    const d=document.createElement('div');d.className='cxi'+(it.danger?' del':'');
    d.innerHTML=it.icon;d.title=it.title||'';
    if(it.action)d.onclick=it.action;
    row.appendChild(d);
  });
}

function posMenu(m, cx, cy) {
  const mw = m.offsetWidth || 220;
  const mh = m.offsetHeight || 300;
  let x = cx, y = cy;
  if (x + mw > window.innerWidth) x = window.innerWidth - mw - 10;
  if (y + mh > window.innerHeight) y = Math.max(10, window.innerHeight - mh - 10);
  if (x < 0) x = 10;
  m.style.left = x + 'px';
  m.style.top = y + 'px';
}

function showMultiCtx(cx, cy) {
  hideAllMenus();
  const allLocked = [...selNSet].every(id => gN(id)?.locked);
  const lockIcon = allLocked ? '🔓' : '🔒';
  const lockTitle = allLocked ? '🔓' : '🔒';

  buildCtxRow([
    {icon:'📋',title:'📋',action:()=>{hideCtxMenu();ctxExecMulti('copy')}},
    {icon:'<div class="cdm-preview group"></div>',title:'Группа',action:()=>{hideCtxMenu();addToGroup()}},
    {icon:'⬇️',title:'⬇️',action:()=>{
      document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));
      document.getElementById('ctx-multi-dl-sub').classList.add('open');
    }},
    {icon:'🔗',title:'🔗',action:()=>{hideCtxMenu();ctxExecMulti('share')}},
    {icon:lockIcon,title:lockTitle,action:()=>{hideCtxMenu();ctxExecMulti('lock')}},
    {icon:'🗑',title:'🗑️',danger:true,action:()=>{hideCtxMenu();ctxExecMulti('delete')}}
  ]);
  ctxMenu.style.display='flex';
  posMenu(ctxMenu, cx, cy);
}

function getSelectionData() {
  const ns = nodes.filter(n => selNSet.has(n.id));
  const es = edges.filter(e => selNSet.has(e.from) && selNSet.has(e.to));
  return { ns, es };
}

function ctxExecMulti(cmd) {
  if(cmd==='delete') {
    sh();
    const toDelete = new Set(selNSet);
    nodes = nodes.filter(n => !toDelete.has(n.id));
    edges = edges.filter(e => !toDelete.has(e.from) && !toDelete.has(e.to));
    selNSet.clear();
    render();
    toast('Удалено');
  } else if(cmd==='lock') {
    sh();
    const allLocked = [...selNSet].every(id => gN(id)?.locked);
    selNSet.forEach(id => { const n=gN(id); if(n) n.locked = !allLocked; });
    render();
  } else if(cmd==='copy') {
    const {ns, es} = getSelectionData();
    clipboard = { type: 'multi', data: { nodes: JSON.parse(JSON.stringify(ns)), edges: JSON.parse(JSON.stringify(es)) } };
    toast('Скопировано');
  } else if(cmd==='share') {
    document.getElementById('mi-share').onclick();
  } else if(cmd.startsWith('dl-')) {
    const fmt = cmd.split('-')[1];
    const {ns, es} = getSelectionData();
    exportFmt(fmt, ns, es);
  }
}

function addToGroup() {
  hideCtxMenu();
  sh();
  const selectedIds = selNSet.size > 0 ? [...selNSet] : [ctxNodeId];
  if (selectedIds.length === 0) return;

  const selectedNodes = selectedIds.map(id => gN(id)).filter(n => n && n.type !== 'group');
  if (selectedNodes.length === 0) return;

  // Calculate bounding box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  selectedNodes.forEach(n => {
    const ext = nodeHalfExtents(n.id);
    minX = Math.min(minX, n.x - ext.hw);
    minY = Math.min(minY, n.y - ext.hh);
    maxX = Math.max(maxX, n.x + ext.hw);
    maxY = Math.max(maxY, n.y + ext.hh);
  });

  const padding = 40;
  const gx = (minX + maxX) / 2;
  const gy = (minY + maxY) / 2;
  const gw = (maxX - minX) + padding * 2;
  const gh = (maxY - minY) + padding * 2;

  // Check for intruders
  const otherNodes = nodes.filter(n => n.type !== 'group' && !selectedIds.includes(n.id));
  const rect = { x: minX - padding, y: minY - padding, w: gw, h: gh };
  const isInside = (n, r) => {
    const ext = nodeHalfExtents(n.id);
    return n.x + ext.hw > r.x && n.x - ext.hw < r.x + r.w &&
           n.y + ext.hh > r.y && n.y - ext.hh < r.y + r.h;
  };
  const intruders = otherNodes.filter(n => isInside(n, rect));

  const newId = ++idC;
  const newGroup = {
    id: newId,
    type: 'group',
    x: gx,
    y: gy,
    width: gw,
    height: gh,
    label: 'Группа',
    color: '#cccccc',
    locked: false,
    collapsed: false,
    nodes: selectedIds
  };

  nodes.push(newGroup);
  render();
  toast('📦');
}

function showNodeCtx(cx,cy,id){
  hideAllMenus();
  ctxNodeId=id;selNode(id);
  // close sub menus
  document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));
  const n=gN(id);
  if(!n)return;
  
  const lockIcon=n.locked?'🔓':'🔒';
  const lockTitle=n.locked?'🔓':'🔒';
  
  let rows = [];
  if(n.type === 'note') {
    rows = [
      {icon:'📝',title:'📝',action:()=>{hideCtxMenu();openNote(id,'edit')}},
      {icon:'🔗',title:'🔗',action:()=>{hideCtxMenu();startLinkMode(id)}},
      {icon:'<div class="cdm-preview group"></div>',title:'Группа',action:()=>{hideCtxMenu();addToGroup()}},
      {icon:'✂️',title:'✂️',action:()=>{hideCtxMenu();copyNodeToClip(id,true)}},
      {icon:'📋',title:'📋',action:()=>{hideCtxMenu();copyNodeToClip(id,false)}},
      {icon:lockIcon,title:lockTitle,action:()=>{hideCtxMenu();sh();n.locked=!n.locked;render()}},
      {icon:'🗑',title:'🗑️',danger:true,action:()=>{hideCtxMenu();delNode(id)}}
    ];
  } else {
    const root=nodes.find(n=>n.type==='root');
    rows = [
      {icon:'📝',title:'📝',action:()=>{
        hideCtxMenu();
        if(n.note) openNote(id, 'view');
        else openNote(id, 'edit');
      }},
      {icon:'➕',title:'➕',action:()=>{hideCtxMenu();addChild(id)}},
      {icon:'🔗',title:'🔗',action:()=>{hideCtxMenu();startLinkMode(id)}},
      {icon:'<div class="cdm-preview group"></div>',title:'Группа',action:()=>{hideCtxMenu();addToGroup()}},
      {icon:'✂️',title:'✂️',action:()=>{document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));document.getElementById('ctx-cut-sub').classList.add('open')}},
      {icon:'📋',title:'📋',action:()=>{document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));document.getElementById('ctx-copy-sub').classList.add('open')}},
      {icon:'📌',title:'📌',action:()=>{hideCtxMenu();ctxExec('paste')}},
      {icon:lockIcon,title:lockTitle,action:()=>{hideCtxMenu();sh();n.locked=!n.locked;render()}},
      {icon:'🔭',title:'🔭',action:()=>{hideCtxMenu();enterBranchView(id)}},
      ...(id!==root.id?[{icon:'🗑',title:'🗑️',danger:true,action:()=>{
        const hasCh=gCh(id).length>0;
        if(hasCh){
          // Has children: show submenu with two options
          document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));
          document.getElementById('ctx-del-sub').classList.add('open');
        } else {
          // Leaf node: delete immediately without submenu
          hideCtxMenu();ctxNodeId=id;ctxExec('del-branch');
        }
      }}]:[]),
    ];
  }
  
  buildCtxRow(rows);
  ctxMenu.style.display='flex';
  posMenu(ctxMenu, cx, cy);
}

function showGroupCtx(cx,cy,id){
  hideAllMenus();
  ctxNodeId=id;selNode(id);
  document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));
  const g=gN(id);
  if(!g)return;
  
  const lockIcon=g.locked?'🔓':'🔒';
  
  const rows = [
    {icon:'📝',title:'📝',action:()=>{hideCtxMenu();editNode(id,true)}},
    {icon:'📋',title:'📋',action:()=>{hideCtxMenu();copyNodeToClip(id,false)}},
    {icon:'📌',title:'📌',action:()=>{hideCtxMenu();ctxExec('paste')}},
    {icon:'<div class="cdm-preview group"></div>',title:'Группа',action:()=>{hideCtxMenu();addToGroup()}},
    {icon:'⬆️',title:'⬆️',action:()=>{hideCtxMenu();sh();const idx=nodes.findIndex(n=>n.id===id);if(idx>-1){const [n]=nodes.splice(idx,1);nodes.push(n);render()}}},
    {icon:'⬇️',title:'⬇️',action:()=>{hideCtxMenu();sh();const idx=nodes.findIndex(n=>n.id===id);if(idx>-1){const [n]=nodes.splice(idx,1);nodes.unshift(n);render()}}},
    {icon:'[ \ / ]',title:'Выровнять',action:()=>{hideCtxMenu();alignGroupNodes(id)}},
    {icon:lockIcon,title:lockIcon,action:()=>{hideCtxMenu();sh();g.locked=!g.locked;render()}},
    {icon:'🗑️',title:'🗑️',danger:true,action:()=>{hideCtxMenu();delNode(id)}}
  ];
  
  buildCtxRow(rows);
  ctxMenu.style.display='flex';
  posMenu(ctxMenu, cx, cy);
}

function showGroupBgCtx(cx,cy,id){
  activeBgGroupId = id;
  showCanvCtx(cx,cy);
}

function hideCtxMenu(){ctxMenu.style.display='none';document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'))}

function ctxExec(cmd){
  hideCtxMenu();
  const id=ctxNodeId;const n=gN(id);if(!n)return;
  if(cmd==='del-node'){delNode(id,true)}
  else if(cmd==='del-branch'){if(id!==nodes.find(n=>n.type==='root').id)delBranch(id)}
  else if(cmd==='cut-node'){clipboard={type:'node',data:JSON.parse(JSON.stringify(n))};delNode(id,true);toast('Узел вырезан')}
  else if(cmd==='cut-branch'){clipboard={type:'branch',data:cloneBranch(id)};delBranch(id);toast('Ветка вырезана')}
  else if(cmd==='copy-node'){clipboard={type:'node',data:JSON.parse(JSON.stringify(n))};toast('Узел скопирован')}
  else if(cmd==='copy-branch'){clipboard={type:'branch',data:cloneBranch(id)};toast('Ветка скопирована')}
  else if(cmd==='paste'){pasteClipboard()}
}

function cloneBranch(rootId){
  const ns=[],es=[];
  function col(id){const n=gN(id);if(!n)return;ns.push(JSON.parse(JSON.stringify(n)));gCh(id).forEach(cid=>{const e=edges.find(e=>e.from===id&&e.to===cid);if(e)es.push(JSON.parse(JSON.stringify(e)));col(cid)})}
  col(rootId);return{nodes:ns,edges:es,rootId};
}

function pasteClipboard(){
  if(!clipboard)return;sh();
  const rootNode = nodes.find(n=>n.type==='root');
  const targetId=selN||(rootNode&&rootNode.id);if(!targetId)return;
  const idMap={};
  if(clipboard.type==='node'){
    const d=clipboard.data;const newId=nid();idMap[d.id]=newId;
    const pos=smartPlace(targetId);
    nodes.push({id:newId,x:pos.x,y:pos.y,label:d.label,col:false,note:d.note||''});
    edges.push(mkEdge(targetId,newId,false));
  } else if(clipboard.type==='branch') {
    const{nodes:ns,edges:es,rootId}=clipboard.data;
    const pos=smartPlace(targetId);const dx=pos.x-gN(rootId).x,dy=pos.y-gN(rootId).y;
    ns.forEach(n=>{const ni=nid();idMap[n.id]=ni;nodes.push({id:ni,x:n.x+dx,y:n.y+dy,label:n.label,col:false,note:n.note||''})});
    es.forEach(e=>{if(idMap[e.from]&&idMap[e.to])edges.push({...e,id:nid(),from:idMap[e.from],to:idMap[e.to]})});
    edges.push(mkEdge(targetId,idMap[rootId],false));
  } else if(clipboard.type==='multi') {
    const {nodes:ns, edges:es} = clipboard.data;
    const pos=smartPlace(targetId);
    const xs = ns.map(n=>n.x), ys = ns.map(n=>n.y);
    const cx = (Math.min(...xs) + Math.max(...xs))/2;
    const cy = (Math.min(...ys) + Math.max(...ys))/2;
    const dx = pos.x - cx, dy = pos.y - cy;
    
    ns.forEach(n=>{const ni=nid();idMap[n.id]=ni;nodes.push({id:ni,x:n.x+dx,y:n.y+dy,label:n.label,col:false,note:n.note||'',locked:false})});
    es.forEach(e=>{if(idMap[e.from]&&idMap[e.to])edges.push({...e,id:nid(),from:idMap[e.from],to:idMap[e.to]})});
    
    const nodeIds = new Set(ns.map(n=>n.id));
    const roots = ns.filter(n => {
      const p = es.find(e => e.to === n.id && e.dash !== 'link');
      return !p || !nodeIds.has(p.from);
    });
    roots.forEach(r => edges.push(mkEdge(targetId, idMap[r.id], false)));
  }
  render();toast('Вставлено');
}

function getLuminance(hex){
  if(!hex) return 1;
  if(hex.startsWith('rgba') || hex.startsWith('rgb')) {
    const match = hex.match(/[\d.]+/g);
    if(match && match.length >= 3) {
      const rgb = [parseFloat(match[0])/255, parseFloat(match[1])/255, parseFloat(match[2])/255];
      const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    }
    return 1;
  }
  const match = hex.replace(/^#/, '').match(/.{2}/g);
  if(!match) return 1;
  const rgb = match.map(x => parseInt(x, 16) / 255);
  const [r, g, b] = rgb.map(c => c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function applyBg(groupId=null){
  const node = groupId ? gN(groupId) : null;
  if(groupId && !node) return;
  const bg = groupId ? node.bg : bgSettings;
  if(!bg) return;
  const base = groupId ? document.getElementById('g-bg-base-'+groupId) : document.getElementById('bg-base');
  const img = groupId ? document.getElementById('g-bg-img-'+groupId) : document.getElementById('bg-img');
  const pat = groupId ? document.getElementById('g-bg-pat-'+groupId) : document.getElementById('bg-pat');
  if(!base||!img||!pat)return;

  const isPaper = bg.pattern === 'paper';
  
  // 1. Base Layer
  if(isPaper){
    base.style.backgroundColor = '#f4e4bc';
    base.style.backgroundImage = `radial-gradient(circle at 50% 50%, rgba(0,0,0,0) 0%, rgba(0,0,0,0.05) 100%), url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.04' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.1'/%3E%3C/svg%3E")`;
    base.style.backgroundSize = 'cover, 200px 200px';
  } else if(bg.pattern === 'rough'){
    base.style.backgroundColor = bg.color;
    base.style.backgroundImage = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;
    base.style.backgroundSize = '200px 200px';
  } else {
    base.style.backgroundColor = bg.color;
    base.style.backgroundImage = 'none';
  }

  if(!groupId){
    const actualColor = isPaper ? '#f4e4bc' : bg.color;
    const lum = getLuminance(actualColor);
    if(lum < 0.3){
      document.body.style.setProperty('--sel-color', '#fff');
      document.body.style.setProperty('--sel-shadow', 'rgba(255,255,255,0.4)');
    } else {
      document.body.style.removeProperty('--sel-color');
      document.body.style.removeProperty('--sel-shadow');
    }
  }

  // 2. Photo Layer
  if(bg.imgEnabled && bg.image){
    img.style.backgroundImage = `url(${bg.image})`;
    img.style.opacity = bg.imgOpacity;
    img.style.filter = bg.imgBlur > 0 ? `blur(${bg.imgBlur}px)` : 'none';
    img.style.display = 'block';
  } else {
    img.style.display = 'none';
  }

  // 3. Pattern Layer
  if(!isPaper && (bg.pattern === 'dots' || bg.pattern === 'grid')){
    let patImg = '';
    let patSize = '';
    const lum = getLuminance(bg.color);
    const patCol = lum > 0.5 ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
    
    if(bg.pattern === 'dots'){
      const s = 20 * bg.patScale;
      patImg = `radial-gradient(circle, ${patCol} 1px, transparent 1px)`;
      patSize = `${s}px ${s}px`;
    } else if(bg.pattern === 'grid'){
      const s = 40 * bg.patScale;
      patImg = `linear-gradient(to right, ${patCol} 1px, transparent 1px), linear-gradient(to bottom, ${patCol} 1px, transparent 1px)`;
      patSize = `${s}px ${s}px`;
    }
    pat.style.backgroundImage = patImg;
    pat.style.backgroundSize = patSize;
    pat.style.opacity = bg.patOpacity;
    pat.style.filter = bg.patBlur > 0 ? `blur(${bg.patBlur}px)` : 'none';
    pat.style.display = 'block';
  } else {
    pat.style.display = 'none';
  }
}

function updateBg(key,val,save=true){
  if(save)sh();
  const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
  target[key]=val;
  if(key==='pattern'){
    if(val==='paper' || val==='rough'){
      if(val==='paper') target.lastColor = target.color;
      target.imgEnabled = false;
    }
  }
  if(activeBgGroupId) render(); else applyBg();
  renderCanvCtx();
}

function updateBgColor(c){
  sh();
  const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
  if(target.pattern !== 'paper') target.lastColor = c;
  target.color = c;
  if(activeBgGroupId) render(); else applyBg();
  renderCanvCtx();
}

function updateBgColorManual(c){
  sh();
  const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
  if(target.color !== c){
    target.recentColors = [c, ...(target.recentColors||[]).filter(x=>x!==c)].slice(0,5);
  }
  if(target.pattern !== 'paper') target.lastColor = c;
  target.color = c;
  if(activeBgGroupId) render(); else applyBg();
  renderCanvCtx();
}

function toggleImg(){
  const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
  if(!target.image) {
    document.getElementById('bg-file').click();
    return;
  }
  const next = !target.imgEnabled;
  if(next){
    sh();
    if(target.pattern === 'paper') {
      target.pattern = 'none';
      target.color = target.lastColor;
    } else if(target.pattern === 'rough') {
      target.pattern = 'none';
    }
    target.imgEnabled = true;
    if(activeBgGroupId) render(); else applyBg();
    renderCanvCtx();
  } else {
    updateBg('imgEnabled', false);
  }
}

function handleBgFile(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    sh();
    const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
    target.image=e.target.result;
    target.imgEnabled=true;
    if(target.pattern === 'paper') {
      target.pattern = 'none';
      target.color = target.lastColor;
    } else if(target.pattern === 'rough') {
      target.pattern = 'none';
    }
    if(activeBgGroupId) render(); else applyBg();
    renderCanvCtx();
  };
  reader.readAsDataURL(file);
}

function renderCanvCtx(){
  const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
  const isPaper = target.pattern === 'paper';
  const isRough = target.pattern === 'rough';
  const isSpecial = isPaper || isRough;

  // Colors
  const colGroup = document.getElementById('bg-col-group');
  if(isPaper) colGroup.classList.add('bg-inactive'); else colGroup.classList.remove('bg-inactive');
  
  const list=document.getElementById('bg-colors-list');list.innerHTML='';
  BG_COLS.forEach(c=>{
    const s=document.createElement('div');s.className='bg-swatch' + (target.color===c?' active':'');
    s.style.backgroundColor=c;
    s.onclick=()=>updateBgColor(c);list.appendChild(s);
  });
  
  const rec=document.getElementById('bg-recent-list');rec.innerHTML='';
  (target.recentColors||[]).forEach(c=>{
    const s=document.createElement('div');s.className='bg-swatch';s.style.backgroundColor=c;
    s.onclick=()=>updateBgColorManual(c);rec.appendChild(s);
  });

  // Patterns
  ['none','dots','grid','rough','paper'].forEach(p=>{
    const btn=document.getElementById('bg-pat-'+p);
    if(target.pattern===p) btn.classList.add('on'); else btn.classList.remove('on');
  });

  const patSliders = document.getElementById('pat-sliders');
  const hasPat = target.pattern==='dots' || target.pattern==='grid';
  if(!hasPat) patSliders.classList.add('bg-inactive'); else patSliders.classList.remove('bg-inactive');

  document.getElementById('bg-pat-scale').value=target.patScale;
  document.getElementById('bg-pat-opacity').value=target.patOpacity;
  document.getElementById('bg-pat-blur').value=target.patBlur;

  // Image
  const imgSwitch = document.getElementById('bg-img-switch');
  imgSwitch.checked = target.imgEnabled;

  const imgSliders = document.getElementById('img-sliders');
  if(!target.imgEnabled) imgSliders.classList.add('bg-inactive'); else imgSliders.classList.remove('bg-inactive');

  document.getElementById('bg-img-opacity').value=target.imgOpacity;
  document.getElementById('bg-img-blur').value=target.imgBlur;
}

function showCanvCtx(cx,cy){
  hideAllMenus();
  canvCtx.style.display='block';
  posMenu(canvCtx, cx, cy);
  canvCtx._cx=cx;canvCtx._cy=cy;
  renderCanvCtx();
}
function canvCtxNewMap(){
  canvCtx.style.display='none';
  const rc=wrap.getBoundingClientRect();
  const p=s2c(canvCtx._cx-rc.left,canvCtx._cy-rc.top);
  sh();const id=mkNode(p.x,p.y,'',null);render();selN=id;render();
  if(isMob())showMobRename(id,true);else setTimeout(()=>editNode(id,true),50);
}

function hideAllMenus(){
  hideCtxMenu();
  canvCtx.style.display='none';
  activeBgGroupId=null;
  mmenu.classList.remove('show');
  document.getElementById('n-burger-menu').classList.remove('show');
  hideCanvDblMenu();
  closeLp();
  // close settings modal if open
  const smod=document.getElementById('smod');
  if(smod) smod.style.display='none';
}

