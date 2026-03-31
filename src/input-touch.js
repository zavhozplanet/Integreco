/* ================================================================
   TOUCH ON NODES
================================================================ */
let ntd={};

function onNdTS(ev,id){
  ev.stopPropagation();
  if(ev.touches.length>1){clearTimeout(ntd.lt);return}
  const t=ev.touches[0];
  const rc=wrap.getBoundingClientRect();
  const p=s2c(t.clientX-rc.left,t.clientY-rc.top);
  const n=gN(id);
  const now=Date.now();

  if(linkMode){
    ev.preventDefault();
    clearTimeout(ntd.lt);
    handleLinkClick(id);return;
  }

  const isDblTap=ntd.lastId===id&&now-ntd.lastT<350;
  
  if(!selNSet.has(id)) selNode(id);
  
  const dragOffsets = [];
  
  const addNodeToDrag = (nid) => {
    if(!dragOffsets.find(d=>d.id===nid)) {
      const nd = gN(nid);
      if(nd && !nd.locked) {
        dragOffsets.push({ id: nid, ox: p.x - nd.x, oy: p.y - nd.y });
        if(nd.type === 'group') {
          nodes.forEach(child => {
            if(child.id !== nid && !child.locked && child.x >= nd.x - nd.width/2 && child.x <= nd.x + nd.width/2 && child.y >= nd.y - nd.height/2 && child.y <= nd.y + nd.height/2) {
              addNodeToDrag(child.id);
            }
          });
        }
      }
    }
  };

  if(selNSet.size > 0) {
    selNSet.forEach(nid => {
      addNodeToDrag(nid);
    });
  } else {
    addNodeToDrag(id);
  }

  ntd={id,sx:t.clientX,sy:t.clientY,ox:p.x-n.x,oy:p.y-n.y,moved:false,dragging:false,lastId:id,lastT:now,dragOffsets};

  if(isDblTap){
    clearTimeout(ntd.lt);ev.preventDefault();
    const n = gN(id);
    if(n.type === 'group') {
      editNode(id, true);
    } else {
      if(n.note) openNote(id, 'view');
      else openNote(id, 'edit');
    }
    return;
  }

  selNode(id);
  ntd.lt=setTimeout(()=>{if(!ntd.moved){if(navigator.vibrate)navigator.vibrate(30);showNodeCtx(t.clientX,t.clientY,id)}},550);
}

function onNdTM(ev,id){
  if(ev.touches.length>1||ntd.dblMode)return;
  const n=gN(id);
  if(n && n.locked) return;
  ev.stopPropagation();const t=ev.touches[0];
  const dx=t.clientX-ntd.sx,dy=t.clientY-ntd.sy;
  if(Math.abs(dx)>6||Math.abs(dy)>6){
    ntd.moved=true;ntd.dragging=true;clearTimeout(ntd.lt);ev.preventDefault();
    const rc=wrap.getBoundingClientRect();const p=s2c(t.clientX-rc.left,t.clientY-rc.top);
    if(ntd.dragOffsets && ntd.dragOffsets.length > 0) {
      ntd.dragOffsets.forEach(doff => {
        const nd = gN(doff.id);
        nd.x = p.x - doff.ox;
        nd.y = p.y - doff.oy;
      });
    } else {
      n.x=p.x-ntd.ox;n.y=p.y-ntd.oy;
    }
    render();
  }
}

function onNdTE(ev,id){
  clearTimeout(ntd.lt);if(ntd.dragging)sh();ntd.dragging=false;
}

/* canvas touch */
let tPan={},tPinch={};
wrap.addEventListener('touchstart',ev=>{
  ev.preventDefault();const tl=ev.touches;
  if(linkMode){exitLinkMode();return;}
  if(tl.length===1){
    hideAllMenus();deselAll();
    tPan={px:panX,py:panY,sx:tl[0].clientX,sy:tl[0].clientY};
  } else if(tl.length===2){
    const t0=tl[0],t1=tl[1];
    tPinch={dist:Math.hypot(t1.clientX-t0.clientX,t1.clientY-t0.clientY),zoom,panX,panY,
      mx:(t0.clientX+t1.clientX)/2,my:(t0.clientY+t1.clientY)/2};
  }
},{passive:false});

wrap.addEventListener('touchmove',ev=>{
  ev.preventDefault();const tl=ev.touches;
  if(tl.length===1&&tPan.sx!=null){
    panX=tPan.px+(tl[0].clientX-tPan.sx);panY=tPan.py+(tl[0].clientY-tPan.sy);applyT();renderMinimap();
  } else if(tl.length===2&&tPinch.dist){
    const t0=tl[0],t1=tl[1];const dist=Math.hypot(t1.clientX-t0.clientX,t1.clientY-t0.clientY);
    const sc=dist/tPinch.dist;const nz=Math.min(Math.max(tPinch.zoom*sc,.08),6);
    const rc=wrap.getBoundingClientRect();const cx=tPinch.mx-rc.left,cy=tPinch.my-rc.top;
    panX=cx-(cx-tPinch.panX)*(nz/tPinch.zoom);panY=cy-(cy-tPinch.panY)*(nz/tPinch.zoom);zoom=nz;applyT();renderMinimap();
  }
},{passive:false});

window.addEventListener('touchmove', ev => {
  if(groupResize.active) {
    ev.preventDefault();
    updateGroupResize(ev);
  }
}, {passive: false});

window.addEventListener('touchend', ev => {
  if(groupResize.active) endGroupResize();
});

// Prevent middle-click autoscroll
wrap.addEventListener('auxclick',ev=>{if(ev.button===1)ev.preventDefault()});

/* bezier touch */
let bzT={active:false};
svgl.addEventListener('touchstart',ev=>{
  const tgt=ev.target;
  if(tgt.classList.contains('bz-handle')){ev.preventDefault();ev.stopPropagation();bzT={active:true,eid:tgt.dataset.eid,cp:tgt.dataset.cp};return}
  const grpEl=tgt.closest('.edge-group');
  if(grpEl){
    ev.preventDefault();ev.stopPropagation();
    const eid=parseInt(grpEl.dataset.eid);const e=gE(eid);if(!e)return;
    const sh = e.shape || gls;
    const t=ev.touches[0];const now=Date.now();
    const isDbl=edgeTapState.eid===eid&&now-edgeTapState.t<400;
    edgeTapState={eid,t:now};
    if(isDbl){
      if (sh === 'straight') {
        bzT={active:true,eid,cp:'straight',sx:t.clientX,sy:t.clientY,origCP:{...getCP(e)}};
      } else if (sh === 'elbow') {
        bzT={active:true,eid,cp:'elbow',sx:t.clientX,sy:t.clientY,origBend:e.bend??0.5};
      } else {
        if(e.cp1x==null){const cp=getCP(e);e.cp1x=cp.cp1x;e.cp1y=cp.cp1y;e.cp2x=cp.cp2x;e.cp2y=cp.cp2y}
        bzT={active:true,eid,cp:'line',sx:t.clientX,sy:t.clientY,origCP:{...getCP(e)}};
      }
      selEdge(eid,null,null,true);showLSheet();
    } else {
      selEdge(eid,null,null,false);
      if (sh === 'bezier') {
        if(e.cp1x==null){const cp=getCP(e);e.cp1x=cp.cp1x;e.cp1y=cp.cp1y;e.cp2x=cp.cp2x;e.cp2y=cp.cp2y}
        bzT={active:true,eid,cp:'line',sx:t.clientX,sy:t.clientY,origCP:{...getCP(e)},touchOnly:true,moved:false};
      } else if (sh === 'elbow') {
        bzT={active:true,eid,cp:'elbow',sx:t.clientX,sy:t.clientY,origBend:e.bend??0.5,touchOnly:true,moved:false};
      } else {
        bzT={active:true,eid,cp:'straight',sx:t.clientX,sy:t.clientY,origCP:{...getCP(e)},touchOnly:true,moved:false};
      }
    }
    return;
  }
},{passive:false});

svgl.addEventListener('touchmove',ev=>{
  if(!bzT.active)return;ev.preventDefault();
  const t=ev.touches[0];const rc=wrap.getBoundingClientRect();const p=s2c(t.clientX-rc.left,t.clientY-rc.top);
  const e=gE(parseInt(bzT.eid));if(!e)return;
  const sh = e.shape || gls;
  if (sh === 'bezier' || sh === 'straight') {
    if (bzT.cp === '1' || bzT.cp === '2' || bzT.cp === 'line' || bzT.cp === 'straight') {
      if (e.cp1x == null) {
        const cp = getCP(e);
        e.cp1x = cp.cp1x; e.cp1y = cp.cp1y; e.cp2x = cp.cp2x; e.cp2y = cp.cp2y;
        if (bzT.cp === 'line' || bzT.cp === 'straight') {
          bzT.origCP = { ...cp };
        }
      }
      if (bzT.cp === '1') { e.cp1x = p.x; e.cp1y = p.y; }
      else if (bzT.cp === '2') { e.cp2x = p.x; e.cp2y = p.y; }
      else {
        const dx = (t.clientX - bzT.sx) / zoom, dy = (t.clientY - bzT.sy) / zoom;
        if (bzT.touchOnly !== undefined) { const d = Math.sqrt(dx * dx + dy * dy); if (d > 6) bzT.moved = true }
        e.cp1x = bzT.origCP.cp1x + dx; e.cp1y = bzT.origCP.cp1y + dy;
        e.cp2x = bzT.origCP.cp2x + dx; e.cp2y = bzT.origCP.cp2y + dy;
      }
    }
  } else if (sh === 'elbow' && bzT.cp === 'elbow') {
    const dx=(t.clientX-bzT.sx)/zoom, dy=(t.clientY-bzT.sy)/zoom;
    if(bzT.touchOnly!==undefined){const d=Math.sqrt(dx*dx+dy*dy);if(d>6)bzT.moved=true}
    const {fx, fy, tx, ty} = getEdgePts(e);
    const f=gN(e.from), to=gN(e.to);
    const df = getEdgeDir(f, fx, fy, to);
    const dt = getEdgeDir(to, tx, ty, f);
    let ob = bzT.origBend;
    if (isNaN(ob)) ob = 0.5;
    let newBend = ob;
    if (df === 'h' && dt === 'h') {
      if (Math.abs(tx - fx) > 5) newBend = ob + dx / (tx - fx);
    } else if (df === 'v' && dt === 'v') {
      if (Math.abs(ty - fy) > 5) newBend = ob + dy / (ty - fy);
    }
    if (!isNaN(newBend)) {
      e.bend = Math.max(0.1, Math.min(0.9, newBend));
    } else {
      e.bend = 0.5;
    }
  } else if (sh === 'straight') {
    const dx=(t.clientX-bzT.sx)/zoom, dy=(t.clientY-bzT.sy)/zoom;
    if(bzT.touchOnly!==undefined){const d=Math.sqrt(dx*dx+dy*dy);if(d>6)bzT.moved=true}
  }
  renderEdgesOnly();
},{passive:false});

svgl.addEventListener('touchend',ev=>{if(bzT.active)sh();bzT={active:false}},{passive:true});

