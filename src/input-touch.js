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

  const isDblTap=ntd.lastId===id&&now-ntd.lastT<500;
  
  const dragOffsets = [];
  
  const addNodeToDrag = (nid) => {
    if(!dragOffsets.find(d=>d.id===nid)) {
      const nd = gN(nid);
      if(nd && !nd.locked) {
        dragOffsets.push({ id: nid, nd: nd, ox: p.x - nd.x, oy: p.y - nd.y });
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

  if(selNSet.size > 0 && selNSet.has(id)) {
    selNSet.forEach(nid => {
      addNodeToDrag(nid);
    });
  } else {
    addNodeToDrag(id);
  }

  if (dragOffsets.length > 0) {
    const draggedIds = new Set(dragOffsets.map(d => d.id));
    const otherNodes = [], draggedNodes = [];
    nodes.forEach(n => draggedIds.has(n.id) ? draggedNodes.push(n) : otherNodes.push(n));
    nodes = [...otherNodes, ...draggedNodes];
    
    const otherEdges = [], draggedEdges = [];
    edges.forEach(e => (draggedIds.has(e.from) || draggedIds.has(e.to)) ? draggedEdges.push(e) : otherEdges.push(e));
    edges = [...otherEdges, ...draggedEdges];
    
    draggedNodes.forEach(n => {
      const el = document.getElementById('nd'+n.id) || document.getElementById('gb'+n.id);
      if (el) canvas.appendChild(el);
    });
    draggedEdges.forEach(e => {
      const eg = document.querySelector(`.edge-group[data-eid="${e.id}"]`);
      if (eg) svgl.insertBefore(eg, glLink);
    });
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

  ntd.lt=setTimeout(()=>{if(!ntd.moved){if(navigator.vibrate)navigator.vibrate(30);showNodeCtx(t.clientX,t.clientY,id)}},550);
}

let rafId = null;
let pendingTouchEv = null;
let tPan={},tPinch={};

function onRaf() {
  if (!pendingTouchEv) {
    rafId = null; return;
  }
  const ev = pendingTouchEv;
  pendingTouchEv = null;
  rafId = null;

  const tl = ev.touches;
  if (!tl || tl.length === 0) return;

  // 1. Delegate to specific move handlers based on state
  if (ntd.dragging && !ntd.dblMode) {
    const id = ntd.id;
    const n = gN(id);
    if (n && !n.locked) {
      const t = tl[0];
      const rc = wrap.getBoundingClientRect();
      const p = s2c(t.clientX - rc.left, t.clientY - rc.top);
      
      const deltas = new Map();
      if (ntd.dragOffsets && ntd.dragOffsets.length > 0) {
        ntd.dragOffsets.forEach(doff => {
          const nd = doff.nd || gN(doff.id);
          if (nd) { 
            const prevX = nd.x, prevY = nd.y;
            nd.x = p.x - doff.ox; nd.y = p.y - doff.oy; 
            deltas.set(doff.id, {dx: nd.x - prevX, dy: nd.y - prevY});
            const el = document.getElementById('nd'+doff.id);
            if(el){el.style.left=nd.x+'px';el.style.top=nd.y+'px';}
            const elBg = document.getElementById('gb'+doff.id);
            if(elBg){elBg.style.left=nd.x+'px';elBg.style.top=nd.y+'px';}
          }
        });
      } else {
        const prevX = n.x, prevY = n.y;
        n.x = p.x - ntd.ox; n.y = p.y - ntd.oy;
        deltas.set(id, {dx: n.x - prevX, dy: n.y - prevY});
        const el = document.getElementById('nd'+id);
        if(el){el.style.left=n.x+'px';el.style.top=n.y+'px';}
        const elBg = document.getElementById('gb'+id);
        if(elBg){elBg.style.left=n.x+'px';elBg.style.top=n.y+'px';}
      }
      
      const affectedEdgeIds = [];
      edges.forEach(edge => {
        if (deltas.has(edge.from) || deltas.has(edge.to)) {
          affectedEdgeIds.push(edge.id);
          if (edge.cp1x != null) {
            const fromDelta = deltas.get(edge.from), toDelta = deltas.get(edge.to);
            if (fromDelta) { edge.cp1x += fromDelta.dx; edge.cp1y += fromDelta.dy; }
            if (toDelta) { edge.cp2x += toDelta.dx; edge.cp2y += toDelta.dy; }
          }
        }
      });
      renderEdgesOnly(affectedEdgeIds);
      if (typeof renderAllMapBgs === 'function') renderAllMapBgs();
    }
  }

  // 2. Canvas pan / zoom
  if (tl.length === 1 && tPan.sx != null && !ntd.dragging) {
    panX = tPan.px + (tl[0].clientX - tPan.sx);
    panY = tPan.py + (tl[0].clientY - tPan.sy);
    applyT(); renderMinimap();
  } else if (tl.length === 2 && tPinch.dist) {
    const t0 = tl[0], t1 = tl[1];
    const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
    const sc = dist / tPinch.dist;
    const nz = Math.min(Math.max(tPinch.zoom * sc, .08), 6);
    const rc = wrap.getBoundingClientRect();
    const cx = tPinch.mx - rc.left, cy = tPinch.my - rc.top;
    panX = cx - (cx - tPinch.panX) * (nz / tPinch.zoom);
    panY = cy - (cy - tPinch.panY) * (nz / tPinch.zoom);
    zoom = nz; applyT(); renderMinimap();
  }

  // 3. Bezier / Edge drag
  if (bzT.active) {
    const t = tl[0];
    const rc = wrap.getBoundingClientRect();
    const p = s2c(t.clientX - rc.left, t.clientY - rc.top);
    const e = gE(parseInt(bzT.eid));
    if (e) {
      const sh = e.shape || gls;
      if (sh === 'bezier' || sh === 'straight') {
        if (bzT.cp === '1' || bzT.cp === '2' || bzT.cp === 'line' || bzT.cp === 'straight') {
          if (e.cp1x == null) {
            const cp = getCP(e);
            e.cp1x = cp.cp1x; e.cp1y = cp.cp1y; e.cp2x = cp.cp2x; e.cp2y = cp.cp2y;
            if (bzT.cp === 'line' || bzT.cp === 'straight') bzT.origCP = { ...cp };
          }
          if (bzT.cp === '1') { e.cp1x = p.x; e.cp1y = p.y; }
          else if (bzT.cp === '2') { e.cp2x = p.x; e.cp2y = p.y; }
          else {
            const dx = (t.clientX - bzT.sx) / zoom, dy = (t.clientY - bzT.sy) / zoom;
            if (bzT.touchOnly !== undefined) { const d = Math.sqrt(dx * dx + dy * dy); if (d > 6) bzT.moved = true; }
            e.cp1x = bzT.origCP.cp1x + dx; e.cp1y = bzT.origCP.cp1y + dy;
            e.cp2x = bzT.origCP.cp2x + dx; e.cp2y = bzT.origCP.cp2y + dy;
          }
        }
      } else if (sh === 'elbow' && bzT.cp === 'elbow') {
        const dx = (t.clientX - bzT.sx) / zoom, dy = (t.clientY - bzT.sy) / zoom;
        if (bzT.touchOnly !== undefined) { const d = Math.sqrt(dx * dx + dy * dy); if (d > 6) bzT.moved = true; }
        const { fx, fy, tx, ty } = getEdgePts(e);
        const f = gN(e.from), to = gN(e.to);
        const df = getEdgeDir(f, fx, fy, to);
        const dt = getEdgeDir(to, tx, ty, f);
        let ob = bzT.origBend; if (isNaN(ob)) ob = 0.5;
        let newBend = ob;
        if (df === 'h' && dt === 'h') { if (Math.abs(tx - fx) > 5) newBend = ob + dx / (tx - fx); }
        else if (df === 'v' && dt === 'v') { if (Math.abs(ty - fy) > 5) newBend = ob + dy / (ty - fy); }
        if (!isNaN(newBend)) e.bend = Math.max(0.1, Math.min(0.9, newBend));
        else e.bend = 0.5;
      } else if (sh === 'straight') {
        const dx = (t.clientX - bzT.sx) / zoom, dy = (t.clientY - bzT.sy) / zoom;
        if (bzT.touchOnly !== undefined) { const d = Math.sqrt(dx * dx + dy * dy); if (d > 6) bzT.moved = true; }
      }
      renderEdgesOnly();
    }
  }

  // 4. Group Resize
  if (groupResize.active) {
    updateGroupResize(ev);
  }
}

function onNdTM(ev, id) {
  if (ev.touches.length > 1 || ntd.dblMode) return;
  const n = gN(id);
  if (n && n.locked) return;
  ev.stopPropagation(); 
  const t = ev.touches[0];
  const dx = t.clientX - ntd.sx, dy = t.clientY - ntd.sy;
  if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
    ntd.moved = true; ntd.dragging = true; clearTimeout(ntd.lt); 
    if (ev.cancelable) ev.preventDefault();
  }
}

function onNdTE(ev,id){
  clearTimeout(ntd.lt);
  if(ntd.dragging) {
    sh();
  } else {
    selNode(id);
  }
  ntd.dragging=false;
}

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

window.addEventListener('touchmove', ev => {
  pendingTouchEv = ev;
  if (rafId === null) rafId = requestAnimationFrame(onRaf);
}, { passive: false });

wrap.addEventListener('touchmove', ev => {
  pendingTouchEv = ev;
  if (rafId === null) rafId = requestAnimationFrame(onRaf);
}, { passive: false });

svgl.addEventListener('touchmove', ev => {
  pendingTouchEv = ev;
  if (rafId === null) rafId = requestAnimationFrame(onRaf);
}, { passive: false });

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

svgl.addEventListener('touchend',ev=>{if(bzT.active)sh();bzT={active:false}},{passive:true});
window.addEventListener('touchend', ev => { if(groupResize.active) endGroupResize(); });
wrap.addEventListener('auxclick',ev=>{if(ev.button===1)ev.preventDefault()});
