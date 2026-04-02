/* ================================================================
   MOUSE INTERACTION
================================================================ */
let ms={};   // mouse state
let bzDrag={active:false};
let epDrag={active:false}; // edge endpoint reconnection drag

function onNodeMD(ev,id){
  ev.stopPropagation();hideAllMenus();hideCanvDblMenu();
  const now=Date.now();
  // double-click on node body → open note
  if(ms.lastId===id&&now-ms.lastT<350&&!ms.drgd){
    ms={};
    openNote(id, 'auto');
    return;
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
  } else {
    if(!selNSet.has(id) && selN !== id) {
      selNode(id);
    }
  }

  ms.dragging=true;
  ms.dragId=id;
  ms.dragButton = ev.button; // Capture if it's middle-click or something else
  const rc=wrap.getBoundingClientRect();
  const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
  
  ms.dragOffsets = [];
  
  // Independent group dragging: if it's middle-click or Ctrl-click, only move the box
  const moveOnlyFrame = (ev.button === 1) || (ev.ctrlKey && !selNSet.has(id));

  const addNodeToDrag = (nid) => {
    if(!ms.dragOffsets.find(d=>d.id===nid)) {
      const n = gN(nid);
      if(n && !n.locked) {
        ms.dragOffsets.push({ id: nid, ox: p.x - n.x, oy: p.y - n.y });
        if(n.type === 'group' && !moveOnlyFrame) {
          // Find all nodes inside this group
          nodes.forEach(child => {
            if(child.id !== nid && !child.locked && child.x >= n.x - n.width/2 && child.x <= n.x + n.width/2 && child.y >= n.y - n.height/2 && child.y <= n.y + n.height/2) {
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
  ms.sx=ev.clientX;ms.sy=ev.clientY;
}

svgl.addEventListener('mousedown',ev=>{
  if(ev.button===2)return; // rightclick handled by contextmenu event
  // Edge endpoint drag: reconnect
  if(ev.target.classList.contains('edge-endpoint')){
    ev.preventDefault();ev.stopPropagation();
    const eid=parseInt(ev.target.dataset.eid);
    const which=ev.target.dataset.which; // 'from' or 'to'
    const e=gE(eid);if(!e)return;
    const rc=wrap.getBoundingClientRect();
    const fixedId=which==='from'?e.to:e.from;
    const fixedN=gN(fixedId);
    epDrag={active:true,eid,which,fixedX:fixedN.x,fixedY:fixedN.y};
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
    // Middle mouse button = pan
    ev.preventDefault();
    if(linkMode){exitLinkMode();return;}
    ms.panning=true;ms.psx=ev.clientX;ms.psy=ev.clientY;ms.spx=panX;ms.spy=panY;
    return;
  }
  if(ev.button!==0)return;
  if(linkMode){exitLinkMode();return;}

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

window.addEventListener('mousemove',ev=>{
  const rc=wrap.getBoundingClientRect();
  if(groupResize.active){updateGroupResize(ev);return}
  if(ms.drgCreate){updateDragCreate(ev.clientX-rc.left,ev.clientY-rc.top);return}
  if(plusDrag.active){updatePlusDrag(ev);return}
  // Edge endpoint reconnection: draw ghost line
  if(epDrag.active){
    const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
    // ghost-ln is a <line>, not <path> — use x1/y1/x2/y2
    glLink.setAttribute('x1', epDrag.fixedX);
    glLink.setAttribute('y1', epDrag.fixedY);
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
      if(!ms.drgd&&(Math.abs(dx)>4||Math.abs(dy)>4))ms.drgd=true;
      if(ms.drgd){
        const p=s2c(ev.clientX-rc.left,ev.clientY-rc.top);
        ms.dragOffsets.forEach(doff => {
          const n = gN(doff.id);
          const prevX = n.x, prevY = n.y;
          n.x = p.x - doff.ox;
          n.y = p.y - doff.oy;
          const ddx = n.x - prevX, ddy = n.y - prevY;
          // Shift absolute control points of connected edges proportionally
          if(ddx !== 0 || ddy !== 0) {
            edges.forEach(edge => {
              if(edge.cp1x == null) return;
              if(edge.from === doff.id) {
                edge.cp1x += ddx; edge.cp1y += ddy;
              }
              if(edge.to === doff.id) {
                edge.cp2x += ddx; edge.cp2y += ddy;
              }
            });
          }
          const el = document.getElementById('nd'+doff.id);
          if(el){el.style.left=n.x+'px';el.style.top=n.y+'px';}
        });
        renderEdgesOnly();
        // Highlight edges for drop-target AFTER renderEdgesOnly,
        // because renderEdgesOnly recreates all SVG edge groups
        if(ms.dragOffsets.length===1 && !selNSet.size){
          const dn=gN(ms.dragOffsets[0].id);
          const dnEl=document.getElementById('nd'+dn.id);
          if(dnEl) dnEl.classList.remove('drop-node-target');
          if(dn){
            let bestDist = Infinity;
            let bestEid = null;
            edges.forEach(e=>{
              if(e.from===dn.id||e.to===dn.id||e.collapsed)return;
              let minDist = Infinity;
              for(let t=0; t<=1; t+=0.01){
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
      // findNodeAt expects screen-relative coords, not canvas coords
      const targetId=findNodeAt(ev.clientX-rc.left,ev.clientY-rc.top, epDrag.which==='from'?e.from:e.to);
      if(targetId && targetId!==e.from && targetId!==e.to){
        // Prevent duplicate edges
        const dupExists=edges.some(x=>x.id!==e.id&&((x.from===e.from&&x.to===targetId)||(x.from===targetId&&x.to===e.from)));
        if(!dupExists){
          sh();
          if(epDrag.which==='from')e.from=targetId;
          else e.to=targetId;
          e.cp1x=null;e.cp1y=null;e.cp2x=null;e.cp2y=null; // reset CPs
          render();
          toast('🔗 Переподключено');
        } else {
          toast('Связь уже существует');
        }
      }
    }
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
  if(ms.dragging&&ms.drgd){
    // Check if a single node was dropped on a highlighted edge — insert in break
    if(ms.dragOffsets&&ms.dragOffsets.length===1&&!selNSet.size){
      const dropTarget=document.querySelector('.edge-group.drop-target');
      document.querySelectorAll('.edge-group').forEach(eg=>eg.classList.remove('drop-target'));
      const dropNodeId=ms.dragOffsets[0].id;
      const dnEl=document.getElementById('nd'+dropNodeId);
      if(dnEl) dnEl.classList.remove('drop-node-target');
      
      if(dropTarget){
        const dropEid=parseInt(dropTarget.dataset.eid);
        if(dropEid&&dropNodeId){
          insertNodeBetween(dropEid,dropNodeId);
        }
        ms.dragging=false;ms.panning=false;ms.drgd=false;
        return;
      }
    } else {
      document.querySelectorAll('.edge-group').forEach(eg=>eg.classList.remove('drop-target'));
    }
    pruneGroupEdges();sh();render();
  }  // save history + re-render once on drop
  else if(ms.dragging && !ms.drgd && selNSet.has(ms.dragId) && !(ev.ctrlKey || ev.metaKey || ev.button === 1)) {
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
  if((ev.key==='Delete'||ev.key==='Backspace')&&selN){const root=nodes.find(n=>n.type==='root');if(selN!==root.id)delBranch(selN)}
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

