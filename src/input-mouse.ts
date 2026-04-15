// @ts-nocheck
/* ================================================================
   MOUSE INTERACTION
================================================================ */
let ms={};   // mouse state
let bzDrag={active:false};
let epDrag={active:false}; // edge endpoint reconnection drag

function onNodeMD(ev,id){
  ev.stopPropagation();hideAllMenus();hideCanvDblMenu();
  const now=Date.now();
  
  // Pending insertion on DOUBLE CLICK
  const isDbl = ms.lastId===id && now-ms.lastT < 500;

  if(isDbl && pendingInsert && pendingInsert.nodeId === id) {
    sh(); insertNodeBetween(pendingInsert.edgeId, pendingInsert.nodeId);
    pendingInsert = null;
    document.querySelectorAll('.edge-group.drop-target, .node.drop-node-target').forEach(el=>el.classList.remove('drop-target', 'drop-node-target'));
    ms = {}; // clear state
    return;
  }
  
  // double-click on node body → open note (if not inserting)
  if(isDbl && !ms.drgd){
    ms={};
    openNote(id, 'auto');
    return;
  }
  
  // Clear pending if click on another node OR single click on this node might move it?
  // Actually, we can keep pending if it's a single click on THIS node to allow further dragging.
  if(pendingInsert && pendingInsert.nodeId !== id) {
    pendingInsert = null;
    document.querySelectorAll('.edge-group.drop-target, .node.drop-node-target').forEach(el=>el.classList.remove('drop-target', 'drop-node-target'));
  }
  ms.lastId=id;ms.lastT=now;ms.drgd=false;
  if(linkMode){handleLinkClick(id);return}

  if(ev.ctrlKey || ev.metaKey || ev.button === 1) {
    if(selNSet.has(id)) {
      selNSet.delete(id);
      if(selNSet.size===1) { selN=[...selNSet][0]; selNSet.clear(); }
      else if(selNSet.size===0) { selN=null; }
    } else {
      if(selN) { selNSet.add(selN); selN=null; }
      selNSet.add(id);
    }
    render();
    // Deferred selNode(id) to mouseup event if it's just a click
  }

  ms.dragging=true;
  ms.dragId=id;
  ms.dragButton = ev.button; // Capture if it's middle-click or something else
  
  // Track collapsed groups for visibility highlight logic
  const dnRef = gN(id);
  ms.startGroups = [];
  if (dnRef && dnRef.type !== 'group') {
    nodes.filter(g => g.type === 'group' && g.collapsed).forEach(g => {
      const hw = (g.width || 300)/2, hh = (g.height || 200)/2;
      if (dnRef.x >= g.x - hw && dnRef.x <= g.x + hw && dnRef.y >= g.y - hh && dnRef.y <= g.y + hh) {
        ms.startGroups.push(g.id);
      }
    });
  }

  const rc=wrap.getBoundingClientRect();
  const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);

  
  ms.dragOffsets = [];
  
  // Group drag logic: LMB (0) moves frame only. MMB (1) moves frame + children.
  const moveOnlyFrame = (ev.button === 0);


  let bgBoundsCache = null;
  const getBgCache = () => {
    if (!bgBoundsCache) {
      if (typeof getMapBgBounds !== 'function') return [];
      bgBoundsCache = nodes
        .filter(rn => rn.type === 'root' && rn.mapBg && rn.mapBg.image && rn.mapBg.imgEnabled)
        .map(rn => ({ rootId: rn.id, bounds: getMapBgBounds(rn.id) }))
        .filter(b => b.bounds);
    }
    return bgBoundsCache;
  };

  // Helper: check if a node is inside a strictly defined map background
  const getNodeMapBgBounds = (n) => {
    if (!n) return null;
    const bgs = getBgCache();
    for (const bg of bgs) {
      if (n.x >= bg.bounds.x && n.x <= bg.bounds.x2 && n.y >= bg.bounds.y && n.y <= bg.bounds.y2) {
        return bg;
      }
    }
    return null;
  };

  const addNodeToDrag = (nid, isMapMove = false, allowedRootBg = undefined) => {
    if(ms.dragOffsets.some(d => d.id === nid)) return;
    const n = gN(nid);
    if(!n) return;
    
    // Which map background does this node belong to?
    const bgInfo = getNodeMapBgBounds(n);
    const inBgRootId = bgInfo ? bgInfo.rootId : null;

    // Rigid Region Barrier:
    // A root node with an active map background acts as a regional platform.
    // It can ONLY be moved if it is the very first node clicked (isMapMove = false).
    // It can NEVER be recruited recursively by dragging its contents or connected items.
    if (isMapMove && n.type === 'root' && n.mapBg && n.mapBg.imgEnabled) {
      return; 
    }

    // Cross-contamination barrier (Bidirectional):
    // If we started this map move inside/outside a specific domain, we must stay in it.
    if (isMapMove && allowedRootBg !== undefined) {
       if (allowedRootBg !== inBgRootId) return; // Barrier stop!
    }

    if(n.locked && n.type !== 'root' && !isMapMove) return;

    ms.dragOffsets.push({ id: nid, n: n, ox: p.x - n.x, oy: p.y - n.y });

    // Undirected graph expansion
    if (isMapMove || n.type === 'root') {
      const currentBg = allowedRootBg !== undefined ? allowedRootBg : inBgRootId;
      edges.forEach(e => {
        if (e.from === nid) addNodeToDrag(e.to, true, currentBg);
        if (e.to === nid) addNodeToDrag(e.from, true, currentBg);
      });
      
      // Spatial expansion ONLY if we are moving a background map
      if (bgInfo && bgInfo.rootId === n.id) {
        nodes.forEach(nn => {
          if (nn.x >= bgInfo.bounds.x && nn.x <= bgInfo.bounds.x2 && nn.y >= bgInfo.bounds.y && nn.y <= bgInfo.bounds.y2) {
            addNodeToDrag(nn.id, true, bgInfo.rootId);
          }
        });
      }
    }

    // Group contents expansion
    if(n.type === 'group' && !moveOnlyFrame) {
      const gW = (n.width || 300) / 2;
      const gH = (n.height || 200) / 2;
      nodes.forEach(child => {
        if(child.id !== nid && child.x >= n.x - gW && child.x <= n.x + gW && child.y >= n.y - gH && child.y <= n.y + gH) {
          const childBg = getNodeMapBgBounds(child);
          const childBgId = childBg ? childBg.rootId : null;
          // Only pull children if they are in the same (or no) background domain
          if ((!isMapMove) || (childBgId === inBgRootId)) {
            addNodeToDrag(child.id, isMapMove, allowedRootBg !== undefined ? allowedRootBg : inBgRootId);
          }
        }
      });
    }

    // Recursively pull group if a node is inside it
    if (isMapMove) {
      const currentBg = allowedRootBg !== undefined ? allowedRootBg : inBgRootId;
      nodes.forEach(g => {
        if (g.type === 'group' && g.id !== nid) {
          const gw = (g.width || 300) / 2;
          const gh = (g.height || 200) / 2;
          if (n.x >= g.x - gw && n.x <= g.x + gw && n.y >= g.y - gh && n.y <= g.y + gh) {
            addNodeToDrag(g.id, true, currentBg);
          }
        }
      });
    }
  };

  if(selNSet.size > 0 && (selNSet.has(id) || selN === id)) {
    selNSet.forEach(nid => addNodeToDrag(nid));
    if(selN) addNodeToDrag(selN);
  } else {
    addNodeToDrag(id);
  }
  ms.sx=ev.clientX;ms.sy=ev.clientY;
  
  if (ms.dragOffsets.length > 0) {
    const draggedIds = new Set(ms.dragOffsets.map(d => d.id));
    const otherNodes = [], draggedNodes = [];
    nodes.forEach(n => draggedIds.has(n.id) ? draggedNodes.push(n) : otherNodes.push(n));
    nodes = [...otherNodes, ...draggedNodes];
    
    const otherEdges = [], draggedEdges = [];
    edges.forEach(e => (draggedIds.has(e.from) || draggedIds.has(e.to)) ? draggedEdges.push(e) : otherEdges.push(e));
    edges = [...otherEdges, ...draggedEdges];
    
    // Instantly bring dragged DOM elements to front without forcing a full canvas re-render
    draggedNodes.forEach(n => {
      const el = document.getElementById('nd'+n.id) || document.getElementById('gb'+n.id);
      if (el) canvas.appendChild(el);
    });
    draggedEdges.forEach(e => {
      const eg = document.querySelector(`.edge-group[data-eid="${e.id}"]`);
      if (eg) svgl.insertBefore(eg, glLink);
    });
  }
}

svgl.addEventListener('mousedown',ev=>{
  if(ev.button===2)return; // rightclick handled by contextmenu event
  // Edge endpoint drag: reconnect
  if(ev.target.classList.contains('edge-endpoint')){
    ev.preventDefault();ev.stopPropagation();
    const eid=parseInt(ev.target.dataset.eid);
    const which=ev.target.dataset.which; // 'from' or 'to'
    const e=gE(eid);if(!e)return;
    const fixedId = which === 'from' ? e.to : e.from;
    epDrag={active:true,eid,which,fixedId};
    const eg = document.getElementById('eg'+eid);
    if (eg) eg.style.display = 'none';
    ev.target.classList.add('dragging');
    return;
  }
  if(ev.target.classList.contains('bz-handle')){
    ev.preventDefault();ev.stopPropagation();
    bzDrag={active:true,eid:ev.target.dataset.eid,cp:ev.target.dataset.cp};return;
  }
  const grpEl=ev.target.closest('.edge-group');
  if(grpEl){
    ev.stopPropagation();const eid=parseInt(grpEl.dataset.eid);const e=gE(eid);if(!e)return;
    if(ev.detail===2){
       deselAll(); editEdge(eid); return;
    }
    ms.drgd=false;
    const sh = e.shape || gls;
    if (sh === 'straight') {
      bzDrag={active:true,eid,cp:'straight',sx:ev.clientX,sy:ev.clientY,origCP:{...getCP(e)},moved:false,pendingSel:eid};
    } else if (sh === 'elbow') {
      bzDrag={active:true,eid,cp:'elbow',sx:ev.clientX,sy:ev.clientY,origBend:e.bend??0.5,moved:false,pendingSel:eid};
    } else {
      if(e.cp1x==null){const cp=getCP(e);e.cp1x=cp.cp1x;e.cp1y=cp.cp1y;e.cp2x=cp.cp2x;e.cp2y=cp.cp2y}
      bzDrag={active:true,eid,cp:'line',sx:ev.clientX,sy:ev.clientY,origCP:{...getCP(e)},moved:false,pendingSel:eid};
    }
    return;
  }
});

wrap.addEventListener('mousedown',ev=>{
  // If the click originated inside a node, let the node's own handler deal with it
  if(ev.target.closest('.node'))return;
  if(ev.button===1){
    // Middle mouse button = pan canvas OR drag map background
    ev.preventDefault();
    if(linkMode){exitLinkMode();return;}
    
    // Check if clicking on a map background
    const mBgRootId = typeof getMapBgAtScreen === 'function' ? getMapBgAtScreen(ev.clientX, ev.clientY) : null;
    if (mBgRootId !== null) {
       // Drag the entire map via its background
       onNodeMD(ev, mBgRootId);
       return;
    }

    ms.panning=true;ms.psx=ev.clientX;ms.psy=ev.clientY;ms.spx=panX;ms.spy=panY;
    return;
  }
  if(ev.button!==0)return;
  if(linkMode){exitLinkMode();return;}
  if(pendingInsert) {
    pendingInsert = null;
    document.querySelectorAll('.edge-group.drop-target, .node.drop-node-target').forEach(el=>el.classList.remove('drop-target', 'drop-node-target'));
  }

  const now=Date.now();
  if(now-lastCanvClick<350){
    // Double click on canvas
    lastCanvClick=0;
    deselAll();hideAllMenus();
    showCanvDblMenu(ev.clientX,ev.clientY);
    return;
  }
  lastCanvClick=now;

  // LMB on empty canvas = start area selection
  deselAll();hideAllMenus();hideCanvDblMenu();
  selBoxState={active:true,sx:ev.clientX,sy:ev.clientY,moved:false};
  const sb=document.getElementById('sel-box');
  sb.style.left=ev.clientX+'px';sb.style.top=ev.clientY+'px';
  sb.style.width='0px';sb.style.height='0px';sb.style.display='block';
});

wrap.addEventListener('contextmenu',ev=>{
  ev.preventDefault();
  // only show canvas ctx on truly empty field — not on nodes, not on edges
  if(!ev.target.closest('.node')&&!ev.target.classList.contains('ehit')&&!ev.target.classList.contains('ep')){
    showCanvCtx(ev.clientX,ev.clientY);
  }
});
let rafId = null;
let pendingMouseEv = null;

function onRaf() {
  if (!pendingMouseEv) {
    rafId = null;
    return;
  }
  const ev = pendingMouseEv;
  pendingMouseEv = null;
  rafId = null;

  const rc=wrap.getBoundingClientRect();
  if(typeof posState !== 'undefined' && posState.active) return;
  if(groupResize.active){updateGroupResize(ev);return}
  if(ms.drgCreate){updateDragCreate(ev.clientX-rc.left,ev.clientY-rc.top);return}
  if(plusDrag.active){updatePlusDrag(ev);return}
  // Edge endpoint reconnection: draw ghost line
  if(epDrag.active){
    const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
    const e=gE(epDrag.eid);
    let fx = 0, fy = 0;
    if(e) {
       const fixedN = gN(epDrag.fixedId);
       const side = epDrag.which === 'from' ? 'to' : 'from';
       const pt = getSnapPoint(fixedN, p, e, side);
       fx = pt.x; fy = pt.y;
    }
    // ghost-ln is a <line>, not <path> — use x1/y1/x2/y2
    glLink.setAttribute('x1', fx);
    glLink.setAttribute('y1', fy);
    glLink.setAttribute('x2', p.x);
    glLink.setAttribute('y2', p.y);
    glLink.style.display='block';
    ghHd.setAttribute('cx', p.x);
    ghHd.setAttribute('cy', p.y);
    ghHd.style.display='block';
    // Highlight hovered node — findNodeAt expects screen-relative coords
    const hovN=findNodeAt(ev.clientX-rc.left,ev.clientY-rc.top);
    document.querySelectorAll('.node.ep-target').forEach(el=>el.classList.remove('ep-target'));
    if(hovN){
      const el=document.getElementById('nd'+hovN);
      if(el)el.classList.add('ep-target');
    }
    return;
  }
  if(bzDrag.active){
    const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);const e=gE(parseInt(bzDrag.eid));if(!e)return;
    const sh = e.shape || gls;
    if (sh === 'bezier' || sh === 'straight') {
      if (bzDrag.cp === '1' || bzDrag.cp === '2' || bzDrag.cp === 'line' || bzDrag.cp === 'straight') {
        if (e.cp1x == null) {
          const cp = getCP(e);
          e.cp1x = cp.cp1x; e.cp1y = cp.cp1y; e.cp2x = cp.cp2x; e.cp2y = cp.cp2y;
          if (bzDrag.cp === 'line' || bzDrag.cp === 'straight') {
            bzDrag.origCP = { ...cp };
          }
        }
        if (bzDrag.cp === '1') { e.cp1x = p.x; e.cp1y = p.y; }
        else if (bzDrag.cp === '2') { e.cp2x = p.x; e.cp2y = p.y; }
        else if (bzDrag.cp === 'line' || bzDrag.cp === 'straight') {
          bzDrag.moved = true; bzDrag.pendingSel = null;
          const dx = (ev.clientX - bzDrag.sx) / zoom, dy = (ev.clientY - bzDrag.sy) / zoom;
          e.cp1x = bzDrag.origCP.cp1x + dx; e.cp1y = bzDrag.origCP.cp1y + dy;
          e.cp2x = bzDrag.origCP.cp2x + dx; e.cp2y = bzDrag.origCP.cp2y + dy;
        }
      }
    } else if (sh === 'elbow' && bzDrag.cp === 'elbow') {
      bzDrag.moved=true;bzDrag.pendingSel=null;
      const dx=(ev.clientX-bzDrag.sx)/zoom, dy=(ev.clientY-bzDrag.sy)/zoom;
      const {fx, fy, tx, ty} = getEdgePts(e);
      const f=gN(e.from), to=gN(e.to);
      const df = getEdgeDir(f, fx, fy, to);
      const dt = getEdgeDir(to, tx, ty, f);
      let ob = bzDrag.origBend;
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
      bzDrag.moved=true;bzDrag.pendingSel=null;
    }
    renderEdgesOnly();return;
  }
  if(ms.dragging&&ms.dragId){
    if(ms.dragOffsets && ms.dragOffsets.length > 0) {
      const dx=ev.clientX-ms.sx,dy=ev.clientY-ms.sy;
      if(!ms.drgd&&(Math.abs(dx)>2||Math.abs(dy)>2))ms.drgd=true;
      if(ms.drgd){
        const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
        const deltas = new Map();
        ms.dragOffsets.forEach(doff => {
          const n = doff.n;
          const prevX = n.x, prevY = n.y;
          n.x = p.x - doff.ox;
          n.y = p.y - doff.oy;
          const ddx = n.x - prevX, ddy = n.y - prevY;
          if(ddx !== 0 || ddy !== 0) deltas.set(doff.id, {dx: ddx, dy: ddy});
          
          const el = document.getElementById('nd'+doff.id);
          if(el){el.style.left=n.x+'px';el.style.top=n.y+'px';}
          const elBg = document.getElementById('gb'+doff.id);
          if(elBg){elBg.style.left=n.x+'px';elBg.style.top=n.y+'px';}
        });

        // Collect edges to optimize rendering: O(affected_edges) instead of O(total_edges)
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
        // Highlight edges for drop-target AFTER renderEdgesOnly
        if(ms.dragOffsets.length===1 && !selNSet.size){
          const dn=gN(ms.dragOffsets[0].id);
          const dnEl=document.getElementById('nd'+dn.id);
          if(dnEl) dnEl.classList.remove('drop-node-target');
          if(dn){
            let bestDist = Infinity;
            let bestEid = null;
            edges.forEach(e=>{
              if(e.from===dn.id||e.to===dn.id||e.collapsed)return;
              if(dn.type === 'group' && dn.nodes && dn.nodes.includes(e.from) && dn.nodes.includes(e.to)) return;
              
              const {fx, fy, tx, ty} = getEdgePts(e);
              let minX = Math.min(fx, tx) - 30, maxX = Math.max(fx, tx) + 30;
              let minY = Math.min(fy, ty) - 30, maxY = Math.max(fy, ty) + 30;
              if (e.cp1x != null) {
                minX = Math.min(minX, e.cp1x - 30, e.cp2x - 30); maxX = Math.max(maxX, e.cp1x + 30, e.cp2x + 30);
                minY = Math.min(minY, e.cp1y - 30, e.cp2y - 30); maxY = Math.max(maxY, e.cp1y + 30, e.cp2y + 30);
              }
              if (dn.x < minX || dn.x > maxX || dn.y < minY || dn.y > maxY) return;

              let minDist = Infinity;
              for(let t=0; t<=1; t+=0.05){
                const p = edgePt(e, t);
                const d = Math.hypot(dn.x-p.x, dn.y-p.y);
                if(d < minDist) minDist = d;
              }
              if(minDist < 15 && minDist < bestDist){
                bestDist = minDist;
                bestEid = e.id;
              }
            });
            if(bestEid !== null){
              const grpEl=document.querySelector(`.edge-group[data-eid="${bestEid}"]`);
              if(grpEl) grpEl.classList.add('drop-target');
              if(dnEl) dnEl.classList.add('drop-node-target');
            }
          }
        }
        
        // Group visibility toggle highlight logic
        if (ms.startGroups && ms.startGroups.length > 0) {
          const dn = gN(ms.dragOffsets[0].id);
          if (dn) {
            const nhw = (dn.width || 120)/2, nhh = (dn.height || 40)/2;
            ms.startGroups.forEach(gid => {
              const g = gN(gid);
              const btn = document.getElementById('ghide-' + gid);
              const sketch = document.getElementById('gsketch-' + gid);
              if (!g || !btn || !sketch) return;
              
              const hw = (g.width || 300)/2, hh = (g.height || 200)/2;
              const intersects = !(dn.x + nhw < g.x - hw || dn.x - nhw > g.x + hw || dn.y + nhh < g.y - hh || dn.y - nhh > g.y + hh);
              const fullyInside = (dn.x - nhw >= g.x - hw && dn.x + nhw <= g.x + hw && dn.y - nhh >= g.y - hh && dn.y + nhh <= g.y + hh);
              
              btn.classList.remove('drag-in', 'drag-out');
              if (fullyInside) {
                btn.classList.add('drag-in');
                sketch.classList.add('active');
              } else if (intersects) {
                btn.classList.add('drag-out');
                sketch.classList.add('active');
              } else {
                sketch.classList.remove('active');
              }
            });
          }
        }
        if (typeof renderAllMapBgs === 'function') renderAllMapBgs();
      }
    }
    return;
  }
  if(ms.panning){panX=ms.spx+ev.clientX-ms.psx;panY=ms.spy+ev.clientY-ms.psy;applyT();renderMinimap();return}
  // Area selection drag
  if(selBoxState.active){
    const dx=ev.clientX-selBoxState.sx,dy=ev.clientY-selBoxState.sy;
    if(Math.abs(dx)>4||Math.abs(dy)>4)selBoxState.moved=true;
    if(selBoxState.moved){
      const sb=document.getElementById('sel-box');
      sb.style.left=Math.min(ev.clientX,selBoxState.sx)+'px';
      sb.style.top=Math.min(ev.clientY,selBoxState.sy)+'px';
      sb.style.width=Math.abs(dx)+'px';
      sb.style.height=Math.abs(dy)+'px';
    }
  }
}

window.addEventListener('mousemove',ev=>{
  pendingMouseEv = ev;
  if (rafId === null) {
    rafId = requestAnimationFrame(onRaf);
  }
});

window.addEventListener('mouseup',ev=>{
  const rc=wrap.getBoundingClientRect();
  if(groupResize.active){endGroupResize();return}
  if(ms.drgCreate){endDragCreate(ev.clientX-rc.left,ev.clientY-rc.top);ms={};return}
  if(plusDrag.active){endPlusDrag(ev);return}
  // Edge endpoint reconnection: finalize
  if(epDrag.active){
    glLink.style.display='none';
    ghHd.style.display='none';
    document.querySelectorAll('.node.ep-target').forEach(el=>el.classList.remove('ep-target'));
    document.querySelectorAll('.edge-endpoint.dragging').forEach(el=>el.classList.remove('dragging'));
    const rc=wrap.getBoundingClientRect();
    const e=gE(epDrag.eid);
    if(e){
      const targetId = findNodeAt(ev.clientX - rc.left, ev.clientY - rc.top);
      if (targetId) {
        const dupExists = edges.some(x => x.id !== e.id && ((x.from === (epDrag.which === 'from' ? targetId : e.from) && x.to === (epDrag.which === 'to' ? targetId : e.to)) || (x.from === (epDrag.which === 'to' ? targetId : e.to) && x.to === (epDrag.which === 'from' ? targetId : e.from))));
        if (!dupExists) {
          sh();
          const tN = gN(targetId);
          const p = s2c(ev.clientX - rc.left, ev.clientY - rc.top);
          
          if (epDrag.which === 'from') e.from = targetId;
          else e.to = targetId;
          e.cp1x = null; e.cp1y = null; e.cp2x = null; e.cp2y = null;
          
          // Re-compute side/offset based on drop position 'p'
          e[epDrag.which + 'Side'] = null;
          e[epDrag.which + 'Offset'] = null;
          
          // Fixation logic: fix if on strip, or dynamic if on button
          const elAt = document.elementFromPoint(ev.clientX, ev.clientY);
          const isStrip = elAt && (elAt.classList.contains('group-frame-sensor') || elAt.classList.contains('multi-side-sensor'));
          e[epDrag.which + 'Fixed'] = isStrip;
          
          getSnapPoint(tN, p, e, epDrag.which);
          
          render();
          if(typeof syncFixBtns === 'function' && selE === e.id) syncFixBtns(e);
          toast('🔗 Переподключено');
        } else {
          toast('Связь уже существует');
        }
      }
    }
    const eg = document.getElementById('eg'+epDrag.eid);
    if(eg) eg.style.display = '';
    epDrag={active:false};return;
  }
  if(bzDrag.active){
    if(!bzDrag.moved && bzDrag.pendingSel!=null){
      // LMB click (no drag) → select with handles, no LP panel
      selEdge(bzDrag.pendingSel,null,null,true);
    } else if(bzDrag.moved){
      sh();
    }
    bzDrag={active:false};return;
  }
  
  if (ms.startGroups) {
    ms.startGroups.forEach(gid => {
      const btn = document.getElementById('ghide-' + gid);
      const sketch = document.getElementById('gsketch-' + gid);
      if (btn) btn.classList.remove('drag-in', 'drag-out');
      if (sketch) sketch.classList.remove('active');
    });
  }

  if(ms.dragging&&ms.drgd){
    // Check if a single node was dropped on a highlighted edge — insert in break
    if(ms.dragOffsets&&ms.dragOffsets.length===1&&!selNSet.size){
      const dropNodeId=ms.dragOffsets[0].id;
      const dnEl=document.getElementById('nd'+dropNodeId);
      const dropTarget=document.querySelector('.edge-group.drop-target');
      
      if(dropTarget){
        const dropEid=parseInt(dropTarget.dataset.eid);
        if(dropEid&&dropNodeId){
          const dn=gN(dropNodeId); const edge=gE(dropEid);
          let isInt = (dn && dn.type==='group' && edge && dn.nodes && dn.nodes.includes(edge.from) && dn.nodes.includes(edge.to));
          
          if(!isInt) {
            pendingInsert = { nodeId: dropNodeId, edgeId: dropEid };
            toast('Дважды кликните по узлу для вставки в линию');
            render(); // Persistent highlights via geometry.js
          } else {
            document.querySelectorAll('.edge-group').forEach(eg=>eg.classList.remove('drop-target'));
            if(dnEl) dnEl.classList.remove('drop-node-target');
          }
        } else {
          document.querySelectorAll('.edge-group').forEach(eg=>eg.classList.remove('drop-target'));
          if(dnEl) dnEl.classList.remove('drop-node-target');
        }
        ms.dragging=false;ms.panning=false;ms.drgd=false;
        return;
      }
    } else {
      document.querySelectorAll('.edge-group').forEach(eg=>eg.classList.remove('drop-target'));
    }
    pruneGroupEdges();sh();render();
  }  // save history + re-render once on drop
  else if(ms.dragging && !ms.drgd && !(ev.ctrlKey || ev.metaKey || ev.button === 1)) {
    selNode(ms.dragId);
  }
  ms.dragging=false;ms.panning=false;ms.drgd=false;
  // Finish area selection
  if(selBoxState.active){
    const sb=document.getElementById('sel-box');
    if(selBoxState.moved){
      // Find nodes inside the rect
      const r={left:Math.min(ev.clientX,selBoxState.sx),top:Math.min(ev.clientY,selBoxState.sy),
        right:Math.max(ev.clientX,selBoxState.sx),bottom:Math.max(ev.clientY,selBoxState.sy)};
      if(!ev.ctrlKey && !ev.metaKey) selNSet.clear();
      if(selN && (ev.ctrlKey || ev.metaKey)) { selNSet.add(selN); selN=null; }
      nodes.filter(n=>isVisible(n.id)).forEach(n=>{
        const s=c2s(n.x,n.y);
        if(s.x>=r.left&&s.x<=r.right&&s.y>=r.top&&s.y<=r.bottom)selNSet.add(n.id);
      });
      if(selNSet.size===1){selN=[...selNSet][0];selNSet.clear();}
      else if(selNSet.size>1){selN=null;}
      render();
    } else {
      // Clean click on canvas
      showUI();
    }
    sb.style.display='none';selBoxState={active:false};
  }
});

window.addEventListener('click',ev=>{
  if(!ev.target.closest('#ctxmenu'))hideCtxMenu();
  if(!ev.target.closest('#canvctx'))canvCtx.style.display='none';
  if(!ev.target.closest('#mmenu')&&!ev.target.closest('#btn-menu'))mmenu.classList.remove('show');
  // deselect edge if clicked outside edge/handles/LP
  if(!ev.target.closest('.edge-group')&&!ev.target.closest('#lp')&&!ev.target.classList.contains('bz-handle')){
    if(selE!=null){selE=null;selEHandles=true;closeLp();render()}
  }
});

// Right-click on edge → select + show line panel, NO bezier handles
svgl.addEventListener('contextmenu',ev=>{
  ev.preventDefault();ev.stopPropagation();
  const grpEl=ev.target.closest('.edge-group');
  if(grpEl){
    const eid=parseInt(grpEl.dataset.eid);if(!eid)return;
    selEdge(eid,ev.clientX,ev.clientY,false);  // false = no handles on RMB
  }
});
window.addEventListener('contextmenu',ev=>{
  if(ev.target.isContentEditable||['INPUT','TEXTAREA'].includes(ev.target.tagName))return;
  ev.preventDefault();
});

window.addEventListener('keydown',ev=>{
  if(['INPUT','TEXTAREA'].includes(document.activeElement.tagName))return;
  if((ev.key==='Delete'||ev.key==='Backspace')){
    if(selN){const root=nodes.find(n=>n.type==='root');if(selN!==root.id)delBranch(selN)}
    else if(selNSet.size>0){ctxExecMulti('delete')}
  }
  if(ev.key==='Tab'&&selN){ev.preventDefault();addChild(selN)}
  if(ev.key==='F2'&&selN)editNode(selN);
  if((ev.ctrlKey||ev.metaKey)&&ev.key==='z'){ev.preventDefault();undo()}
  if((ev.ctrlKey||ev.metaKey)&&ev.key==='y'){ev.preventDefault();redo()}
  if(ev.key==='Escape'){deselAll();closeLp();hideAllMenus();exitLinkMode();closeLSheet()}
});

wrap.addEventListener('wheel',ev=>{
  ev.preventDefault();
  const rc = wrap.getBoundingClientRect();
  const cx = ev.clientX - rc.left, cy = ev.clientY - rc.top;

  if (ev.ctrlKey) {
    // Pinch to zoom on touchpad
    const zoomFactor = Math.exp(-ev.deltaY * 0.01);
    const nz = Math.min(Math.max(zoom * zoomFactor, .08), 6);
    panX = cx - (cx - panX) * (nz / zoom);
    panY = cy - (cy - panY) * (nz / zoom);
    zoom = nz;
  } else if (ev.deltaMode !== 0 || (ev.deltaX === 0 && Math.abs(ev.deltaY) >= 40 && ev.deltaY % 10 === 0)) {
    // Mouse wheel zoom
    const nz = Math.min(Math.max(zoom * (ev.deltaY < 0 ? 1.1 : .9), .08), 6);
    panX = cx - (cx - panX) * (nz / zoom);
    panY = cy - (cy - panY) * (nz / zoom);
    zoom = nz;
  } else {
    // Touchpad pan (two fingers)
    panX -= ev.deltaX;
    panY -= ev.deltaY;
  }
  applyT();
  renderMinimap();
},{passive:false});

