/* ================================================================
   LINE PANEL
================================================================ */
function showLpAt(cx,cy,eid){
  hideAllMenus();
  const e=gE(eid);if(!e)return;lpPanel.style.display='flex';
  lpPanel.style.left=Math.min(cx,window.innerWidth-235)+'px';
  lpPanel.style.top=Math.min(cy+14,window.innerHeight-260)+'px';
  document.getElementById('lp-plus-sub').style.display='none';
  syncLP(e);
}
function togglePlusSub(e){
  e.stopPropagation();
  const sub=document.getElementById('lp-plus-sub');
  sub.style.display=sub.style.display==='block'?'none':'block';
}
function syncLP(e){
  const isLink = e.dash === 'link' || e.isLink;
  document.getElementById('ep-purpose-main')?.classList.toggle('on', !isLink);
  document.getElementById('ep-purpose-link')?.classList.toggle('on', isLink);

  ['straight','bezier','elbow'].forEach(s=>document.getElementById('ep-'+s)?.classList.toggle('on',(e.shape||gls)===s));
  const dashVal = e.dash === 'link' ? 'dashed' : (e.dash || 'solid');
  ['solid','dashed','dotted'].forEach(s=>document.getElementById('ep-'+s)?.classList.toggle('on',dashVal===s));
  [['w1',1],['w15',1.5],['w3',3]].forEach(([id,v])=>document.getElementById('ep-'+id)?.classList.toggle('on',(e.width||1.5)===v));
  ['forward','backward','both','none'].forEach(d=>document.getElementById('ep-dir-'+d)?.classList.toggle('on',(e.dir||'forward')===d));
  document.getElementById('ep-clr').querySelectorAll('.cdot').forEach(d=>d.classList.toggle('on',d.dataset.c===(e.color||LCOLS[0])));
  
  // Hide branch-color button for links
  const bbtn=document.getElementById('lp-branch-btn');
  if(bbtn) bbtn.style.display=(e.dash==='link'||e.isLink)?'none':'flex';

  syncPinBtns();
  // Reset branch button when switching to a different edge
  updateBranchBtn(null);
}
function syncPinBtns(){
  const e=gE(selE);
  document.getElementById('pin-shape')?.classList.toggle('active',e&&(e.shape||gls)===glDefaults.shape);
  const d=e&&(e.isLink?linkDefaults:glDefaults);
  document.getElementById('pin-shape')?.classList.toggle('active',e&&(e.shape||(e.isLink?linkDefaults:glDefaults).shape)===d.shape);
  document.getElementById('pin-dash')?.classList.toggle('active',e&&(e.dash||(e.isLink?linkDefaults:glDefaults).dash)===d.dash);
  document.getElementById('pin-width')?.classList.toggle('active',e&&(e.width||(e.isLink?linkDefaults:glDefaults).width)===d.width);
  document.getElementById('pin-dir')?.classList.toggle('active',e&&(e.dir||(e.isLink?linkDefaults:glDefaults).dir)===d.dir);
  document.getElementById('pin-color')?.classList.toggle('active',e&&(e.color||(e.isLink?linkDefaults:glDefaults).color)===d.color);
}
function closeLp(){lpPanel.style.display='none'}
function setEP(prop,val,btn){
  const e=gE(selE);if(!e)return;sh();
  if(prop==='purpose'){
    if(val==='link'){
      e.isLink=true; e.dash='link'; e.width=1; e.dir='none';
    } else {
      e.isLink=false; e.dash='solid'; e.width=1.5; e.dir='forward';
    }
    syncLP(e);
  }
  else if(prop==='shape'){e.shape=val;e.cp1x=null;e.cp1y=null;e.cp2x=null;e.cp2y=null}
  else if(prop==='dash')e.dash=val;else if(prop==='width')e.width=val;else if(prop==='dir')e.dir=val;
  btn.closest('.lpr2').querySelectorAll('.lpb2').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  syncPinBtns();render();
}
function setDefault(prop){
  const e=gE(selE);if(!e)return;
  const d=(e.isLink?linkDefaults:glDefaults);
  if(prop==='shape')d.shape=e.shape||(e.isLink?linkDefaults:glDefaults).shape;
  else if(prop==='dash')d.dash=e.dash||(e.isLink?linkDefaults:glDefaults).dash;
  else if(prop==='width')d.width=e.width||(e.isLink?linkDefaults:glDefaults).width;
  else if(prop==='dir')d.dir=e.dir||(e.isLink?linkDefaults:glDefaults).dir;
  else if(prop==='color')d.color=e.color||(e.isLink?linkDefaults:glDefaults).color;
  toast('Настройка сохранена как «По умолчанию»');
  syncPinBtns();
}
function deleteSelectedEdge(){
  const e=gE(selE);if(!e)return;
  sh();
  // Remove only the edge; the child node keeps its properties (stays non-root visually)
  edges=edges.filter(x=>x.id!==e.id);
  selE=null;closeLp();
  // Update branch button state
  updateBranchBtn(null);
  render();
}
function updateBranchBtn(clr){
  const btn=document.getElementById('lp-branch-btn');if(!btn)return;
  if(clr&&clr!==LCOLS[0]){
    btn.style.background=clr;btn.style.borderColor=clr;
    btn.style.color=getContrastColor(clr);
  } else {
    btn.style.background='';btn.style.borderColor='';btn.style.color='';
  }
}
function insertObjectOnEdge(edgeId, type='node'){
  const e=gE(edgeId);if(!e)return;
  const mid=edgePt(e,0.5);
  sh();
  const newNodeId=mkNode(mid.x,mid.y,'',null,false,type);
  // Rewire
  const toId=e.to;
  e.to=newNodeId;
  // Second half inheriting all properties
  const e2=mkEdge(newNodeId,toId,e.dash==='link'||e.isLink);
  e2.color=e.color; e2.width=e.width; e2.shape=e.shape; e2.dir=e.dir; e2.dash=e.dash;
  edges.push(e2);
  render();
  setTimeout(()=>editNode(newNodeId,true),50);
}
function applyColorToBranch(){
  const e=gE(selE);if(!e)return;
  const clr=e.color||LCOLS[0];
  sh();
  e.color=clr;
  function colorDown(id){
    edges.filter(x=>x.from===id && x.dash!=='link').forEach(x=>{
      x.color=clr; colorDown(x.to);
    });
  }
  colorDown(e.to);
  updateBranchBtn(clr);
  toast('Цвет применён к ветке');render();
}

// color dots desktop
const epClrC=document.getElementById('ep-clr');
LCOLS.forEach(c=>{
  const d=document.createElement('div');d.className='cdot';d.style.background=c;d.dataset.c=c;
  d.onclick=()=>{const e=gE(selE);if(!e)return;sh();e.color=c;epClrC.querySelectorAll('.cdot').forEach(x=>x.classList.remove('on'));d.classList.add('on');render()};
  epClrC.appendChild(d);
});

/* mobile line sheet */
const lsOv=document.getElementById('ls-ov');const lsSht=document.getElementById('ls-sht');
const lclrM=document.getElementById('lclr-m');
LCOLS.forEach(c=>{
  const d=document.createElement('div');d.className='cdot';d.style.background=c;d.dataset.c=c;
  d.onclick=()=>{const e=gE(selE);if(!e)return;sh();e.color=c;
    const def=(e.dash==='link'||e.isLink)?linkDefaults:glDefaults;def.color=c;
    lclrM.querySelectorAll('.cdot').forEach(x=>x.classList.remove('on'));d.classList.add('on');render()};
  lclrM.appendChild(d);
});

function showLSheet(){
  const e=gE(selE);const sec=document.getElementById('ls-edge-sec');sec.style.display=e?'block':'none';
  const dashVal = e.dash === 'link' ? 'dashed' : (e.dash || 'solid');
  if(e){
    ['straight','bezier','elbow'].forEach(s=>document.getElementById('esm-'+s)?.classList.toggle('on',(e.shape||gls)===s));
    ['solid','dashed','dotted'].forEach(s=>document.getElementById('edm-'+s)?.classList.toggle('on',dashVal===s));
    [['1',1],['15',1.5],['3',3]].forEach(([id,v])=>document.getElementById('ewm-'+id)?.classList.toggle('on',(e.width||1.5)===v));
    ['forward','backward','both','none'].forEach(d=>document.getElementById('edirm-'+d)?.classList.toggle('on',(e.dir||'forward')===d));
    lclrM.querySelectorAll('.cdot').forEach(d=>d.classList.toggle('on',d.dataset.c===(e.color||LCOLS[0])));
  }
  lsOv.style.display='block';requestAnimationFrame(()=>{lsOv.classList.add('show');lsSht.classList.add('show')});
}
function closeLSheet(){lsOv.classList.remove('show');lsSht.classList.remove('show');setTimeout(()=>{if(!lsSht.classList.contains('show'))lsOv.style.display='none'},300)}

function setGLSM(s,btn){gls=s;document.querySelectorAll('[id^=gsm-]').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
function setGLDM(s,btn){gld=s;document.querySelectorAll('[id^=gdm-]').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
function setEPM(prop,val,btn,pfx){const e=gE(selE);if(!e)return;sh();
  if(prop==='shape'){e.shape=val;e.cp1x=null;e.cp1y=null;e.cp2x=null;e.cp2y=null}
  else if(prop==='dash')e.dash=val;
  else if(prop==='width')e.width=val;
  else if(prop==='dir')e.dir=val;
  // Use correct defaults
  const d=(e.dash==='link'||e.isLink)?linkDefaults:glDefaults;
  if(prop==='shape')d.shape=val;
  else if(prop==='dash')d.dash=val;
  else if(prop==='width')d.width=val;
  else if(prop==='dir')d.dir=val;
  saveToLocalStorage();
  render();
  document.querySelectorAll('[id^='+pfx+'-]').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
}

/* ================================================================
   CENTER BUTTON (short = last node, long = root)
================================================================ */
let centerHold=null;
function toggleStealth() {
  stealthActive = !stealthActive;
  document.body.classList.toggle('stealth-active', stealthActive);
  const sw = document.getElementById('stealth-switch');
  if (sw) sw.checked = stealthActive;
  if (stealthActive) {
    showUI();
  } else {
    document.body.classList.remove('ui-visible');
    if (stealthTimer) clearTimeout(stealthTimer);
  }
}

function toggleSettings() {
  const smod = document.getElementById('smod');
  const isShow = smod.style.display === 'flex';
  smod.style.display = isShow ? 'none' : 'flex';
  if (!isShow) {
    ['node','note','group'].forEach(t => {
      const main = document.getElementById(`snap-${t}`);
      const adap = document.getElementById(`snap-${t}-adaptive`);
      const row = document.getElementById(`snap-${t}-adaptive-row`);
      if(main) main.checked = !!snapSettings[t];
      if(adap) adap.checked = !!snapSettings[t + 'Adaptive'];
      if(row) {
        row.style.opacity = snapSettings[t] ? '1' : '0.4';
        row.style.pointerEvents = snapSettings[t] ? 'auto' : 'none';
      }
    });
  }
}

function updateSnap(type, val) {
  snapSettings[type] = val;
  const row = document.getElementById(`snap-${type}-adaptive-row`);
  const input = document.getElementById(`snap-${type}-adaptive`);
  if(row && input) {
    row.style.opacity = val ? '1' : '0.4';
    row.style.pointerEvents = val ? 'auto' : 'none';
  }
  render();
  saveToLocalStorage();
}

function updateSnapAdaptive(type, val) {
  snapSettings[type + 'Adaptive'] = val;
  render();
  saveToLocalStorage();
}

function showUI() {
  if (!stealthActive) return;
  document.body.classList.add('ui-visible');
  if (stealthTimer) clearTimeout(stealthTimer);
  stealthTimer = setTimeout(() => {
    document.body.classList.remove('ui-visible');
  }, 5000);
}

function handleCenterClick() {
  const now = Date.now();
  if (now - lastCenterClick < 350) {
    // double click: center on last used map root, or any root if null
    let targetRootId = lastUsedMapRootId;
    if (!targetRootId) {
      const rootNode = nodes.find(n => n.type === 'root');
      if (rootNode) targetRootId = rootNode.id;
    }
    if (targetRootId) {
      selNode(targetRootId);
      centerOnNode(targetRootId);
    }
    lastCenterClick = 0;
  } else {
    lastCenterClick = now;
    setTimeout(() => {
      if (lastCenterClick === now) {
        // single click: center on last active node
        if (lastActiveNodeId) {
          selNode(lastActiveNodeId);
          centerOnNode(lastActiveNodeId);
        } else if (nodes.length > 0) {
          const rootNode = nodes.find(n=>n.type==='root');
          selNode(rootNode.id);
          centerOnNode(rootNode.id);
        }
      }
    }, 350);
  }
}

function centerOnNode(id){
  const rootNode = nodes.find(n=>n.type==='root');
  const targetId = id || lastActiveNodeId || (rootNode && rootNode.id);
  if(!targetId) return;
  const n=gN(targetId);if(!n)return;
  zoom=1;panX=wrap.clientWidth/2-n.x;panY=wrap.clientHeight/2-n.y;applyT();renderMinimap();
}
function centerOnRoot(){
  const r=nodes.find(n=>n.type==='root');if(!r)return;
  zoom=1;panX=wrap.clientWidth/2-r.x;panY=wrap.clientHeight/2-r.y;applyT();renderMinimap();toast('По главному узлу');
}
function resetView(){centerOnRoot()}

