// @ts-nocheck
/* ================================================================
   CONTEXT MENUS
================================================================ */
let ctxNodeId=null;
let activeBgGroupId=null;

function buildCtxRow(items){
  const row=document.getElementById('ctx-row1');row.innerHTML='';
  items.forEach(it=>{
    const d=document.createElement('div');d.className='cxi'+(it.danger?' del':'')+(it.disabled?' disabled':'');
    d.innerHTML=it.icon;d.title=it.title||'';
    if(it.action && !it.disabled)d.onclick=it.action;
    row.appendChild(d);
  });
}

function posMenu(m, cx, cy) {
  // Ensure we measure the element correctly
  const wasHidden = m.style.display === 'none';
  if(wasHidden) m.style.visibility = 'hidden', m.style.display = 'flex';
  
  const mw = m.offsetWidth || 220;
  const mh = m.offsetHeight || 300;
  
  if(wasHidden) m.style.display = 'none', m.style.visibility = 'visible';

  let x = cx;
  if (x + mw > window.innerWidth) x = window.innerWidth - mw - 10;
  if (x < 10) x = 10;
  m.style.left = x + 'px';
  
  let y = cy;
  // If it doesn't fit below, try to place it above
  if (y + mh > window.innerHeight) {
    if (cy - mh > 10) {
      y = cy - mh;
    } else {
      // If it doesn't fit either side perfectly, clamp to bottom but stay inside
      y = Math.max(10, window.innerHeight - mh - 10);
    }
  }
  
  m.style.top = y + 'px';
  m.style.bottom = 'auto'; // Reset bottom in case it was set by old code
}

function openSubmenu(subId) {
  document.querySelectorAll('.ctx-sub').forEach(s => s.classList.remove('open'));
  const sub = document.getElementById(subId);
  if (sub) {
    if (subId === 'ctx-node-settings-sub') ctxMenu.classList.add('sub-only');
    sub.classList.add('open');
    if (ctxMenu._cx != null && ctxMenu.style.display !== 'none') {
       posMenu(ctxMenu, ctxMenu._cx, ctxMenu._cy);
    }
  }
}

function showMultiCtx(cx, cy, id = null) {
  hideAllMenus();
  if(id) ctxNodeId = id;
  else if(selNSet.size > 0) ctxNodeId = [...selNSet][0];

  ctxMenu._cx = cx; ctxMenu._cy = cy; // Save for submenus
  ctxMenu.classList.remove('sub-only');
  const allLocked = [...selNSet].every(id => gN(id)?.locked);
  const lockIcon = allLocked ? '🔓' : '🔒';
  const lockTitle = allLocked ? '🔓' : '🔒';

  buildCtxRow([
    {icon:'📋',title:'📋',action:()=>{hideCtxMenu();ctxExecMulti('copy')}},
    {icon:'🖋️',title:'🖋️ Форматирование текста',action:(ev)=>{hideCtxMenu();showTextFmtCtx(ev,'node',[...selNSet][0])}},
    {icon:'<div class="cdm-preview group"></div>',title:'Группа',action:()=>{hideCtxMenu();addToGroup()}},
    {icon:'⬇️',title:'⬇️',action:()=>{ openSubmenu('ctx-multi-dl-sub'); }},
    {icon:'🔗',title:'🔗',action:()=>{hideCtxMenu();ctxExecMulti('share')}},
    {icon:'⚙️',title:'⚙️ Настройки',action:()=>{
      openSubmenu('ctx-node-settings-sub');
      if(ctxNodeId) syncNodeSettingsUI(ctxNodeId);
    }},
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
    const root = nodes.find(n => n.type === 'root');
    const toDelete = new Set(selNSet);
    if(root) toDelete.delete(root.id);
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
  ctxMenu._cx = cx; ctxMenu._cy = cy; // Save for submenus
  const n=gN(id);
  if(!n)return;
  
  ctxMenu.classList.remove('sub-only');
  const lockIcon=n.locked?'🔓':'🔒';
  const lockTitle=n.locked?'🔓':'🔒';
  
  let rows = [];
  if(n.type === 'note') {
    rows = [
      {icon:'⚙️',title:'Настройки рамки',action:()=>{
        openSubmenu('ctx-node-settings-sub');
        syncNodeSettingsUI(id);
      }},
      {icon:'📝',title:'Открыть заметку',action:()=>{hideCtxMenu();openNote(id,'edit')}},
      {icon:'🔗',title:'Связать (линия)',action:()=>{hideCtxMenu();startLinkMode(id)}},
      {icon:'<div class="cdm-preview group"></div>',title:'Добавить в группу',action:()=>{hideCtxMenu();addToGroup()}},
      {icon:'✂️',title:'Вырезать',action:()=>{hideCtxMenu();copyNodeToClip(id,true)}},
      {icon:'📋',title:'Копировать',action:()=>{hideCtxMenu();copyNodeToClip(id,false)}},
      {icon:lockIcon,title:lockTitle,action:()=>{hideCtxMenu();sh();n.locked=!n.locked;render()}},
      {icon:'🗑',title:'Удалить',danger:true,action:()=>{hideCtxMenu();delNode(id)}}
    ];
  } else {
    rows = [
      {icon:'⚙️',title:'⚙️ Настройки',action:()=>{
        openSubmenu('ctx-node-settings-sub');
        syncNodeSettingsUI(id);
      }},
      {icon:'📝',title:'Открыть заметку',action:()=>{
        hideCtxMenu();
        if(n.note) openNote(id, 'view');
        else openNote(id, 'edit');
      }},
      {icon:'➕',title:'Добавить дочерний узел',action:()=>{hideCtxMenu();addChild(id)}},
      {icon:'🖋️',title:'Форматирование текста',action:(ev)=>{hideCtxMenu();showTextFmtCtx(ev,'node',id)}},
      {icon:'🔗',title:'Связать (пунктирная линия)',action:()=>{hideCtxMenu();startLinkMode(id)}},
      {icon:'<div class="cdm-preview group"></div>',title:'Добавить в группу',action:()=>{hideCtxMenu();addToGroup()}},
      {icon:'✂️',title:'Вырезать',action:()=>{ openSubmenu('ctx-cut-sub'); }},
      {icon:'📋',title:'Копировать',action:()=>{ openSubmenu('ctx-copy-sub'); }},
      {icon:'📌',title:'Вставить',action:()=>{hideCtxMenu();ctxExec('paste')}},
      {icon:lockIcon,title:lockTitle,
       disabled: (n.type === 'root' && n.mapBg && n.mapBg.image && n.mapBg.imgEnabled),
       action:()=>{hideCtxMenu();sh();n.locked=!n.locked;render()}},

      {icon:'🔭',title:'Войти в режим ветки (Filter View)',action:()=>{hideCtxMenu();enterBranchView(id)}},
      {icon:'🗺️',title:'Открыть как карту',action:()=>{hideCtxMenu();openObjectAsMap(id)}},
      {icon:'🗑',title:'Удалить',danger:true,action:()=>{
        const isRoot = n.type === 'root';
        const hasCh = gCh(id).length > 0;
        if (isRoot && hasCh) return;
        if(hasCh) openSubmenu('ctx-del-sub');
        else { hideCtxMenu(); ctxNodeId=id; ctxExec('del-branch'); }
      }, disabled: (n.type === 'root' && gCh(id).length > 0)},
    ];
  }
  
  buildCtxRow(rows);
  ctxMenu.style.display='flex';
  posMenu(ctxMenu, cx, cy);
}

function showGroupCtx(cx,cy,id){
  hideAllMenus();
  ctxNodeId=id;selNode(id);
  ctxMenu._cx = cx; ctxMenu._cy = cy; // Save for submenus
  document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));
  const g=gN(id);
  if(!g)return;
  
  const lockIcon=g.locked?'🔓':'🔒';
  
  const rows = [
    {icon:'📝',title:'Открыть заголовок/заметку',action:()=>{hideCtxMenu();openNote(id,'edit')}},
    {icon:'🖋️',title:'Форматирование текста',action:(ev)=>{hideCtxMenu();showTextFmtCtx(ev,'node',id)}},
    {icon:'📋',title:'Копировать данные группы',action:()=>{hideCtxMenu();copyNodeToClip(id,false)}},
    {icon:'📌',title:'Вставить в группу',action:()=>{hideCtxMenu();ctxExec('paste')}},
    {icon:'<div class="cdm-preview group"></div>',title:'Добавить в другую группу',action:()=>{hideCtxMenu();addToGroup()}},
    {icon:'[ \ / ]',title:'Выровнять узлы сеткой',action:()=>{hideCtxMenu();alignGroupNodes(id)}},
    {icon:'🗺️',title:'Открыть как карту',action:()=>{hideCtxMenu();openObjectAsMap(id)}},
    {icon:lockIcon,title:g.locked?'Разблокировать':'Заблокировать',action:()=>{hideCtxMenu();sh();g.locked=!g.locked;render()}},
    {icon:'🗑️',title:'Разгруппировать/Удалить группу',danger:true,action:()=>{hideCtxMenu();delNode(id)}}
  ];
  
  buildCtxRow(rows);
  ctxMenu.style.display='flex';
  posMenu(ctxMenu, cx, cy);
}

function showGroupBgCtx(cx,cy,id){
  hideAllMenus();
  canvCtx._cx = cx; canvCtx._cy = cy; // Save for submenus
  activeBgGroupId = id;
  canvCtx.style.display='block';
  posMenu(canvCtx, cx, cy);
  renderCanvCtx();
}

function hideCtxMenu(){
  ctxMenu.style.display='none';
  document.querySelectorAll('.ctx-sub').forEach(s=>s.classList.remove('open'));
  ctxMenu.classList.remove('sub-only');
}

let activeColorTarget = 'border';
let activeGroupColorTarget = 'bg';

function setBgColorTarget(t){
  activeGroupColorTarget = t;
  document.getElementById('bg-col-target-bg').classList.toggle('on', t === 'bg');
  document.getElementById('bg-col-target-title').classList.toggle('on', t === 'title');
  renderCanvCtx();
}

function toggleBgPin(block){
  if(!activeBgGroupId) return;
  const g = gN(activeBgGroupId); if(!g) return;
  const target = g.bg;
  sh();
  if(block === 'color') {
    groupDefaults.bg.color = target.color;
    groupDefaults.bg.titleColor = target.titleColor || '#2c2a27';
    groupDefaults.bg.titleOpacity = target.titleOpacity != null ? target.titleOpacity : 0.95;
    groupDefaults.bg.opacity = target.opacity != null ? target.opacity : 0.1;
  } else if(block === 'pattern') {
    groupDefaults.bg.pattern = target.pattern;
    groupDefaults.bg.patScale = target.patScale;
    groupDefaults.bg.patOpacity = target.patOpacity;
    groupDefaults.bg.patBlur = target.patBlur;
  } else if(block === 'image') {
    groupDefaults.bg.imgEnabled = target.imgEnabled;
    groupDefaults.bg.imgOpacity = target.imgOpacity;
    groupDefaults.bg.imgBlur = target.imgBlur;
    groupDefaults.bg.image = target.image; // Pin the image content
  }
  toast(`Настройка «${block}» сохранена для новых групп`);
  renderCanvCtx();
}

function setNsColorTarget(target) {
  activeColorTarget = target;
  document.getElementById('ns-col-target-border').classList.toggle('on', target === 'border');
  document.getElementById('ns-col-target-bg').classList.toggle('on', target === 'bg');
  syncNodeSettingsUI(ctxNodeId);
}

function toggleNodePin(block) {
  if(!ctxNodeId) return;
  const n = gN(ctxNodeId);
  const s = (n && n.style) || {};
  
  if(block === 'shape') nodeDefaults.style.shape = s.shape || 'pill';
  else if(block === 'params') {
    nodeDefaults.style.padding = s.padding != null ? s.padding : (n.type==='root'?14:10);
    nodeDefaults.style.opacity = s.opacity != null ? s.opacity : 1;
    nodeDefaults.style.blur = s.blur != null ? s.blur : 0;
  } else if(block === 'line') {
    nodeDefaults.style.borderType = s.borderType || 'solid';
    nodeDefaults.style.borderWidth = s.borderWidth != null ? s.borderWidth : 1.5;
  } else if(block === 'color') {
    nodeDefaults.style.borderColor = s.borderColor;
    nodeDefaults.style.backgroundColor = s.backgroundColor;
  }
  toast('Настройки сохранены как «По умолчанию»');
  syncNodeSettingsUI(ctxNodeId);
}

function syncNodeSettingsUI(id) {
  const n = gN(id);
  if(!n) return;
  const s = n.style || {};
  
  // Sync Pins (Value-based check)
  const d = nodeDefaults.style;
  document.getElementById('ns-pin-shape')?.classList.toggle('active', (s.shape||'pill') === d.shape);
  document.getElementById('ns-pin-params')?.classList.toggle('active', 
    (s.padding != null ? s.padding : (n.type==='root'?14:10)) === d.padding &&
    (s.opacity != null ? s.opacity : 1) === d.opacity &&
    (s.blur != null ? s.blur : 0) === d.blur
  );
  document.getElementById('ns-pin-line')?.classList.toggle('active', 
    (s.borderType||'solid') === d.borderType &&
    (s.borderWidth != null ? s.borderWidth : 1.5) === d.borderWidth
  );
  document.getElementById('ns-pin-color')?.classList.toggle('active', 
    s.borderColor === d.borderColor &&
    s.backgroundColor === d.backgroundColor
  );
  
  // Update Shape UI
  ['pill','round','rect'].forEach(p => {
    const btn = document.getElementById('ns-shape-' + p);
    if(btn) {
      if((s.shape || 'pill') === p) btn.classList.add('on');
      else btn.classList.remove('on');
      // Hide pill (round ends) for multi-nodes, keep round (rounded corners) and rect
      if(n.type === 'multi' && p === 'pill') btn.style.display = 'none';
      else btn.style.display = '';
    }
  });

  // Update Border Type UI
  ['none','solid','dashed','dotted'].forEach(p => {
    const btn = document.getElementById('ns-btype-' + p);
    if(btn) {
      if((s.borderType || 'solid') === p) btn.classList.add('on');
      else btn.classList.remove('on');
    }
  });

  // Update Sliders
  const widthEl = document.getElementById('ns-width');
  if(widthEl) widthEl.value = s.borderWidth != null ? s.borderWidth : 1.5;
  const padEl = document.getElementById('ns-pad');
  if(padEl) padEl.value = s.padding != null ? s.padding : (n.type==='root'?14:10);
  const opacityEl = document.getElementById('ns-opacity');
  if(opacityEl) opacityEl.value = s.opacity != null ? s.opacity : 1;
  const blurEl = document.getElementById('ns-blur');
  if(blurEl) blurEl.value = s.blur != null ? s.blur : 0;

  // Build colors list
  const list = document.getElementById('ns-colors-list');
  const activeColor = activeColorTarget === 'border' ? (s.borderColor||'') : (s.backgroundColor||'');
  if(list) {
    list.innerHTML = '';
    BG_COLS.forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'bg-swatch' + (activeColor === c ? ' active' : '');
      swatch.style.backgroundColor = c;
      swatch.onclick = () => updateNodeStyle(activeColorTarget === 'border' ? 'borderColor' : 'backgroundColor', c, true);
      list.appendChild(swatch);
    });
  }
  
  const recList = document.getElementById('ns-recent-list');
  if(recList) {
    recList.innerHTML = '';
    (nodeDefaults.recentColors || []).forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'bg-swatch' + (activeColor === c ? ' active' : '');
      swatch.style.backgroundColor = c;
      swatch.onclick = () => updateNodeStyle(activeColorTarget === 'border' ? 'borderColor' : 'backgroundColor', c, true);
      recList.appendChild(swatch);
    });
  }

  // Apply to Selected button state
  const btn = document.getElementById('ns-apply-all-btn');
  if(btn) {
    const isSelected = selNSet.has(ctxNodeId);
    const sameTypeCount = isSelected ? [...selNSet].filter(oid => oid !== ctxNodeId && gN(oid)?.type === n.type).length : 0;
    btn.disabled = sameTypeCount === 0;
  }
}

function applyNodeStyleToSelection() {
  const isSelected = selNSet.has(ctxNodeId);
  const primaryId = ctxNodeId || (selNSet.size > 0 ? [...selNSet][0] : null);
  if(!primaryId) return;
  const primaryNode = gN(primaryId);
  if(!primaryNode) return;
  
  const targets = (isSelected ? [...selNSet] : [primaryId])
    .filter(id => id !== primaryId)
    .map(id => gN(id))
    .filter(n => n && n.type === primaryNode.type);
    
  if(targets.length === 0) return;
  sh();
  
  // Visual feedback
  const btn = document.getElementById('ns-apply-all-btn');
  if(btn) {
    btn.classList.add('apply-btn-flash');
    setTimeout(() => btn.classList.remove('apply-btn-flash'), 700);
  }

  targets.forEach(n => {
    n.style = JSON.parse(JSON.stringify(primaryNode.style || {}));
  });
  render();
  toast('Стили применены к ' + targets.length + ' объектам');
}

function updateNodeStyle(key, val, commit=true) {
  const isSelected = selNSet.has(ctxNodeId);
  const primaryId = ctxNodeId || (selNSet.size > 0 ? [...selNSet][0] : null);
  if(!primaryId) return;
  const primaryNode = gN(primaryId);
  if(!primaryNode) return;
  
  const targets = isSelected 
    ? [...selNSet].map(id => gN(id)).filter(n => n && n.type === primaryNode.type) 
    : [primaryNode];

  if(commit) sh();
  
  // Update recent colors only once
  if(['borderColor', 'backgroundColor'].includes(key) && val && val.startsWith('#')) {
    if(!nodeDefaults.recentColors) nodeDefaults.recentColors = [];
    if(!nodeDefaults.recentColors.includes(val) && !BG_COLS.includes(val)) {
      nodeDefaults.recentColors.unshift(val);
      if(nodeDefaults.recentColors.length > 5) nodeDefaults.recentColors.pop();
    }
  }

  targets.forEach(n => {
    if(!n.style) n.style = {};
    if(val === null) delete n.style[key];
    else n.style[key] = val;
  });

  syncNodeSettingsUI(primaryId);
  render();
}

function ctxExec(cmd){
  hideCtxMenu();
  const id=ctxNodeId;const n=gN(id);if(!n)return;
  if(cmd==='del-node'){delNode(id,true)}
  else if(cmd==='del-branch'){
    if(n.type !== 'root' || gCh(id).length === 0) delBranch(id);
  }
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
    const d=clipboard.data;
    const pos=smartPlace(targetId);
    // mkNode handles ID generation, type, defaults, and edge creation.
    const newId = mkNode(pos.x, pos.y, d.label, targetId, false, d.type || 'node', d.style);
    const n = gN(newId);
    if(n && d.note) n.note = d.note;
    
  } else if(clipboard.type==='branch') {
    const{nodes:ns,edges:es,rootId}=clipboard.data;
    const pos=smartPlace(targetId);
    const rootNSource = ns.find(n => n.id === rootId);
    const dx = pos.x - (rootNSource ? rootNSource.x : 0);
    const dy = pos.y - (rootNSource ? rootNSource.y : 0);
    
    // First pass: Create all nodes
    ns.forEach(n => {
      const isRootOfBranch = n.id === rootId;
      // Connect only the branch root to targetId. Children will be linked by recreated edges.
      const pid = isRootOfBranch ? targetId : null;
      const newId = mkNode(n.x+dx, n.y+dy, n.label, pid, false, n.type || 'node', n.style);
      idMap[n.id] = newId;
      const newNode = gN(newId);
      if(newNode) {
        newNode.note = n.note || '';
        if(n.width) newNode.width = n.width;
        if(n.height) newNode.height = n.height;
        if(n.bg) newNode.bg = JSON.parse(JSON.stringify(n.bg));
      }
    });
    // Second pass: Recreate internal edges with original styles
    es.forEach(e => {
      if(idMap[e.from] && idMap[e.to]) {
        edges.push({...e, id:nid(), from:idMap[e.from], to:idMap[e.to]});
      }
    });
    
  } else if(clipboard.type==='multi') {
    const {nodes:ns, edges:es} = clipboard.data;
    const pos=smartPlace(targetId);
    const xs = ns.map(n=>n.x), ys = ns.map(n=>n.y);
    const cx = (Math.min(...xs) + Math.max(...xs))/2;
    const cy = (Math.min(...ys) + Math.max(...ys))/2;
    const dx = pos.x - cx, dy = pos.y - cy;
    
    ns.forEach(n => {
      const newId = mkNode(n.x+dx, n.y+dy, n.label, null, false, n.type || 'node', n.style);
      idMap[n.id] = newId;
      const newNode = gN(newId);
      if(newNode) {
        newNode.note = n.note || '';
        newNode.locked = false;
        if(n.width) newNode.width = n.width;
        if(n.height) newNode.height = n.height;
      }
    });
    
    es.forEach(e => {
      if(idMap[e.from] && idMap[e.to]) {
        edges.push({...e, id:nid(), from:idMap[e.from], to:idMap[e.to]});
      }
    });
    
    const nodeIds = new Set(ns.map(n=>n.id));
    const roots = ns.filter(n => {
      const p = es.find(e => e.to === n.id && e.dash !== 'link');
      return !p || !nodeIds.has(p.from);
    });
    roots.forEach(r => edges.push(mkEdge(targetId, idMap[r.id], false)));
  }
  render(); toast('Вставлено');
}

// getLuminance is defined in utils.js (loaded earlier)


function applyBg(groupId=null){
  let bg;
  if(groupId) {
    const g = gN(groupId);
    if(g && !g.bg) g.bg = JSON.parse(JSON.stringify(groupDefaults.bg));
    bg = g ? g.bg : bgSettings;
  } else {
    bg = bgSettings;
  }
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
  
  // 1.1 Global Background Sync for UI Icons
  if (!groupId && typeof syncUiBtnColors === 'function') {
    syncUiBtnColors();
  }

  if(groupId) {
    base.style.opacity = bg.opacity != null ? bg.opacity : 1;
  }

  if(!groupId){
    const actualColor = isPaper ? '#f4e4bc' : bg.color;
    const lum = getLuminance(actualColor);
    if(lum < 0.45){
      document.body.classList.add('is-dark-bg');
      document.body.style.setProperty('--sel-color', '#fff');
      document.body.style.setProperty('--sel-shadow', 'rgba(255,255,255,0.4)');
    } else {
      document.body.classList.remove('is-dark-bg');
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

function updateBg(key, val, commit=true){
  const primaryId = activeBgGroupId;
  const isGroup = !!primaryId;
  const isSelected = isGroup && selNSet.has(primaryId);
  
  const targets = isSelected
    ? [...selNSet].map(id => gN(id)).filter(n => n && n.type === 'group').map(n => n.bg)
    : [isGroup ? gN(primaryId).bg : bgSettings];

  targets.forEach(target => {
    let k = key;
    if(key === 'opacity' && isGroup && activeGroupColorTarget === 'title') k = 'titleOpacity';
    if(target[k] === val) return;
    target[k] = val;

    // Auto-toggle imgEnabled based on imgOpacity
    if (k === 'imgOpacity') {
      if (val === 0 && target.imgEnabled) target.imgEnabled = false;
      else if (val > 0 && !target.imgEnabled) target.imgEnabled = true;
    }

    if(key==='pattern'){
      if(val==='paper' || val==='rough'){
        if(val==='paper') target.lastColor = target.color;
        target.imgEnabled = false;
      }
    }
  });

  if(isGroup) render(); else applyBg();
  if(commit) { sh(); renderCanvCtx(); }
}

/* ================================================================
   TEXT FORMATTING CONTEXT MENU
   ================================================================ */
let ctxTextId = null;
let ctxTextType = 'node'; // 'node', 'edge', 'note-title', 'note-text'
// Captured textarea selection before the menu opened: {el, start, end} or null
let ctxTextSelection = null;

function showTextFmtCtx(ev, type, id, selection) {
  ev.preventDefault();
  ev.stopPropagation();
  hideAllMenus();
  
  ctxTextId = id;
  ctxTextType = type;
  ctxTextSelection = selection || null;
  
  const menu = document.getElementById('text-fmt-ctx');
  if(!menu) return;
  
  menu.style.display = 'flex';
  
  if (type === 'note-title' || type === 'note-text') {
    const nbox = document.getElementById('nbox');
    if (nbox) {
      const rect = nbox.getBoundingClientRect();
      posMenu(menu, rect.right + 8, rect.top);
    } else {
      posMenu(menu, ev.clientX, ev.clientY);
    }
  } else {
    posMenu(menu, ev.clientX, ev.clientY);
  }
  syncTextFmtUI();
}

function syncTextFmtUI() {
  const item = (ctxTextType === 'node' || ctxTextType.startsWith('note-')) ? gN(ctxTextId) : gE(ctxTextId);
  if(!item) return;
  
  let s = {};
  if(ctxTextType === 'note-title') s = item.titleStyle || {};
  else if(ctxTextType === 'note-text') s = item.noteStyle || {};
  else s = item.style || {};
  
  // Sync Font Variant
  const fw = s.fontWeight || 'normal';
  const fst = s.fontStyle || 'normal';
  document.getElementById('tf-var-bold').classList.toggle('on', fw === 'bold');
  document.getElementById('tf-var-italic').classList.toggle('on', fst === 'italic');
  
  // Sync Font Size
  let fs = s.fontSize;
  if(!fs) {
    if(ctxTextType === 'note-title') fs = 15;
    else if(ctxTextType === 'note-text') fs = 14;
    else if(ctxTextType === 'node') fs = (gPar(ctxTextId) == null ? 15 : 14);
    else fs = 13;
  }
  const fsIn = document.getElementById('tf-font-size');
  if(fsIn) fsIn.value = fs;
  
  // Sync Alignment
  const ta = s.textAlign || (ctxTextType.startsWith('note-') ? 'left' : 'center');
  document.getElementById('tf-align-left').classList.toggle('on', ta === 'left');
  document.getElementById('tf-align-center').classList.toggle('on', ta === 'center');
  document.getElementById('tf-align-right').classList.toggle('on', ta === 'right');
  
  // Sync Colors
  const list = document.getElementById('tf-colors-list');
  const activeColor = s.color || (ctxTextType.startsWith('note-') ? '#2c2a27' : '');
  if(list) {
    list.innerHTML = '';
    // Use some standard colors for text
    ['#2c2a27','#ffffff','#888888','#ff4757','#2ed573','#1e90ff','#ffa502','#5352ed'].forEach(c => {
      const swatch = document.createElement('div');
      swatch.className = 'bg-swatch' + (activeColor === c ? ' active' : '');
      swatch.style.backgroundColor = c;
      if(c==='#ffffff') swatch.style.border='1px solid #ddd';
      swatch.onclick = () => updateTextStyle('color', c, true);
      list.appendChild(swatch);
    });
  }

  // Sync Defaults Toggles
  const defMap = {
    'node': nodeDefaults.defaultFlags,
    'note-title': noteDefaults.defaultFlags.title,
    'note-text': noteDefaults.defaultFlags.text,
    'edge': (item && item.dash === 'link') ? linkDefaults.defaultFlags : glDefaults.defaultFlags
  };
  const flags = defMap[ctxTextType];
  const tVariant = document.getElementById('tf-def-variant');
  const tSize = document.getElementById('tf-def-size');
  const tAlign = document.getElementById('tf-def-align');
  const tColor = document.getElementById('tf-def-color');
  if (flags) {
    if (tVariant) { tVariant.checked = flags.variant; tVariant.parentElement.style.display = 'flex'; }
    if (tSize) { tSize.checked = flags.size; tSize.parentElement.style.display = 'flex'; }
    if (tAlign) { tAlign.checked = flags.align; tAlign.parentElement.style.display = 'flex'; }
    if (tColor) { tColor.checked = flags.color; tColor.parentElement.style.display = 'flex'; }
  } else {
    // hide for edge or unsupported
    if (tVariant) tVariant.parentElement.style.display = 'none';
    if (tSize) tSize.parentElement.style.display = 'none';
    if (tAlign) tAlign.parentElement.style.display = 'none';
    if (tColor) tColor.parentElement.style.display = 'none';
  }

  // Selection mode UI
  const inSelMode = !!(ctxTextSelection && ctxTextSelection.start !== ctxTextSelection.end);
  const selRow = document.getElementById('tf-sel-mode-row');
  if(selRow) selRow.style.display = inSelMode ? 'flex' : 'none';
  
  const selDefRow = document.getElementById('tf-apply-defaults-sel-row');
  if(selDefRow) selDefRow.style.display = inSelMode ? 'block' : 'none';

  // Strikethrough button: only meaningful in selection mode (whole-node strike not supported by CSS here)
  const strikeBtn = document.getElementById('tf-var-strike');
  if(strikeBtn) strikeBtn.style.display = inSelMode ? 'flex' : 'none';

  // Hide size, align, and color groups when in selection mode
  const grpSize = document.getElementById('tf-group-size');
  const grpAlign = document.getElementById('tf-group-align');
  const grpColor = document.getElementById('tf-group-color');
  if(grpSize) grpSize.style.display = inSelMode ? 'none' : 'block';
  if(grpAlign) grpAlign.style.display = (inSelMode || ctxTextType === 'edge') ? 'none' : 'block';
  if(grpColor) grpColor.style.display = inSelMode ? 'none' : 'block';

  // In selection mode, show Bold/Italic state from Markdown markers in selected text
  if(inSelMode) {
    const { el, start, end } = ctxTextSelection;
    const sel = el.value.substring(start, end);
    // Check if the selection is wrapped in markers (detect outermost)
    const outerBold = el.value.substring(Math.max(0, start-2), start) === '**' &&
                      el.value.substring(end, end+2) === '**';
    const outerItalic = !outerBold &&
                        el.value.substring(Math.max(0, start-1), start) === '*' &&
                        el.value.substring(end, end+1) === '*';
    const outerStrike = el.value.substring(Math.max(0, start-2), start) === '~~' &&
                        el.value.substring(end, end+2) === '~~';
    document.getElementById('tf-var-bold').classList.toggle('on', outerBold);
    document.getElementById('tf-var-italic').classList.toggle('on', outerItalic);
    if(strikeBtn) strikeBtn.classList.toggle('on', outerStrike);
    // Hide whole-node controls that don't apply to selection
    document.getElementById('tf-apply-all-row').style.display = 'none';
    return; // Skip the rest of syncTextFmtUI (whole-node state)
  }

  // Sync Apply to Selected
  const applyRow = document.getElementById('tf-apply-all-row');
  if(applyRow) {
    const canApply = (ctxTextType === 'node');
    applyRow.style.display = canApply ? 'block' : 'none';
    if(canApply) {
      const btn = document.getElementById('tf-apply-all-btn');
      if(btn) {
        if(ctxTextType === 'node') {
          const isSelected = selNSet.has(ctxTextId);
          const sameTypeCount = isSelected ? [...selNSet].filter(id => id !== ctxTextId && gN(id)?.type === item.type).length : 0;
          btn.disabled = sameTypeCount === 0;
        } else {
          btn.disabled = true;
        }
      }
    }
  }
}

function updateTextStyle(key, val, commit=true) {
  const item = (ctxTextType === 'node' || ctxTextType.startsWith('note-')) ? gN(ctxTextId) : gE(ctxTextId);
  if(!item) return;
  
  if(commit) sh();
  
  let targetStyleObj;
  if(ctxTextType === 'note-title') {
    if(!item.titleStyle) item.titleStyle = {};
    targetStyleObj = item.titleStyle;
  } else if(ctxTextType === 'note-text') {
    if(!item.noteStyle) item.noteStyle = {};
    targetStyleObj = item.noteStyle;
  } else {
    if(!item.style) item.style = {};
    targetStyleObj = item.style;
  }
  
  targetStyleObj[key] = val;
  
  // Update live editors
  const applyDOMStyle = (el, k, v) => {
    if(k === 'fontWeight') el.style.fontWeight = v;
    else if(k === 'fontStyle') el.style.fontStyle = v;
    else if(k === 'fontSize') el.style.fontSize = v + 'px';
    else if(k === 'color') el.style.color = v;
    else if(k === 'textAlign') el.style.textAlign = v;
    else if(k === 'fontFamily') el.style.fontFamily = v;
  };

  if(ctxTextType === 'note-title') {
    const el = document.getElementById('ntitle');
    const view = document.getElementById('ntitle-view');
    if(el) applyDOMStyle(el, key, val);
    if(view) applyDOMStyle(view, key, val);
  } else if(ctxTextType === 'note-text') {
    const el = document.getElementById('narea');
    const rend = document.getElementById('nrendered');
    if(el) applyDOMStyle(el, key, val);
    if(rend) applyDOMStyle(rend, key, val);
  } else {
    const ta = document.querySelector('.nedit, .edge-edit');
    if(ta) applyDOMStyle(ta, key, val);
  }
  
  // Update defaults if enabled
  const flagKey = (key === 'fontWeight' || key === 'fontStyle') ? 'variant' : (key === 'fontSize' ? 'size' : (key === 'textAlign' ? 'align' : 'color'));
  const defMap = {
    'node': { style: nodeDefaults.style, flags: nodeDefaults.defaultFlags },
    'note-title': { style: noteDefaults.title, flags: noteDefaults.defaultFlags.title },
    'note-text': { style: noteDefaults.text, flags: noteDefaults.defaultFlags.text },
    'edge': { style: (item && item.dash === 'link') ? linkDefaults.style : glDefaults.style, flags: (item && item.dash === 'link') ? linkDefaults.defaultFlags : glDefaults.defaultFlags }
  };
  const d = defMap[ctxTextType];
  if (d && d.flags[flagKey]) {
    d.flags[flagKey] = false;
    if(commit && typeof saveToLocalStorage === 'function') saveToLocalStorage();
  }
  
  syncTextFmtUI();
  if(ctxTextType !== 'note-title' && ctxTextType !== 'note-text') {
    render();
  }
}

function openNoteTitleFmt(ev) {
  // Capture selection from ntitle before the menu steals focus
  const ntitle = document.getElementById('ntitle');
  const sel = (ntitle && ntitle.selectionStart !== ntitle.selectionEnd)
    ? { el: ntitle, start: ntitle.selectionStart, end: ntitle.selectionEnd }
    : null;
  showTextFmtCtx(ev, 'note-title', noteNodeId, sel);
}
function openNoteTextFmt(ev) {
  const narea = document.getElementById('narea');
  const sel = (narea && narea.selectionStart !== narea.selectionEnd)
    ? { el: narea, start: narea.selectionStart, end: narea.selectionEnd }
    : null;
  showTextFmtCtx(ev, 'note-text', noteNodeId, sel);
}

function toggleTextDefault(flagKey, checked) {
  const item = (ctxTextType === 'node' || ctxTextType.startsWith('note-')) ? gN(ctxTextId) : gE(ctxTextId);
  const defMap = {
    'node': { style: nodeDefaults.style, flags: nodeDefaults.defaultFlags },
    'note-title': { style: noteDefaults.title, flags: noteDefaults.defaultFlags.title },
    'note-text': { style: noteDefaults.text, flags: noteDefaults.defaultFlags.text },
    'edge': { style: (item && item.dash === 'link') ? linkDefaults.style : glDefaults.style, flags: (item && item.dash === 'link') ? linkDefaults.defaultFlags : glDefaults.defaultFlags }
  };
  const d = defMap[ctxTextType];
  if (!d) return;

  d.flags[flagKey] = checked;
  
  if(checked) {
    const item = (ctxTextType === 'node' || ctxTextType.startsWith('note-')) ? gN(ctxTextId) : gE(ctxTextId);
    if(item) {
      let s = {};
      if(ctxTextType === 'note-title') s = item.titleStyle || {};
      else if(ctxTextType === 'note-text') s = item.noteStyle || {};
      else s = item.style || {};
      
      if (flagKey === 'variant') {
        if (s.fontWeight !== undefined) d.style.fontWeight = s.fontWeight;
        if (s.fontStyle !== undefined) d.style.fontStyle = s.fontStyle;
      } else {
        const key = (flagKey === 'size' ? 'fontSize' : (flagKey === 'align' ? 'textAlign' : 'color'));
        if (s[key] !== undefined) d.style[key] = s[key];
      }
    }
  }
  if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
}

function toggleWeight() {
  // Selection mode: wrap with Markdown **
  if(ctxTextSelection && ctxTextSelection.el) {
    wrapSelectionMd(ctxTextSelection.el, '**', '**');
    // Update stored selection after wrap
    ctxTextSelection.start = ctxTextSelection.el.selectionStart;
    ctxTextSelection.end = ctxTextSelection.el.selectionEnd;
    syncTextFmtUI();
    return;
  }
  const item = (ctxTextType === 'node' || ctxTextType.startsWith('note-')) ? gN(ctxTextId) : gE(ctxTextId);
  if(!item) return;
  let s = {};
  if(ctxTextType === 'note-title') s = item.titleStyle || {};
  else if(ctxTextType === 'note-text') s = item.noteStyle || {};
  else s = item.style || {};
  const current = s.fontWeight || 'normal';
  updateTextStyle('fontWeight', current === 'bold' ? 'normal' : 'bold');
}

function toggleFontStyle() {
  // Selection mode: wrap with Markdown *
  if(ctxTextSelection && ctxTextSelection.el) {
    wrapSelectionMd(ctxTextSelection.el, '*', '*');
    ctxTextSelection.start = ctxTextSelection.el.selectionStart;
    ctxTextSelection.end = ctxTextSelection.el.selectionEnd;
    syncTextFmtUI();
    return;
  }
  const item = (ctxTextType === 'node' || ctxTextType.startsWith('note-')) ? gN(ctxTextId) : gE(ctxTextId);
  if(!item) return;
  let s = {};
  if(ctxTextType === 'note-title') s = item.titleStyle || {};
  else if(ctxTextType === 'note-text') s = item.noteStyle || {};
  else s = item.style || {};
  const current = s.fontStyle || 'normal';
  updateTextStyle('fontStyle', current === 'italic' ? 'normal' : 'italic');
}

function toggleStrike() {
  // Only available in selection mode
  if(!ctxTextSelection || !ctxTextSelection.el) return;
  wrapSelectionMd(ctxTextSelection.el, '~~', '~~');
  ctxTextSelection.start = ctxTextSelection.el.selectionStart;
  ctxTextSelection.end = ctxTextSelection.el.selectionEnd;
  syncTextFmtUI();
}

function applyDefaultsToSelection() {
  // Wraps the selected text in Markdown markers based on current defaults
  if(!ctxTextSelection || !ctxTextSelection.el) return;
  const el = ctxTextSelection.el;
  const defStyle = ctxTextType === 'note-title' ? noteDefaults.title
                 : ctxTextType === 'note-text' ? noteDefaults.text
                 : nodeDefaults.style;
  if(!defStyle) return;
  // Apply bold and/or italic as Markdown markers
  if(defStyle.fontWeight === 'bold') {
    wrapSelectionMd(el, '**', '**');
    ctxTextSelection.start = el.selectionStart;
    ctxTextSelection.end = el.selectionEnd;
  }
  if(defStyle.fontStyle === 'italic') {
    wrapSelectionMd(el, '*', '*');
    ctxTextSelection.start = el.selectionStart;
    ctxTextSelection.end = el.selectionEnd;
  }
  syncTextFmtUI();
}

function applyTextStyleToSelected() {
  if(ctxTextType !== 'node') return;
  const primaryId = ctxTextId;
  const primaryNode = gN(primaryId);
  if(!primaryNode) return;
  
  const targets = [...selNSet].filter(id => id !== primaryId)
                             .map(id => gN(id))
                             .filter(n => n && n.type === primaryNode.type);
                             
  if(targets.length === 0) return;
  sh();
  
  const s = primaryNode.style || {};
  targets.forEach(t => {
    if(!t.style) t.style = {};
    if(s.fontFamily) t.style.fontFamily = s.fontFamily;
    if(s.fontWeight) t.style.fontWeight = s.fontWeight;
    if(s.fontStyle) t.style.fontStyle = s.fontStyle;
    if(s.fontSize) t.style.fontSize = s.fontSize;
    if(s.color) t.style.color = s.color;
    if(s.textAlign) t.style.textAlign = s.textAlign;
  });

  
  const btn = document.getElementById('tf-apply-all-btn');
  if(btn) {
    btn.classList.add('apply-btn-flash');
    setTimeout(() => btn.classList.remove('apply-btn-flash'), 600);
  }
  
  render();
}

/* ================================================================
   TEXT FIELD CONTEXT MENU
   ================================================================ */
let activeTextField = null;

function showTextFieldCtx(ev, el) {
  hideAllMenus();
  activeTextField = el;
  const menu = document.getElementById('text-field-ctx');
  if(!menu) return;
  
  menu.style.display = 'flex';
  posMenu(menu, ev.clientX, ev.clientY);
  
  // Capture selection NOW (before anything can clear it)
  const _capturedSel = (el.selectionStart !== el.selectionEnd)
    ? { el, start: el.selectionStart, end: el.selectionEnd }
    : null;

  // Set up formatting submenu trigger
  const fmtBtn = document.getElementById('tfc-fmt');
  if(fmtBtn) {
    fmtBtn.onclick = (e) => {
      e.stopPropagation();
      menu.style.display = 'none';
      // Determine what we are editing to pass to showTextFmtCtx
      if(el.id === 'ntitle') showTextFmtCtx(e, 'note-title', noteNodeId, _capturedSel);
      else if(el.id === 'narea') showTextFmtCtx(e, 'note-text', noteNodeId, _capturedSel);
      else if(el.classList.contains('nedit')) {
        // Node edit
        const sp = el.nextElementSibling;
        if(sp) {
           const ni = sp.parentElement;
           if(ni) {
             const nd = ni.parentElement;
             if(nd && nd.id && nd.id.startsWith('nd')) {
               showTextFmtCtx(e, 'node', parseInt(nd.id.substring(2)), _capturedSel);
             }
           }
        }
      }
      else if(el.classList.contains('edge-edit')) {
        // Edge edit
        const eid = parseInt(el.dataset.eid);
        if(eid) showTextFmtCtx(e, 'edge', eid, _capturedSel);
      }
    };
  }
  
  // Set up standard actions
  const cutBtn = document.getElementById('tfc-cut');
  if(cutBtn) cutBtn.onclick = () => { if(activeTextField) { activeTextField.focus(); document.execCommand('cut'); } menu.style.display='none'; };
  
  const copyBtn = document.getElementById('tfc-copy');
  if(copyBtn) copyBtn.onclick = () => { if(activeTextField) { activeTextField.focus(); document.execCommand('copy'); } menu.style.display='none'; };
  
  const pasteBtn = document.getElementById('tfc-paste');
  if(pasteBtn) pasteBtn.onclick = async () => { 
    if(activeTextField) {
      activeTextField.focus();
      try {
        const text = await navigator.clipboard.readText();
        document.execCommand('insertText', false, text);
      } catch(e) {
        console.error('Paste failed', e);
      }
    } 
    menu.style.display='none'; 
  };
  
  const delBtn = document.getElementById('tfc-del');
  if(delBtn) delBtn.onclick = () => { if(activeTextField) { activeTextField.focus(); document.execCommand('delete'); } menu.style.display='none'; };
  
  const selAllBtn = document.getElementById('tfc-selall');
  if(selAllBtn) selAllBtn.onclick = () => { if(activeTextField) { activeTextField.focus(); activeTextField.select(); } menu.style.display='none'; };
}

// Global init for hiding menus
window.addEventListener('load', () => {
  document.addEventListener('click', (ev) => {
    if(!ev.target.closest('#text-fmt-ctx')) {
      const menu = document.getElementById('text-fmt-ctx');
      if(menu) menu.style.display = 'none';
    }
    if(!ev.target.closest('#text-field-ctx')) {
      const menu = document.getElementById('text-field-ctx');
      if(menu) menu.style.display = 'none';
    }
  });
});

function updateBgColor(c, commit=true){
  const primaryId = activeBgGroupId;
  const isGroup = !!primaryId;
  const isSelected = isGroup && selNSet.has(primaryId);

  const targets = isSelected
    ? [...selNSet].map(id => gN(id)).filter(n => n && n.type === 'group').map(n => n.bg)
    : [isGroup ? gN(primaryId).bg : bgSettings];

  if(commit) sh();
  
  targets.forEach(target => {
    if(isGroup && activeGroupColorTarget === 'title') {
      target.titleColor = c;
    } else {
      if(target.pattern !== 'paper') target.lastColor = c;
      target.color = c;
    }
  });

  if(isGroup) render(); else applyBg();
  renderCanvCtx();
}

function updateBgColorManual(c){
  const primaryId = activeBgGroupId;
  const isGroup = !!primaryId;
  const isSelected = isGroup && selNSet.has(primaryId);

  const targets = isSelected
    ? [...selNSet].map(id => gN(id)).filter(n => n && n.type === 'group').map(n => n.bg)
    : [isGroup ? gN(primaryId).bg : bgSettings];

  sh();
  
  targets.forEach(target => {
    if(target.color !== c){
      target.recentColors = [c, ...(target.recentColors||[]).filter(x=>x!==c)].slice(0,5);
    }
    if(isGroup && activeGroupColorTarget === 'title') {
      target.titleColor = c;
    } else {
      if(target.pattern !== 'paper') target.lastColor = c;
      target.color = c;
    }
  });

  if(isGroup) render(); else applyBg();
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
    if((target.imgOpacity || 0) === 0) target.imgOpacity = 0.1;
    if(activeBgGroupId) render(); else applyBg();
    renderCanvCtx();
  } else {
    updateBg('imgEnabled', false);
  }
}

function handleBgFile(input){
  const file=input.files[0];if(!file)return;
  if(window.storageAPI && window.storageAPI.dirHandle) {
    window.storageAPI.saveImageFile(file, file.name || `image_${Date.now()}`);
  }
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

// ================================================================
// IMAGE CATALOG
// ================================================================
let selectedImgCatItemNames = new Set();
let allImgCatItems = [];

// isMapBgMode: true when opened from map-bg root selector
async function openImgCatalog(isMapBgMode) {
  document.getElementById('imgcat-overlay')._isMapBgMode = !!isMapBgMode;
  document.getElementById('imgcat-overlay').style.display = 'flex';
  // Title update
  const titleEl = document.getElementById('imgcat-title');
  if (titleEl) titleEl.textContent = isMapBgMode ? '🗺️ Выбор фона карты' : '🖼️ Каталог фонов';
  await renderImgCatalog();
}

function closeImgCatalog() {
  document.getElementById('imgcat-overlay').style.display = 'none';
}

async function renderImgCatalog() {
  const grid = document.getElementById('imgcat-grid');
  grid.innerHTML = '<div style="width:100%;text-align:center;color:var(--mu);padding:40px;">Загрузка...</div>';
  selectedImgCatItemNames.clear();
  document.getElementById('imgcat-select-all').checked = false;
  document.getElementById('imgcat-delete-btn').style.display = 'none';

  if (!window.storageAPI || !window.storageAPI.dirHandle) {
    grid.innerHTML = '<div class="cat-empty">Каталог изображений работает только при выбранной рабочей папке.</div>';
    return;
  }
  
  const files = await window.storageAPI.listImageFiles();
  allImgCatItems = files;
  
  if (files.length === 0) {
    grid.innerHTML = '<div class="cat-empty">В каталоге пока нет изображений. Нажмите "Добавить из файла", чтобы они появились здесь.</div>';
    return;
  }
  
  grid.innerHTML = '';
  for (let item of files) {
    let url;
    try { url = URL.createObjectURL(item.file); } catch(e) { continue; }
    
    const card = document.createElement('div');
    card.className = 'cat-card'; 
    card.style.position = 'relative';
    card.ondblclick = () => _imgCatApply(item.file);
    
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.position = 'absolute';
    cb.style.top = '10px'; cb.style.left = '10px';
    cb.style.width = '18px'; cb.style.height = '18px';
    cb.style.cursor = 'pointer'; cb.style.zIndex = '10';
    cb.onchange = (e) => {
      e.stopPropagation();
      if (cb.checked) selectedImgCatItemNames.add(item.name);
      else selectedImgCatItemNames.delete(item.name);
      updateImgCatActions();
    };
    
    const thumb = document.createElement('img');
    thumb.className = 'cat-thumb';
    thumb.src = url;
    thumb.style.height = '140px';
    thumb.onload = () => URL.revokeObjectURL(url);
    
    const info = document.createElement('div');
    info.className = 'cat-info';
    info.innerHTML = `<div class="cat-label" title="${item.name}">${item.name}</div>`;
    
    card.appendChild(cb);
    card.appendChild(thumb);
    card.appendChild(info);
    grid.appendChild(card);
  }
}

function updateImgCatActions() {
  document.getElementById('imgcat-delete-btn').style.display = selectedImgCatItemNames.size > 0 ? 'block' : 'none';
  document.getElementById('imgcat-select-all').checked = selectedImgCatItemNames.size === allImgCatItems.length && allImgCatItems.length > 0;
}

function toggleAllImgCat(checked) {
  const cbs = document.querySelectorAll('#imgcat-grid input[type="checkbox"]');
  if (checked) {
    allImgCatItems.forEach(i => selectedImgCatItemNames.add(i.name));
    cbs.forEach(cb => cb.checked = true);
  } else {
    selectedImgCatItemNames.clear();
    cbs.forEach(cb => cb.checked = false);
  }
  updateImgCatActions();
}

async function deleteSelectedImgCat() {
  if (selectedImgCatItemNames.size === 0) return;
  if (!confirm('Удалить выбранные изображения?')) return;
  
  for (let name of selectedImgCatItemNames) {
    await window.storageAPI.deleteImageFile(name);
  }
  
  await renderImgCatalog();
}

// Internal router: routes apply to canvas bg or map bg based on catalog mode
function _imgCatApply(file) {
  const isMapBgMode = document.getElementById('imgcat-overlay')._isMapBgMode;
  if (isMapBgMode && typeof applyImgCatBgToRoot === 'function') {
    applyImgCatBgToRoot(file);
  } else {
    applyImgCatBg(file);
  }
}

// Handle "Add from file" button inside catalog (saves to FS and applies)
async function handleImgCatFileInput(input) {
  const file = input.files[0]; if (!file) return;
  // Save to FS images folder
  if (window.storageAPI && window.storageAPI.dirHandle) {
    await window.storageAPI.saveImageFile(file, file.name || `image_${Date.now()}`);
  }
  _imgCatApply(file);
  // Refresh catalog grid
  await renderImgCatalog();
  // Reset input so same file can be picked again
  input.value = '';
}

function applyImgCatBg(file) {
  const reader = new FileReader();
  reader.onload = e => {
    sh();
    const target = activeBgGroupId ? gN(activeBgGroupId).bg : bgSettings;
    target.image = e.target.result;
    target.imgEnabled = true;
    if(target.pattern === 'paper') {
      target.pattern = 'none';
      target.color = target.lastColor;
    } else if(target.pattern === 'rough') {
      target.pattern = 'none';
    }
    closeImgCatalog();
    if(activeBgGroupId) render(); else applyBg();
    renderCanvCtx();
  };
  reader.readAsDataURL(file);
}

function renderCanvCtx(){
  let target;
  if(activeBgGroupId) {
    const g = gN(activeBgGroupId);
    if(g && !g.bg) g.bg = JSON.parse(JSON.stringify(groupDefaults.bg));
    target = g ? g.bg : bgSettings;
  } else {
    target = bgSettings;
  }

  const isPaper = target.pattern === 'paper';
  const isRough = target.pattern === 'rough';
  const isSpecial = isPaper || isRough;

  // Group vs Canvas UI
  const isGroup = !!activeBgGroupId;
  document.getElementById('bg-target-row').style.display = isGroup ? 'flex' : 'none';
  document.getElementById('bg-pin-color').style.display = isGroup ? 'flex' : 'none';
  document.getElementById('bg-pin-pattern').style.display = isGroup ? 'flex' : 'none';
  document.getElementById('bg-pin-image').style.display = isGroup ? 'flex' : 'none';
  document.getElementById('bg-opacity-row').style.display = isGroup ? 'flex' : 'none';
  document.getElementById('bg-pat-group').style.display = isGroup ? 'none' : 'block';

  // Mode switcher (canvas/map) only available for canvas, not group bg
  const modeSwitcherRow = document.getElementById('bg-img-group');
  if (modeSwitcherRow) {
    const switcherDiv = modeSwitcherRow.querySelector('[id="cbg-mode-canvas"]');
    const switcherParent = switcherDiv ? switcherDiv.parentElement : null;
    if (switcherParent) switcherParent.style.display = isGroup ? 'none' : 'flex';
  }
  // Canvas-bg panel: always show for both group and canvas bg
  const canvasBgPanel = document.getElementById('bg-img-group-canvas');
  const mapBgPanel = document.getElementById('bg-img-group-map');
  if (isGroup) {
    // For groups: only show canvas panel (no map bg for groups)
    if (canvasBgPanel) canvasBgPanel.style.display = '';
    if (mapBgPanel) mapBgPanel.style.display = 'none';
    // Reset mode to canvas when switching to group
    if (typeof canvasBgMode !== 'undefined') {
      canvasBgMode = 'canvas';
      const btnC = document.getElementById('cbg-mode-canvas');
      const btnM = document.getElementById('cbg-mode-map');
      if (btnC) btnC.classList.add('on');
      if (btnM) btnM.classList.remove('on');
    }
  }
  // When in map mode for canvas: sync map-bg UI
  if (!isGroup && typeof canvasBgMode !== 'undefined' && canvasBgMode === 'map') {
    if (typeof syncMapBgUI === 'function') syncMapBgUI();
  }


  document.getElementById('bg-pat-rough').style.display = isGroup ? 'none' : 'flex';
  document.getElementById('bg-pat-paper').style.display = isGroup ? 'none' : 'flex';

  // Colors
  const colGroup = document.getElementById('bg-col-group');
  if(isPaper) colGroup.classList.add('bg-inactive'); else colGroup.classList.remove('bg-inactive');
  
  const list=document.getElementById('bg-colors-list');list.innerHTML='';
  BG_COLS.forEach(c=>{
    const currentColor = (isGroup && activeGroupColorTarget === 'title') ? (target.titleColor || '#2c2a27') : target.color;
    const s=document.createElement('div');s.className='bg-swatch' + (currentColor===c?' active':'');
    s.style.backgroundColor=c;
    s.onclick=()=>updateBgColor(c);list.appendChild(s);
  });
  
  const rec=document.getElementById('bg-recent-list');rec.innerHTML='';
  (target.recentColors||[]).forEach(c=>{
    const s=document.createElement('div');s.className='bg-swatch';s.style.backgroundColor=c;
    s.onclick=()=>updateBgColorManual(c);rec.appendChild(s);
  });

  // Sliders for group
  if(isGroup) {
    const val = activeGroupColorTarget === 'title' ? (target.titleOpacity ?? 0.95) : (target.opacity ?? 0.1);
    document.getElementById('bg-opacity').value = val;
  }


  // Pins sync (optional: could highlight active pin if they match defaults)
  const d = groupDefaults.bg;
  if(isGroup) {
    document.getElementById('bg-pin-color').classList.toggle('active', target.color === d.color && (target.titleColor||'#2c2a27') === d.titleColor);
    document.getElementById('bg-pin-pattern').classList.toggle('active', target.pattern === d.pattern && target.patScale === d.patScale);
    document.getElementById('bg-pin-image').classList.toggle('active', target.imgEnabled === d.imgEnabled);
  }

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

  // Image (canvas bg)
  const imgSwitch = document.getElementById('bg-img-switch');
  if (imgSwitch) imgSwitch.checked = target.imgEnabled;

  const imgSliders = document.getElementById('img-sliders');
  if (imgSliders) {
    if(!target.imgEnabled) imgSliders.classList.add('bg-inactive'); else imgSliders.classList.remove('bg-inactive');
  }

  const imgOpEl = document.getElementById('bg-img-opacity');
  const imgBlurEl = document.getElementById('bg-img-blur');
  if (imgOpEl) imgOpEl.value = target.imgOpacity;
  if (imgBlurEl) imgBlurEl.value = target.imgBlur;

  // Apply to Selected button row visibility and button state
  const bgApplyRow = document.getElementById('bg-apply-all-row');
  if(bgApplyRow) {
    const isGroupCtx = !!activeBgGroupId;
    bgApplyRow.style.display = isGroupCtx ? 'block' : 'none';
    if(isGroupCtx) {
      const btn = document.getElementById('bg-apply-all-btn');
      if(btn) {
        const isSelected = selNSet.has(activeBgGroupId);
        const sameTypeCount = isSelected ? [...selNSet].filter(oid => oid !== activeBgGroupId && gN(oid)?.type === 'group').length : 0;
        btn.disabled = sameTypeCount === 0;
      }
    }
  }
}

function applyBgStyleToSelection() {
  const primaryId = activeBgGroupId;
  if(!primaryId) return;
  const primaryNode = gN(primaryId);
  if(!primaryNode) return;
  
  const targets = [...selNSet].filter(id => id !== primaryId)
                             .map(id => gN(id))
                             .filter(n => n && n.type === 'group');
                             
  if(targets.length === 0) return;
  sh();
  
  // Visual feedback
  const btn = document.getElementById('bg-apply-all-btn');
  if(btn) {
    btn.classList.add('apply-btn-flash');
    setTimeout(() => btn.classList.remove('apply-btn-flash'), 700);
  }

  targets.forEach(n => {
    n.bg = JSON.parse(JSON.stringify(primaryNode.bg || groupDefaults.bg));
  });
  render();
  toast('Стили фона применены к ' + targets.length + ' группам');
}

function showCanvCtx(cx,cy) {
  hideAllMenus();
  canvCtx.style.display='block';
  posMenu(canvCtx, cx, cy);
  canvCtx._cx=cx;canvCtx._cy=cy;
  
  const mapRootId = typeof getMapBgAtScreen === 'function' ? getMapBgAtScreen(cx, cy) : null;
  if (mapRootId !== null) {
    if (typeof setCanvasBgMode === 'function') setCanvasBgMode('map', true, mapRootId);
  } else {
    if (typeof setCanvasBgMode === 'function') setCanvasBgMode('canvas', true);
  }

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
  const expSub = document.getElementById('export-sub');
  if(expSub) expSub.classList.remove('open');
  document.getElementById('n-burger-menu').classList.remove('show');
  hideCanvDblMenu();
  closeLp();
  // close settings modal if open
  const smod=document.getElementById('smod');
  if(smod) smod.style.display='none';
}

