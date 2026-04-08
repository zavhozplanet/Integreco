/* ================================================================
   PLUS-BUTTON DRAG (desktop: drag from plus to create/link)
================================================================ */
let plusDrag={active:false};

function startPlusDrag(ev,nodeId,dir,btnEl,dirHint){
  ev.stopPropagation();
  plusDrag={active:true,nodeId,dir,dirHint:dirHint||dir,btnEl,startX:ev.clientX,startY:ev.clientY,moved:false,targeting:null};
}

function updatePlusDrag(ev){
  if(!plusDrag.active)return;
  const dx=ev.clientX-plusDrag.startX,dy=ev.clientY-plusDrag.startY;
  if(!plusDrag.moved&&(Math.abs(dx)>8||Math.abs(dy)>8))plusDrag.moved=true;
  if(plusDrag.moved){
    const n=gN(plusDrag.nodeId);
    const rc=wrap.getBoundingClientRect();
    const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
    
    let sx = n.x, sy = n.y;
    if(n.type === 'group' || n.type === 'multi') {
      const snap = getSnapPoint(n, {x: p.x, y: p.y}, null, 'from');
      sx = snap.x; sy = snap.y;
    }
    glLink.style.display='block';
    ghHd.style.display='block';
    glLink.setAttribute('x1',sx);glLink.setAttribute('y1',sy);
    
    const tgtId=findNodeAt(ev.clientX-rc.left,ev.clientY-rc.top,plusDrag.nodeId);
    let ex = p.x, ey = p.y;
    if(tgtId) {
      const tgtN = gN(tgtId);
      if(tgtN.type === 'group' || tgtN.type === 'multi') {
        const snap = getSnapPoint(tgtN, {x: sx, y: sy}, null, 'to');
        ex = snap.x; ey = snap.y;
      } else {
        ex = tgtN.x; ey = tgtN.y;
      }
    }
    glLink.setAttribute('x2',ex);glLink.setAttribute('y2',ey);
    ghHd.setAttribute('cx',ex);ghHd.setAttribute('cy',ey);
    
    if(tgtId!==plusDrag.targeting){plusDrag.targeting=tgtId;updateLinkTarget(tgtId)}
  }
}

function endPlusDrag(ev){
  if(!plusDrag.active)return;
  glLink.style.display='none';ghHd.style.display='none';updateLinkTarget(null);
  const rc=wrap.getBoundingClientRect();
  const wasMoved=plusDrag.moved;
  const tgt=plusDrag.targeting;
  const fromId=plusDrag.nodeId;
  const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
  
  if(!wasMoved){
    addChild(fromId, plusDrag.dirHint);
  } else {
    if(tgt){
      const exists = edges.some(e => (e.from === fromId && e.to === tgt) || (e.from === tgt && e.to === fromId));
      if(exists) {
        toast('Связь уже существует');
        plusDrag={active:false};
        return;
      }
      const fromN=gN(fromId), toN=gN(tgt);
      sh();
      const isToNote = toN && toN.type === 'note';
      const isFromNote = fromN && fromN.type === 'note';
      let e;
      if(isToNote || isFromNote) {
        const branchColor = fromN ? (fromN.color || LCOLS[0]) : LCOLS[0];
        e = {id:nid(),from:fromId,to:tgt,shape:'straight',dash:'dotted',width:1.5,dir:'none',color:branchColor,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false};
        edges.push(e);
      } else {
        e = mkEdge(fromId,tgt,true);
        edges.push(e);
        selE=e.id; selEHandles=true; selN=null; selNSet.clear();
      }
      // Save dynamic side offsets for multi nodes based on current drag release positions
      let sx = fromN.x, sy = fromN.y;
      if (fromN.type === 'multi') {
        const snap = getSnapPoint(fromN, {x: p.x, y: p.y}, e, 'from');
        sx = snap.x; sy = snap.y;
      } else {
        getSnapPoint(fromN, {x: p.x, y: p.y}, e, 'from'); 
      }
      if (toN.type === 'multi') {
        getSnapPoint(toN, {x: sx, y: sy}, e, 'to');
      } else {
        getSnapPoint(toN, {x: sx, y: sy}, e, 'to');
      }
      render();
    } else {
      sh();const id=mkNode(p.x,p.y,'+',fromId,false);
      const e = edges[edges.length - 1]; // mkNode pushes edge connecting parent and child
      const fromN = gN(fromId);
      if (fromN.type === 'multi') getSnapPoint(fromN, {x: p.x, y: p.y}, e, 'from');
      if(autoMode)autoLayout();render();selNode(id);
      if(isMob())showMobRename(id,true);else setTimeout(()=>editNode(id,true),50);
    }
  }
  plusDrag={active:false};
}

/* touch drag from side plus */
let plusTouchDrag={active:false};
function startPlusTouchDrag(ev,nodeId){
  ev.preventDefault();ev.stopPropagation();
  const t=ev.touches[0];
  const rc=wrap.getBoundingClientRect();
  plusTouchDrag={active:true,nodeId,sx:t.clientX,sy:t.clientY,moved:false,targeting:null};
  const n=gN(nodeId);
  glLink.setAttribute('x1',n.x);glLink.setAttribute('y1',n.y);
  glLink.setAttribute('x2',n.x);glLink.setAttribute('y2',n.y);
  glLink.style.display='block';ghHd.style.display='block';
}
// touch move/end for plus drag handled in svgl touchmove below — we route via global
document.addEventListener('touchmove',ev=>{
  if(!plusTouchDrag.active)return;ev.preventDefault();
  const t=ev.touches[0];const rc=wrap.getBoundingClientRect();
  const dx=t.clientX-plusTouchDrag.sx,dy=t.clientY-plusTouchDrag.sy;
  if(!plusTouchDrag.moved&&(Math.abs(dx)>6||Math.abs(dy)>6))plusTouchDrag.moved=true;
  if(plusTouchDrag.moved){
    const p=s2c(t.clientX-rc.left,t.clientY-rc.top);
    const n=gN(plusTouchDrag.nodeId);
    
    let sx = n.x, sy = n.y;
    if(n.type === 'group') {
      const snap = groupSnapPoint(n, {x: p.x, y: p.y});
      sx = snap.x; sy = snap.y;
    }
    glLink.setAttribute('x1',sx);glLink.setAttribute('y1',sy);
    
    const tgtId=findNodeAt(t.clientX-rc.left,t.clientY-rc.top,plusTouchDrag.nodeId);
    let ex = p.x, ey = p.y;
    if(tgtId) {
      const tgtN = gN(tgtId);
      if(tgtN.type === 'group') {
        const snap = groupSnapPoint(tgtN, {x: sx, y: sy});
        ex = snap.x; ey = snap.y;
      } else {
        ex = tgtN.x; ey = tgtN.y;
      }
    }
    glLink.setAttribute('x2',ex);glLink.setAttribute('y2',ey);
    ghHd.setAttribute('cx',ex);ghHd.setAttribute('cy',ey);
    
    if(tgtId!==plusTouchDrag.targeting){plusTouchDrag.targeting=tgtId;updateLinkTarget(tgtId)}
  }
},{passive:false});
document.addEventListener('touchend',ev=>{
  if(!plusTouchDrag.active)return;
  glLink.style.display='none';ghHd.style.display='none';updateLinkTarget(null);
  const t=ev.changedTouches[0];const rc=wrap.getBoundingClientRect();
  const p=s2c(t.clientX-rc.left,t.clientY-rc.top);
  const wasMoved=plusTouchDrag.moved;
  const tgt=plusTouchDrag.targeting;const fromId=plusTouchDrag.nodeId;
  plusTouchDrag={active:false};
  if(!wasMoved&&!tgt){addChild(fromId);return}
  if(tgt){
    const exists = edges.some(e => (e.from === fromId && e.to === tgt) || (e.from === tgt && e.to === fromId));
    if(exists) {
      toast('Связь уже существует');
      return;
    }
    sh();
    const ne = mkEdge(fromId,tgt,true);
    edges.push(ne);
    render();
    // Just select the edge visually, don't open the context menu automatically
    selE=ne.id; selEHandles=true; selN=null; selNSet.clear(); render();
  }
  else{sh();const id=mkNode(p.x,p.y,'',fromId);render();selN=id;render();showMobRename(id,true)}
},{passive:true});
let dragCreate={active:false};

function startDragCreate(nodeId,sx,sy){
  dragCreate={active:true,fromId:nodeId,startSX:sx,startSY:sy,targeting:null};
  const n=gN(nodeId);
  glLink.setAttribute('x1',n.x);glLink.setAttribute('y1',n.y);
  glLink.setAttribute('x2',n.x);glLink.setAttribute('y2',n.y);
  glLink.style.display='block';ghHd.style.display='block';
}

function updateDragCreate(sx,sy){
  if(!dragCreate.active)return;
  const rc=wrap.getBoundingClientRect();
  const p=s2c(sx,sy);
  glLink.setAttribute('x2',p.x);glLink.setAttribute('y2',p.y);
  ghHd.setAttribute('cx',p.x);ghHd.setAttribute('cy',p.y);
  const tgt=findNodeAt(sx,sy,dragCreate.fromId);
  if(tgt!==dragCreate.targeting){dragCreate.targeting=tgt;updateLinkTarget(tgt)}
}

function endDragCreate(sx,sy){
  if(!dragCreate.active)return;
  glLink.style.display='none';ghHd.style.display='none';updateLinkTarget(null);
  const rc=wrap.getBoundingClientRect();
  const p=s2c(sx,sy);const tgt=dragCreate.targeting;const fromId=dragCreate.fromId;
  dragCreate={active:false};
  if(tgt){
    sh();
    const ne = mkEdge(fromId,tgt,true);
    edges.push(ne);
    render();
    // Just select the edge visually, don't open the context menu automatically
    selE=ne.id; selEHandles=true; selN=null; selNSet.clear(); render();
  }
  else{sh();const id=mkNode(p.x,p.y,'',fromId);render();selN=id;render();if(isMob())showMobRename(id,true);else setTimeout(()=>editNode(id,true),50)}
}

function findNodeAt(sx,sy,excludeId){
  const rc = wrap.getBoundingClientRect();
  const elAt = document.elementFromPoint(sx + rc.left, sy + rc.top);
  
  if (elAt && elAt.classList.contains('np')) {
    const isGroup = elAt.classList.contains('group-np');
    const par = isGroup ? elAt.closest('.group-box.g-ui-box') : elAt.closest('.node');
    if (par && par.id && par.id.startsWith('nd')) {
      const tid = parseInt(par.id.replace('nd',''));
      if (tid !== excludeId) return tid;
    }
  }

  const p=s2c(sx,sy);
  let found=null, bestD=Infinity;
  
  let insideNode = null;
  let insideGroup = null;
  
  for(const n of nodes) {
    if(n.id === excludeId) continue;
    // skip group if dragged node is geometrically inside it
    if(n.type === 'group' && excludeId != null) {
      const exN = gN(excludeId);
      if(exN && exN.x >= n.x - n.width/2 && exN.x <= n.x + n.width/2 && exN.y >= n.y - n.height/2 && exN.y <= n.y + n.height/2) {
        continue;
      }
    }
    const {hw, hh} = nodeHalfExtents(n.id);
    if(Math.abs(p.x - n.x) <= hw && Math.abs(p.y - n.y) <= hh) {
      if(n.type === 'group') {
        insideGroup = n.id;
      } else {
        insideNode = n.id;
      }
    }
  }
  
  if(insideNode) return insideNode;
  if(insideGroup) return insideGroup;
  
  // Snap radius: 0 for mouse/desktop, small for touch
  const MAX_DIST = isMob() ? (24*24) : 0;
  for(const n of nodes) {
    if(n.id === excludeId) continue;
    if(n.type === 'group' && excludeId != null) {
      const exN = gN(excludeId);
      if(exN && exN.x >= n.x - n.width/2 && exN.x <= n.x + n.width/2 && exN.y >= n.y - n.height/2 && exN.y <= n.y + n.height/2) continue;
    }
    const {hw, hh} = nodeHalfExtents(n.id);
    const dx = Math.max(Math.abs(n.x - p.x) - hw, 0);
    const dy = Math.max(Math.abs(n.y - p.y) - hh, 0);
    const d = dx*dx + dy*dy;
    if(d < MAX_DIST && d < bestD) {
      bestD = d;
      found = n.id;
    }
  }
  return found;
}

function updateLinkTarget(tgtId){
  document.querySelectorAll('.link-target').forEach(el=>el.classList.remove('link-target'));
  if(tgtId!=null){const el=document.getElementById('nd'+tgtId);if(el)el.classList.add('link-target')}
}

