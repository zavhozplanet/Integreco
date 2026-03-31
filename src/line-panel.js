/* ================================================================
   LINE PANEL
================================================================ */
function showLpAt(cx,cy,eid){
  hideAllMenus();
  const e=gE(eid);if(!e)return;lpPanel.style.display='flex';
  lpPanel.style.left=Math.min(cx,window.innerWidth-235)+'px';
  lpPanel.style.top=Math.min(cy+14,window.innerHeight-260)+'px';
  syncLP(e);
}
function syncLP(e){
  ['straight','bezier','elbow'].forEach(s=>document.getElementById('ep-'+s)?.classList.toggle('on',(e.shape||gls)===s));
  ['solid','dashed','dotted'].forEach(s=>document.getElementById('ep-'+s)?.classList.toggle('on',(e.dash==='link'?'solid':(e.dash||gld))===s));
  [['w1',1],['w15',1.5],['w3',3]].forEach(([id,v])=>document.getElementById('ep-'+id)?.classList.toggle('on',(e.width||1.5)===v));
  ['forward','backward','both','none'].forEach(d=>document.getElementById('ep-dir-'+d)?.classList.toggle('on',(e.dir||'forward')===d));
  document.getElementById('ep-clr').querySelectorAll('.cdot').forEach(d=>d.classList.toggle('on',d.dataset.c===(e.color||LCOLS[0])));
  syncPinBtns();
  // Reset branch button when switching to a different edge
  updateBranchBtn(null);
}
function syncPinBtns(){
  const e=gE(selE);
  document.getElementById('pin-shape')?.classList.toggle('active',e&&(e.shape||gls)===glDefaults.shape);
  document.getElementById('pin-dash')?.classList.toggle('active',e&&(e.dash||gld)===glDefaults.dash);
  document.getElementById('pin-width')?.classList.toggle('active',e&&(e.width||1.5)===glDefaults.width);
  document.getElementById('pin-dir')?.classList.toggle('active',e&&(e.dir||'forward')===glDefaults.dir);
  document.getElementById('pin-color')?.classList.toggle('active',e&&(e.color||LCOLS[0])===(glDefaults.color||LCOLS[0]));
}
function closeLp(){lpPanel.style.display='none'}
function setEP(prop,val,btn){
  const e=gE(selE);if(!e)return;sh();
  if(prop==='shape'){e.shape=val;e.cp1x=null;e.cp1y=null;e.cp2x=null;e.cp2y=null}
  else if(prop==='dash')e.dash=val;else if(prop==='width')e.width=val;else if(prop==='dir')e.dir=val;
  btn.closest('.lpr2').querySelectorAll('.lpb2').forEach(b=>b.classList.remove('on'));btn.classList.add('on');
  syncPinBtns();render();
}
function setDefault(prop){
  const e=gE(selE);if(!e)return;
  if(prop==='shape'){glDefaults.shape=e.shape||gls;gls=glDefaults.shape}
  else if(prop==='dash'){glDefaults.dash=e.dash||gld;gld=glDefaults.dash}
  else if(prop==='width')glDefaults.width=e.width||1.5;
  else if(prop==='dir')glDefaults.dir=e.dir||'forward';
  else if(prop==='color')glDefaults.color=e.color||LCOLS[0];
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
    // Auto-contrast: if color is dark, use white icon
    const r=parseInt(clr.slice(1,3),16)||0,g=parseInt(clr.slice(3,5),16)||0,b=parseInt(clr.slice(5,7),16)||0;
    const lum=(r*0.299+g*0.587+b*0.114)/255;
    btn.style.color=lum<0.5?'#fff':'#222';
  } else {
    btn.style.background='';btn.style.borderColor='';btn.style.color='';
  }
}
function applyColorToBranch(){
  const e=gE(selE);if(!e)return;
  const clr=e.color||LCOLS[0];
  sh();
  e.color=clr;
  function colorDown(id){
    edges.filter(x=>x.from===id).forEach(x=>{x.color=clr;colorDown(x.to)});
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
  d.onclick=()=>{const e=gE(selE);if(!e)return;sh();e.color=c;lclrM.querySelectorAll('.cdot').forEach(x=>x.classList.remove('on'));d.classList.add('on');render()};
  lclrM.appendChild(d);
});

function showLSheet(){
  const e=gE(selE);const sec=document.getElementById('ls-edge-sec');sec.style.display=e?'block':'none';
  if(e){
    ['straight','bezier','elbow'].forEach(s=>document.getElementById('esm-'+s)?.classList.toggle('on',(e.shape||gls)===s));
    ['solid','dashed','dotted'].forEach(s=>document.getElementById('edm-'+s)?.classList.toggle('on',(e.dash==='link'?'solid':(e.dash||gld))===s));
    [['1',1],['15',1.5],['3',3]].forEach(([id,v])=>document.getElementById('ewm-'+id)?.classList.toggle('on',(e.width||1.5)===v));
    ['forward','backward','both','none'].forEach(d=>document.getElementById('edirm-'+d)?.classList.toggle('on',(e.dir||'forward')===d));
    lclrM.querySelectorAll('.cdot').forEach(d=>d.classList.toggle('on',d.dataset.c===(e.color||LCOLS[0])));
  }
  lsOv.style.display='block';requestAnimationFrame(()=>{lsOv.classList.add('show');lsSht.classList.add('show')});
}
function closeLSheet(){lsOv.classList.remove('show');lsSht.classList.remove('show');setTimeout(()=>{if(!lsSht.classList.contains('show'))lsOv.style.display='none'},300)}

function setGLSM(s,btn){gls=s;document.querySelectorAll('[id^=gsm-]').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
function setGLDM(s,btn){gld=s;document.querySelectorAll('[id^=gdm-]').forEach(b=>b.classList.remove('on'));btn.classList.add('on')}
function setEPM(prop,val,btn,pfx){const e=gE(selE);if(!e)return;sh();if(prop==='shape'){e.shape=val;e.cp1x=null;e.cp1y=null;e.cp2x=null;e.cp2y=null}else if(prop==='dash')e.dash=val;else if(prop==='width')e.width=val;else if(prop==='dir')e.dir=val;document.querySelectorAll('[id^='+pfx+'-]').forEach(b=>b.classList.remove('on'));btn.classList.add('on');render()}

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
    document.getElementById('snap-node').checked = snapSettings.node;
    document.getElementById('snap-note').checked = snapSettings.note;
    document.getElementById('snap-group').checked = snapSettings.group;
  }
}

function updateSnap(type, val) {
  snapSettings[type] = val;
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
    // double click: center on last used map root
    if (lastUsedMapRootId) {
      selNode(lastUsedMapRootId);
      centerOnNode(lastUsedMapRootId);
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
    }, 360);
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

