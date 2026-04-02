/* ================================================================
   BEZIER
================================================================ */
function groupSnapPoint(g, t) {
  const dx = t.x - g.x;
  const dy = t.y - g.y;
  if (dx === 0 && dy === 0) return {x: g.x, y: g.y};
  
  const hw = (g.width || 300) / 2;
  const hh = (g.height || 200) / 2;
  
  let tX = Infinity, tY = Infinity;
  if (dx !== 0) tX = hw / Math.abs(dx);
  if (dy !== 0) tY = hh / Math.abs(dy);
  
  const minT = Math.min(tX, tY);
  
  return {
    x: g.x + minT * dx,
    y: g.y + minT * dy
  };
}

function getSnapPoint(n, t) {
  if (!n) return {x: 0, y: 0};
  const type = (n.type === 'root' || n.type === 'node') ? 'node' : n.type;
  
  if (!snapSettings[type]) {
    if (n.type === 'group') return groupSnapPoint(n, t);
    return {x: n.x, y: n.y};
  }
  
  let hw, hh;
  if (n.type === 'group') {
    hw = (n.width || 300) / 2;
    hh = (n.height || 200) / 2;
  } else {
    const ext = nodeHalfExtents(n.id);
    hw = ext.hw;
    hh = ext.hh;
  }
  
  const dx = t.x - n.x;
  const dy = t.y - n.y;
  
  if (Math.abs(dx / (hw || 1)) > Math.abs(dy / (hh || 1))) {
    return { x: n.x + (dx > 0 ? hw : -hw), y: n.y };
  } else {
    return { x: n.x, y: n.y + (dy > 0 ? hh : -hh) };
  }
}

function getEdgePts(e) {
  const f=gN(e.from), t=gN(e.to);
  if(!f||!t) return {fx:0,fy:0,tx:0,ty:0};
  const fp = getSnapPoint(f, t);
  const tp = getSnapPoint(t, f);
  return {fx: fp.x, fy: fp.y, tx: tp.x, ty: tp.y};
}

function getEdgeDir(n, x, y, other) {
  let hw, hh;
  if (n.type === 'group') {
    hw = (n.width || 300) / 2;
    hh = (n.height || 200) / 2;
  } else {
    const ext = nodeHalfExtents(n.id);
    hw = ext.hw;
    hh = ext.hh;
  }
  if (Math.abs(Math.abs(x - n.x) - hw) < 2) return 'h';
  if (Math.abs(Math.abs(y - n.y) - hh) < 2) return 'v';
  const dx = other.x - n.x, dy = other.y - n.y;
  return Math.abs(dx / (hw || 1)) > Math.abs(dy / (hh || 1)) ? 'h' : 'v';
}

function getCP(e){
  const f=gN(e.from),t=gN(e.to);if(!f||!t)return{cp1x:0,cp1y:0,cp2x:0,cp2y:0};
  if(e.cp1x!=null && e.cp1y!=null && e.cp2x!=null && e.cp2y!=null) {
    return {cp1x:e.cp1x, cp1y:e.cp1y, cp2x:e.cp2x, cp2y:e.cp2y};
  }
  const sh=e.shape||gls;
  const {fx, fy, tx, ty} = getEdgePts(e);
  
  if(sh==='straight'||sh==='elbow'){
    return{cp1x:fx+(tx-fx)*0.33,cp1y:fy+(ty-fy)*0.33,
           cp2x:fx+(tx-fx)*0.67,cp2y:fy+(ty-fy)*0.67};
  }
  
  const dist = (Math.hypot(tx-fx, ty-fy) || 0) * 0.4;
  let cp1x = fx, cp1y = fy, cp2x = tx, cp2y = ty;

  const dirF = getEdgeDir(f, fx, fy, t);
  if (dirF === 'h') {
    const sign = Math.abs(fx - f.x) > 2 ? Math.sign(fx - f.x) : Math.sign(t.x - f.x);
    cp1x = fx + (sign || 1) * dist;
  } else {
    const sign = Math.abs(fy - f.y) > 2 ? Math.sign(fy - f.y) : Math.sign(t.y - f.y);
    cp1y = fy + (sign || 1) * dist;
  }

  const dirT = getEdgeDir(t, tx, ty, f);
  if (dirT === 'h') {
    const sign = Math.abs(tx - t.x) > 2 ? Math.sign(tx - t.x) : Math.sign(f.x - t.x);
    cp2x = tx + (sign || 1) * dist;
  } else {
    const sign = Math.abs(ty - t.y) > 2 ? Math.sign(ty - t.y) : Math.sign(f.y - t.y);
    cp2y = ty + (sign || 1) * dist;
  }

  return {cp1x, cp1y, cp2x, cp2y};
}

function mkPathD(e){
  const f=gN(e.from),t=gN(e.to);if(!f||!t)return'';
  const sh=e.shape||gls;
  const {fx, fy, tx, ty} = getEdgePts(e);
  
  if(sh==='straight' && e.cp1x == null)return`M${fx},${fy}L${tx},${ty}`;
  if(sh==='elbow'){
    const df = getEdgeDir(f, fx, fy, t);
    const dt = getEdgeDir(t, tx, ty, f);
    const bend = (typeof e.bend === 'number' && !isNaN(e.bend)) ? e.bend : 0.5;
    if (df === 'h' && dt === 'h') {
      const mx = fx + (tx - fx) * bend;
      return `M${fx},${fy}L${mx},${fy}L${mx},${ty}L${tx},${ty}`;
    } else if (df === 'v' && dt === 'v') {
      const my = fy + (ty - fy) * bend;
      return `M${fx},${fy}L${fx},${my}L${tx},${my}L${tx},${ty}`;
    } else if (df === 'h' && dt === 'v') {
      return `M${fx},${fy}L${tx},${fy}L${tx},${ty}`;
    } else { // v to h
      return `M${fx},${fy}L${fx},${ty}L${tx},${ty}`;
    }
  }
  const cp = getCP(e);
  const cp1x=cp.cp1x, cp1y=cp.cp1y, cp2x=cp.cp2x, cp2y=cp.cp2y;
  if (isNaN(cp1x) || isNaN(cp1y) || isNaN(cp2x) || isNaN(cp2y)) return `M${fx},${fy}L${tx},${ty}`;
  return`M${fx},${fy}C${cp1x},${cp1y} ${cp2x},${cp2y} ${tx},${ty}`;
}

/* ================================================================
   NODE BORDER GEOMETRY — bezier curve sampling for accurate positions
================================================================ */
const _mtx=(()=>{const c=document.createElement('canvas');return c.getContext('2d')})();

function nodeHalfExtents(nodeId){
  const n=gN(nodeId);if(!n)return{hw:55,hh:22};
  const isRoot=gPar(nodeId)==null;
  const fs=isRoot?15:14;
  const pv=isRoot?14:10,ph=isRoot?26:22;
  const minW=isRoot?0:88,maxW=isRoot?Infinity:210;
  _mtx.font=(isRoot?'600 ':'400 ')+fs+'px Inter,sans-serif';
  const tw=_mtx.measureText(n.label||'').width;
  const w=Math.max(minW,Math.min(maxW,tw+ph*2+3));
  const h=fs*1.45+pv*2+3;
  return{hw:w/2,hh:h/2};
}

// Evaluate cubic bezier at t
function edgePt(e, t) {
  const {fx, fy, tx, ty} = getEdgePts(e);
  const sh = e.shape || gls;
  // Bent straight lines have CPs set — treat as cubic bezier
  if (sh === 'straight' && e.cp1x == null) {
    return {x: fx + (tx - fx) * t, y: fy + (ty - fy) * t};
  }
  if (sh === 'elbow') {
    const f=gN(e.from), to=gN(e.to);
    const df = getEdgeDir(f, fx, fy, to);
    const dt = getEdgeDir(to, tx, ty, f);
    const bend = (typeof e.bend === 'number' && !isNaN(e.bend)) ? e.bend : 0.5;
    let pts = [{x:fx, y:fy}];
    if (df === 'h' && dt === 'h') {
      const mx = fx + (tx - fx) * bend;
      pts.push({x:mx, y:fy}, {x:mx, y:ty}, {x:tx, y:ty});
    } else if (df === 'v' && dt === 'v') {
      const my = fy + (ty - fy) * bend;
      pts.push({x:fx, y:my}, {x:tx, y:my}, {x:tx, y:ty});
    } else if (df === 'h' && dt === 'v') {
      pts.push({x:tx, y:fy}, {x:tx, y:ty});
    } else {
      pts.push({x:fx, y:ty}, {x:tx, y:ty});
    }
    let totalLen = 0;
    const segs = [];
    for (let i=0; i<pts.length-1; i++) {
      const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
      const len = Math.hypot(dx, dy);
      segs.push({len, dx, dy, p1: pts[i], p2: pts[i+1]});
      totalLen += len;
    }
    if (totalLen === 0) return {x:fx, y:fy};
    let targetLen = totalLen * t;
    for (let seg of segs) {
      if (targetLen <= seg.len + 0.001) {
        const ratio = seg.len === 0 ? 0 : targetLen / seg.len;
        return {x: seg.p1.x + seg.dx * ratio, y: seg.p1.y + seg.dy * ratio};
      }
      targetLen -= seg.len;
    }
    return {x:tx, y:ty};
  }
  const {cp1x, cp1y, cp2x, cp2y} = getCP(e);
  const mt=1-t;
  return{x:mt*mt*mt*fx+3*mt*mt*t*cp1x+3*mt*t*t*cp2x+t*t*t*tx,
         y:mt*mt*mt*fy+3*mt*mt*t*cp1y+3*mt*t*t*cp2y+t*t*t*ty};
}

// Tangent of cubic bezier at t (non-normalized)
function edgeTan(e, t) {
  const {fx, fy, tx, ty} = getEdgePts(e);
  const sh = e.shape || gls;
  // Bent straight lines have CPs set — treat as cubic bezier
  if (sh === 'straight' && e.cp1x == null) {
    return {x: tx - fx, y: ty - fy};
  }
  if (sh === 'elbow') {
    const f=gN(e.from), to=gN(e.to);
    const df = getEdgeDir(f, fx, fy, to);
    const dt = getEdgeDir(to, tx, ty, f);
    const bend = (typeof e.bend === 'number' && !isNaN(e.bend)) ? e.bend : 0.5;
    let pts = [{x:fx, y:fy}];
    if (df === 'h' && dt === 'h') {
      const mx = fx + (tx - fx) * bend;
      pts.push({x:mx, y:fy}, {x:mx, y:ty}, {x:tx, y:ty});
    } else if (df === 'v' && dt === 'v') {
      const my = fy + (ty - fy) * bend;
      pts.push({x:fx, y:my}, {x:tx, y:my}, {x:tx, y:ty});
    } else if (df === 'h' && dt === 'v') {
      pts.push({x:tx, y:fy}, {x:tx, y:ty});
    } else {
      pts.push({x:fx, y:ty}, {x:tx, y:ty});
    }
    let totalLen = 0;
    const segs = [];
    for (let i=0; i<pts.length-1; i++) {
      const dx = pts[i+1].x - pts[i].x, dy = pts[i+1].y - pts[i].y;
      const len = Math.hypot(dx, dy);
      segs.push({len, dx, dy, p1: pts[i], p2: pts[i+1]});
      totalLen += len;
    }
    if (totalLen === 0) return {x:1, y:0};
    let targetLen = totalLen * t;
    for (let seg of segs) {
      if (targetLen <= seg.len + 0.001) {
        return {x: seg.dx, y: seg.dy};
      }
      targetLen -= seg.len;
    }
    const last = segs[segs.length-1];
    if (!last) return {x: tx - fx, y: ty - fy};
    return {x: last.dx, y: last.dy};
  }
  const {cp1x, cp1y, cp2x, cp2y} = getCP(e);
  const mt=1-t;
  return{x:3*(mt*mt*(cp1x-fx)+2*mt*t*(cp2x-cp1x)+t*t*(tx-cp2x)),
         y:3*(mt*mt*(cp1y-fy)+2*mt*t*(cp2y-cp1y)+t*t*(ty-cp2y))};
}

// Find first point on bezier that exits fromNode's bounding box.
// Returns {x,y,nx,ny,ti} — position on curve, tangent direction, and t parameter.
function lineExitFrom(e){
  const f=gN(e.from),t=gN(e.to);
  if(!f||!t)return{x:f?f.x:0,y:f?f.y:0,nx:1,ny:0,ti:0};
  const {fx, fy, tx, ty} = getEdgePts(e);

  if(f.type==='group') {
    const tang=edgeTan(e, 0);
    const len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
    return {x:fx, y:fy, nx:tang.x/len, ny:tang.y/len, ti:0};
  }

  const{hw,hh}=nodeHalfExtents(e.from);
  const STEPS=160;
  for(let i=1;i<=STEPS;i++){
    const ti=i/STEPS;
    const p=edgePt(e, ti);
    if (isNaN(p.x) || isNaN(p.y)) continue;
    if(Math.abs(p.x-f.x)>hw||Math.abs(p.y-f.y)>hh){
      // Binary search refinement for sub-pixel accuracy
      let lo=(i-1)/STEPS, hi=ti;
      for(let r=0;r<8;r++){
        const mid=(lo+hi)/2;
        const mp=edgePt(e,mid);
        if(Math.abs(mp.x-f.x)>hw||Math.abs(mp.y-f.y)>hh) hi=mid; else lo=mid;
      }
      const refined=edgePt(e,hi);
      const tang=edgeTan(e, hi);
      const len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
      return{x:refined.x,y:refined.y,nx:tang.x/len,ny:tang.y/len,ti:hi};
    }
  }
  // fallback: straight line
  const dx=tx-fx,dy=ty-fy,len=Math.sqrt(dx*dx+dy*dy)||1;
  return{x:fx+dx/len*hw,y:fy+dy/len*hh,nx:dx/len,ny:dy/len,ti:0};
}

// Find last point on bezier that exits toNode's bounding box (= arrowhead position).
// Returns {x,y,nx,ny} — position and direction pointing INTO to-node.
function lineEntryTo(e){
  const f=gN(e.from),t=gN(e.to);
  if(!f||!t)return{x:t?t.x:0,y:t?t.y:0,nx:1,ny:0};
  const {fx, fy, tx, ty} = getEdgePts(e);

  if(t.type==='group'){
    const tang=edgeTan(e, 1);
    const len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
    return{x:tx,y:ty,nx:tang.x/len,ny:tang.y/len};
  }

  const{hw,hh}=nodeHalfExtents(e.to);
  const STEPS=160;
  for(let i=1;i<=STEPS;i++){
    const ti=1-i/STEPS;
    const p=edgePt(e, ti);
    if (isNaN(p.x) || isNaN(p.y)) continue;
    if(Math.abs(p.x-t.x)>hw||Math.abs(p.y-t.y)>hh){
      // Binary search refinement for sub-pixel accuracy
      let lo=ti, hi=1-(i-1)/STEPS;
      for(let r=0;r<8;r++){
        const mid=(lo+hi)/2;
        const mp=edgePt(e,mid);
        if(Math.abs(mp.x-t.x)>hw||Math.abs(mp.y-t.y)>hh) lo=mid; else hi=mid;
      }
      const refined=edgePt(e,lo);
      const tang=edgeTan(e, lo);
      const len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
      return{x:refined.x,y:refined.y,nx:tang.x/len,ny:tang.y/len};
    }
  }
  const dx=tx-fx,dy=ty-fy,len=Math.sqrt(dx*dx+dy*dy)||1;
  return{x:tx-dx/len*hw,y:ty-dy/len*hh,nx:dx/len,ny:dy/len};
}

// Find a point on the bezier that is ~dist canvas-units from exitPt (moving forward from ti0).
function bzAtDist(e,ti0,dist){
  const f=gN(e.from),t=gN(e.to);if(!f||!t)return null;
  const STEPS=80;
  let prev=edgePt(e, ti0);
  let cum=0;
  for(let i=Math.round(ti0*STEPS)+1;i<=STEPS;i++){
    const ti=i/STEPS;
    const p=edgePt(e, ti);
    cum+=Math.hypot(p.x-prev.x,p.y-prev.y);
    if(cum>=dist){
      const tang=edgeTan(e, ti);
      const len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
      return{x:p.x,y:p.y,nx:tang.x/len,ny:tang.y/len};
    }
    prev=p;
  }
  return null; // curve too short
}

// Draw single arrowhead tip at (x,y) pointing in (nx,ny)
function arrowTip(grp,x,y,nx,ny,clr){
  const px=-ny,py=nx,sz=8;
  const arr=mkSVG('polygon');
  arr.setAttribute('points',
    `${x},${y} ${x-nx*sz-px*sz*0.5},${y-ny*sz-py*sz*0.5} ${x-nx*sz+px*sz*0.5},${y-ny*sz+py*sz*0.5}`);
  arr.setAttribute('fill',clr);arr.setAttribute('stroke','none');
  arr.style.pointerEvents='none';grp.appendChild(arr);
}

function drawArrowheads(grp,e,clr){
  const dir=e.dir||'forward';
  if(dir==='forward'||dir==='both'){
    const{x,y,nx,ny}=lineEntryTo(e);arrowTip(grp,x,y,nx,ny,clr);
  }
  if(dir==='backward'||dir==='both'){
    const ex=lineExitFrom(e);arrowTip(grp,ex.x,ex.y,-ex.nx,-ex.ny,clr);
  }
}

// Collapse (−) button: placed ON the bezier curve, ~30px from the exit point
function addCollapseBtn(grp,ex,clr,e){
  const btnPt=bzAtDist(e,ex.ti,28)||{x:ex.x+ex.nx*28,y:ex.y+ex.ny*28,nx:ex.nx,ny:ex.ny};
  const bx=btnPt.x,by2=btnPt.y;
  const btnG=mkSVG('g');btnG.setAttribute('class','ecbtn');
  btnG.style.cursor='pointer';btnG.style.pointerEvents='all';
  const circ=mkSVG('circle');circ.setAttribute('cx',bx);circ.setAttribute('cy',by2);
  circ.setAttribute('r','9');circ.setAttribute('fill','#fff');
  circ.setAttribute('stroke',clr);circ.setAttribute('stroke-width','1.5');
  const txt=mkSVG('text');txt.setAttribute('x',bx);txt.setAttribute('y',by2);
  txt.setAttribute('text-anchor','middle');txt.setAttribute('dominant-baseline','central');
  txt.setAttribute('font-size','14');txt.setAttribute('fill',clr);
  txt.setAttribute('pointer-events','none');txt.textContent='−';
  const hitA=mkSVG('circle');hitA.setAttribute('cx',bx);hitA.setAttribute('cy',by2);
  hitA.setAttribute('r','10');hitA.setAttribute('fill','transparent');
  btnG.appendChild(hitA);btnG.appendChild(circ);btnG.appendChild(txt);
  btnG.addEventListener('mousedown',ev=>{ev.stopPropagation();ev.preventDefault()});
  btnG.addEventListener('click',ev=>{
    ev.stopPropagation();
    e.collapsed=true;
    // Deselect any node that is now hidden inside the collapsed branch
    if(selN!=null){let c=selN;for(let i=0;i<200;i++){if(c===e.to){selN=null;break;}const p=gPar(c);if(p==null)break;c=p;}}
    sh();render();
  });
  btnG.addEventListener('touchend',ev=>{
    ev.stopPropagation();ev.preventDefault();
    e.collapsed=true;
    if(selN!=null){let c=selN;for(let i=0;i<200;i++){if(c===e.to){selN=null;break;}const p=gPar(c);if(p==null)break;c=p;}}
    sh();render();
  });
  // Keep hovered class when mouse is over button (use parent group handlers if set)
  btnG.addEventListener('mouseenter',()=>{if(grp._showH)grp._showH();else grp.classList.add('hovered')});
  btnG.addEventListener('mouseleave',()=>{if(grp._hideH)grp._hideH();else grp.classList.remove('hovered')});
  grp.appendChild(btnG);
}

// Get branch number for an edge relative to its parent node (1-based, by edge creation order)
function branchNum(edgeId){
  const e=gE(edgeId);if(!e)return 1;
  const siblings=edges.filter(x=>x.from===e.from&&x.dash!=='link');
  const idx=siblings.findIndex(x=>x.id===edgeId);
  return idx>=0?idx+1:1;
}

// Expand circle: positioned same as collapse button would be.
// Shows a stub line to parent. On hover, previews the full collapsed branch.
function addExpandCircle(grp,ex,fromId,eid){
  const e=gE(eid);if(!e)return;
  const f=gN(fromId);if(!f)return;
  const clr=e.color||LCOLS[0];
  const num=branchNum(eid);
  // Same position as collapse button would be (28px along curve from exit)
  const btnPt=bzAtDist(e,ex.ti,28)||{x:ex.x+ex.nx*28,y:ex.y+ex.ny*28,nx:ex.nx,ny:ex.ny};
  const cx=btnPt.x,cy=btnPt.y;
  const r=11;

  // Stub line from exit point to button center
  const stub=mkSVG('line');
  stub.setAttribute('x1',ex.x);stub.setAttribute('y1',ex.y);
  stub.setAttribute('x2',cx);stub.setAttribute('y2',cy);
  stub.setAttribute('stroke',clr);stub.setAttribute('stroke-width','1.5');
  stub.setAttribute('stroke-dasharray','4,3');stub.style.pointerEvents='none';
  grp.appendChild(stub);

  const hitA=mkSVG('circle');
  hitA.setAttribute('cx',cx);hitA.setAttribute('cy',cy);
  hitA.setAttribute('r','18');hitA.setAttribute('fill','transparent');
  hitA.style.cursor='pointer';hitA.style.pointerEvents='all';
  const circ=mkSVG('circle');
  circ.setAttribute('cx',cx);circ.setAttribute('cy',cy);
  circ.setAttribute('r',String(r));circ.setAttribute('fill',clr);circ.setAttribute('stroke','none');
  circ.style.pointerEvents='none';
  const txt=mkSVG('text');
  txt.setAttribute('x',cx);txt.setAttribute('y',cy);
  txt.setAttribute('text-anchor','middle');txt.setAttribute('dominant-baseline','central');
  txt.setAttribute('font-size','10');txt.setAttribute('font-weight','600');
  txt.setAttribute('fill','#fff');txt.setAttribute('pointer-events','none');
  txt.textContent=String(num);

  const tog=ev=>{ev.stopPropagation();ev.preventDefault();e.collapsed=false;sh();render()};
  hitA.addEventListener('mousedown',ev=>ev.stopPropagation());
  hitA.addEventListener('click',tog);hitA.addEventListener('touchend',tog);

  // Hover: show ghost preview of collapsed branch
  let previewGrp=null;
  hitA.addEventListener('mouseenter',()=>{
    previewGrp=mkSVG('g');previewGrp.style.opacity='0.35';previewGrp.style.pointerEvents='none';
    e.collapsed=false;
    renderBranchPreview(e.to,previewGrp,{x:cx,y:cy},e);
    e.collapsed=true;
    svgl.insertBefore(previewGrp,glLink);
  });
  hitA.addEventListener('mouseleave',()=>{
    if(previewGrp){previewGrp.remove();previewGrp=null;}
  });

  grp.appendChild(hitA);grp.appendChild(circ);grp.appendChild(txt);
}

// Render a ghost preview of a branch into an SVG group (no interaction, just visual)
// Draws the root node of the branch plus all descendants
function renderBranchPreview(rootId,g,fromPt,initialEdge){
  const rootN=gN(rootId);
  const lineElems=[];  // collect lines
  const nodeElems=[];  // collect node boxes + labels
  const previewNodeIds = new Set();

  // Stub line from button to root node
  if(fromPt&&rootN){
    const d=initialEdge?mkPathD(initialEdge):`M${fromPt.x},${fromPt.y}L${rootN.x},${rootN.y}`;
    const stub=mkSVG('path');
    stub.setAttribute('d',d);
    stub.setAttribute('fill', 'none');
    stub.setAttribute('stroke', (initialEdge&&initialEdge.color)||LCOLS[0]);
    stub.setAttribute('stroke-width','1.5');
    stub.style.pointerEvents='none';lineElems.push(stub);
  }

  // Root node box + label
  if(rootN){
    previewNodeIds.add(rootId);
    const{hw,hh}=nodeHalfExtents(rootId);
    const rect=mkSVG('rect');
    rect.setAttribute('x',rootN.x-hw);rect.setAttribute('y',rootN.y-hh);
    rect.setAttribute('width',hw*2);rect.setAttribute('height',hh*2);
    rect.setAttribute('rx',hh);rect.setAttribute('ry',hh);
    rect.setAttribute('fill','#fff');rect.setAttribute('stroke','#d8d4ce');rect.setAttribute('stroke-width','1.5');
    const label=mkSVG('text');
    label.setAttribute('x',rootN.x);label.setAttribute('y',rootN.y);
    label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');
    label.setAttribute('font-size','13');label.setAttribute('fill','#2c2a27');label.style.pointerEvents='none';
    label.textContent=rootN.label||'';
    nodeElems.push(rect,label);
  }

  function collectNode(id){
    gCh(id).forEach(cid=>{
      const par=gN(id),chi=gN(cid);if(!par||!chi)return;
      previewNodeIds.add(cid);
      const pe=edges.find(x=>x.from===id&&x.to===cid);
      const clr=(pe&&pe.color)||LCOLS[0];
      const d=pe?mkPathD(pe):`M${par.x},${par.y}L${chi.x},${chi.y}`;
      const line=mkSVG('path');line.setAttribute('d',d);line.setAttribute('fill','none');
      line.setAttribute('stroke',clr);line.setAttribute('stroke-width','1.5');line.style.pointerEvents='none';
      lineElems.push(line);
      const{hw,hh}=nodeHalfExtents(cid);
      const rect=mkSVG('rect');
      rect.setAttribute('x',chi.x-hw);rect.setAttribute('y',chi.y-hh);
      rect.setAttribute('width',hw*2);rect.setAttribute('height',hh*2);
      rect.setAttribute('rx',hh);rect.setAttribute('ry',hh);
      rect.setAttribute('fill','#fff');rect.setAttribute('stroke','#d8d4ce');rect.setAttribute('stroke-width','1.5');
      const label=mkSVG('text');
      label.setAttribute('x',chi.x);label.setAttribute('y',chi.y);
      label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');
      label.setAttribute('font-size','13');label.setAttribute('fill','#2c2a27');label.style.pointerEvents='none';
      label.textContent=chi.label||'';
      nodeElems.push(rect,label);
      collectNode(cid);
    });
  }
  collectNode(rootId);

  const groupElems = [];
  nodes.filter(n => n.type === 'group').forEach(gr => {
    const hasAnyInPreview = Array.from(previewNodeIds).some(nid => {
      const n = gN(nid);
      return n.x >= gr.x - gr.width/2 && n.x <= gr.x + gr.width/2 && 
             n.y >= gr.y - gr.height/2 && n.y <= gr.y + gr.height/2;
    });
    if(hasAnyInPreview) {
      const rect = mkSVG('rect');
      rect.setAttribute('x', gr.x - gr.width/2);
      rect.setAttribute('y', gr.y - gr.height/2);
      rect.setAttribute('width', gr.width);
      rect.setAttribute('height', gr.height);
      rect.setAttribute('fill', 'rgba(200,200,200,0.1)');
      rect.setAttribute('stroke', '#aaa');
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('stroke-dasharray', '5,5');
      groupElems.push(rect);
    }
  });

  // Order: Groups -> Lines -> Nodes
  groupElems.forEach(el=>g.appendChild(el));
  lineElems.forEach(el=>g.appendChild(el));
  nodeElems.forEach(el=>g.appendChild(el));
}

function mkSVG(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag)}

let isRendering = false;
function render(){
  if(isRendering) return;
  isRendering = true;
  try {
    canvas.querySelectorAll('.node').forEach(el=>el.remove());
    canvas.querySelectorAll('.group-box').forEach(el=>el.remove());
    Array.from(svgl.children).forEach(el=>{if(el.id!=='ghost-ln'&&el.id!=='ghost-hd')el.remove()});
    svgl.setAttribute('viewBox',`0 0 ${CS} ${CS}`);svgl.setAttribute('width',CS);svgl.setAttribute('height',CS);

  // Edges first — SVG renders behind node divs
  edges.forEach(e=>{
    const f=gN(e.from),t=gN(e.to);
    if(!f||!t||!isVisible(e.from))return;
    // Skip edges whose TO node is invisible due to an ancestor being collapsed
    // (but NOT if this specific edge is the collapsed one — we still need it for the expand circle)
    if(!isVisible(e.to)&&!e.collapsed)return;
    const isSel=e.id===selE;
    const clr=isSel?'#4a7cf7':(e.color||LCOLS[0]);
    const grp=mkSVG('g');
    // child-sel: show collapse btn when child node is selected (but not when line itself is selected)
    const childSelected=selN===e.to;
    grp.setAttribute('class','edge-group'+(isSel?' sel-group':'')+(childSelected?' child-sel':''));
    grp.dataset.eid=e.id;
    if(!e.collapsed){
      // Draw line + arrowheads + handles normally
      const d=mkPathD(e);
      const hit=mkSVG('path');hit.setAttribute('d',d);hit.setAttribute('class','ehit');
      hit.dataset.eid=e.id;grp.appendChild(hit);
      const ep=mkSVG('path');ep.setAttribute('d',d);
      ep.setAttribute('class','ep '+(e.dash==='link'?'link':(e.dash||'solid'))+(isSel?' sel-e':''));
      ep.setAttribute('stroke',clr);ep.setAttribute('stroke-width',isSel?Math.max(e.width||1.5,2):(e.width||1.5));
      ep.setAttribute('fill','none');grp.appendChild(ep);
      if(e.dash!=='link') drawArrowheads(grp,e,clr);
      if(e.label){
        const mid=edgePt(e,0.5);
        const fo=mkSVG('foreignObject');
        fo.setAttribute('x',mid.x-70);fo.setAttribute('y',mid.y-100);
        fo.setAttribute('width',140);fo.setAttribute('height',200);
        fo.setAttribute('style','overflow:visible;pointer-events:none');
        const div=document.createElement('div');
        div.className='edge-label-v3';
        const span=document.createElement('span');span.textContent=e.label;
        div.appendChild(span);fo.appendChild(div);grp.appendChild(fo);
      }
      if(isSel&&selEHandles){
        const sh = e.shape || gls;
        if (sh === 'bezier' || sh === 'straight') {
          const cp = getCP(e);
          const cp1x=cp.cp1x, cp1y=cp.cp1y, cp2x=cp.cp2x, cp2y=cp.cp2y;
          const {fx, fy, tx, ty} = getEdgePts(e);
          const arm=(x1,y1,x2,y2)=>{const a=mkSVG('line');a.setAttribute('class','bz-arm');a.setAttribute('x1',x1);a.setAttribute('y1',y1);a.setAttribute('x2',x2);a.setAttribute('y2',y2);return a};
          grp.appendChild(arm(fx,fy,cp1x,cp1y));grp.appendChild(arm(tx,ty,cp2x,cp2y));
          [[cp1x,cp1y,'1'],[cp2x,cp2y,'2']].forEach(([cx,cy,cp])=>{
            const h=mkSVG('circle');h.setAttribute('class','bz-handle');h.setAttribute('r','8');
            h.setAttribute('cx',cx);h.setAttribute('cy',cy);h.dataset.eid=e.id;h.dataset.cp=cp;grp.appendChild(h);
          });
        }
      }
      // Hover helpers (delayed removal so endpoints/btns stay clickable)
      let hoverTid=null;
      const showH=()=>{clearTimeout(hoverTid); grp.classList.add('hovered')};
      const hideH=()=>{hoverTid=setTimeout(()=> grp.classList.remove('hovered'),200)};
      grp._showH=showH; grp._hideH=hideH;

      if(!isSel){
        hit.addEventListener('mouseenter',showH);
        hit.addEventListener('mouseleave',hideH);
        // Endpoint grab circles — only when NOT selected
        const exitPt = lineExitFrom(e);
        const entryPt = lineEntryTo(e);
        const EP_R = 6, EP_OFF = 8;
        const epPositions = [
          ['from', exitPt.x + exitPt.nx * EP_OFF, exitPt.y + exitPt.ny * EP_OFF],
          ['to',   entryPt.x - entryPt.nx * EP_OFF, entryPt.y - entryPt.ny * EP_OFF]
        ];
        epPositions.forEach(([which, cx, cy]) => {
          const epc = mkSVG('circle'); epc.setAttribute('class', 'edge-endpoint');
          epc.setAttribute('cx', cx); epc.setAttribute('cy', cy); epc.setAttribute('r', String(EP_R));
          epc.dataset.eid = e.id; epc.dataset.which = which;
          epc.addEventListener('mouseenter', showH);
          epc.addEventListener('mouseleave', hideH);
          grp.appendChild(epc);
        });
      }
    }
    if(true){
      const ex=lineExitFrom(e);
      if(e.collapsed){
        addExpandCircle(grp,ex,e.from,e.id);
      } else {
        const sh = e.shape || gls;
        // Show collapse button if NOT selected OR if it's an elbow line
        if(!isSel || sh === 'elbow') {
          addCollapseBtn(grp,ex,clr,e);
        }
      }
    }
    svgl.insertBefore(grp,glLink);
  });

  // Groups on bottom
  nodes.filter(n=>n.type==='group' && isVisible(n.id)).forEach(n=>{
    const div=document.createElement('div');
    div.className='group-box'+(n.id===selN||selNSet.has(n.id)?' selected':'');
    div.id='nd'+n.id;
    
    div.style.left=n.x+'px';div.style.top=n.y+'px';
    div.style.width=n.width+'px';div.style.height=n.height+'px';
    
    const bgBase=document.createElement('div'); bgBase.id='g-bg-base-'+n.id; bgBase.className='g-bg-layer';
    const bgImg=document.createElement('div'); bgImg.id='g-bg-img-'+n.id; bgImg.className='g-bg-layer';
    const bgPat=document.createElement('div'); bgPat.id='g-bg-pat-'+n.id; bgPat.className='g-bg-layer';
    div.appendChild(bgBase); div.appendChild(bgImg); div.appendChild(bgPat);
    
    const title=document.createElement('div');
    title.className='group-title';
    title.textContent=n.label;
    title.addEventListener('mousedown',ev=>{
      if(ev.button!==0 && ev.button!==1) return;
      ev.stopPropagation(); onNodeMD(ev,n.id);
    });
    title.addEventListener('touchstart',ev=>{ev.stopPropagation();onNdTS(ev,n.id)},{passive:false});
    title.addEventListener('touchmove',ev=>{onNdTM(ev,n.id)},{passive:false});
    title.addEventListener('touchend',ev=>{onNdTE(ev,n.id)});
    title.addEventListener('dblclick',ev=>{ev.stopPropagation();editNode(n.id,true)});
    title.addEventListener('contextmenu',ev=>{
      ev.preventDefault();ev.stopPropagation();
      showGroupCtx(ev.clientX,ev.clientY,n.id);
    });
    // Sensors for border hover (+ buttons)
    ['top','bottom','left','right'].forEach(pos => {
      const sensor = document.createElement('div');
      sensor.className = 'group-frame-sensor ' + pos;
      sensor.addEventListener('mouseenter',()=>div.classList.add('hovered'));
      sensor.addEventListener('mouseleave',()=>div.classList.remove('hovered'));
      div.appendChild(sensor);
    });

    // Show plus buttons on hover via title too
    title.addEventListener('mouseenter',()=>div.classList.add('hovered'));
    title.addEventListener('mouseleave',()=>div.classList.remove('hovered'));
    
    const resizer=document.createElement('div');
    resizer.className='group-resizer';
    resizer.addEventListener('mousedown',ev=>{ev.stopPropagation();startGroupResize(ev,n.id)});
    resizer.addEventListener('touchstart',ev=>{ev.stopPropagation();startGroupResize(ev,n.id)},{passive:false});
    
    div.appendChild(title);
    div.appendChild(resizer);
    
    div.addEventListener('contextmenu',ev=>{
      ev.preventDefault();ev.stopPropagation();
      showGroupBgCtx(ev.clientX,ev.clientY,n.id);
    });
    
    ['top','bottom','left','right'].forEach(pos=>{
      const np=document.createElement('div');np.className='np group-np '+pos;np.textContent='+';
      np.addEventListener('mouseenter',()=>div.classList.add('hovered'));
      np.addEventListener('mouseleave',()=>div.classList.remove('hovered'));
      np.addEventListener('mousedown',ev=>{ev.stopPropagation();startPlusDrag(ev,n.id,pos,np,pos)});
      div.appendChild(np);
    });

    canvas.appendChild(div);
    applyBg(n.id);
  });

  // Nodes on top — DOM divs paint over SVG
  nodes.filter(n=>n.type!=='group' && isVisible(n.id)).forEach(n=>{
    const isRoot=n.type==='root';
    const isNote=n.type==='note';
    const div=document.createElement('div');
    div.className='node'+(n.id===selN||selNSet.has(n.id)?' selected':'')+(isRoot?' is-root':'')+(n.note?' has-note':'')+(n.id===branchViewId?' branch-root':'')+(isNote?' type-note':'');
    div.id='nd'+n.id;div.style.left=n.x+'px';div.style.top=n.y+'px';
    div.setAttribute('draggable', 'false');
    div.ondragstart = () => false;
    const ni=document.createElement('div');ni.className='ni';
    ni.setAttribute('draggable', 'false');
    ni.ondragstart = () => false;
    const ndot = document.createElement('div');
    ndot.className = 'note-dot';
    ndot.setAttribute('draggable', 'false');
    ndot.ondragstart = () => false;
    ni.appendChild(ndot);
    if(n.locked) {
      const lck = document.createElement('div');
      lck.className = 'node-lock';
      lck.setAttribute('draggable', 'false');
      lck.ondragstart = () => false;
      lck.textContent = '🔒';
      ni.appendChild(lck);
    }
    const sp=document.createElement('span');
    sp.setAttribute('draggable', 'false');
    sp.ondragstart = () => false;
    sp.textContent=n.label||(n.id===selN?'':'+');
    if(!n.label)sp.style.color='var(--mu)';
    if(!isMob()){sp.style.cursor='text';sp.addEventListener('click',ev=>{ev.stopPropagation();editNode(n.id)})}
    ni.appendChild(sp);
    // Cardinal plus buttons on node edges, shown on hover
    ['e','w','n','s'].forEach(dir=>{
      const np=document.createElement('div');np.className='np '+dir+' smart-side';
      np.setAttribute('draggable', 'false');
      np.ondragstart = () => false;
      np.textContent='+';np.addEventListener('mousedown',ev=>{ev.stopPropagation();startPlusDrag(ev,n.id,dir,np,dir)});
      ni.appendChild(np);
    });
    // Mobile: touch-specific plus buttons
    if(isMob()){
      const npC=document.createElement('div');npC.className='np center';npC.textContent='+';
      npC.setAttribute('draggable', 'false');
      npC.ondragstart = () => false;
      npC.addEventListener('touchend',ev=>{ev.stopPropagation();ev.preventDefault();addChild(n.id)});
      ni.appendChild(npC);
      ['touch-l','touch-r'].forEach(cls=>{
        const np=document.createElement('div');np.className='np '+cls;np.textContent='+';
        np.setAttribute('draggable', 'false');
        np.ondragstart = () => false;
        np.addEventListener('touchstart',ev=>{ev.stopPropagation();startPlusTouchDrag(ev,n.id)},{passive:false});
        ni.appendChild(np);
      });
    }
    div.appendChild(ni);
    div.addEventListener('mousedown',ev=>{if(ev.button!==0 && ev.button!==1)return;ev.stopPropagation();onNodeMD(ev,n.id)});
    div.addEventListener('contextmenu',ev=>{
      ev.preventDefault();ev.stopPropagation();
      if(selNSet.has(n.id) && selNSet.size > 1) {
        showMultiCtx(ev.clientX, ev.clientY);
      } else {
        showNodeCtx(ev.clientX,ev.clientY,n.id);
      }
    });
    div.addEventListener('touchstart',ev=>onNdTS(ev,n.id),{passive:false});
    div.addEventListener('touchmove',ev=>onNdTM(ev,n.id),{passive:false});
    div.addEventListener('touchend',ev=>onNdTE(ev,n.id),{passive:false});
    canvas.appendChild(div);
  });

  applyT();
  renderMinimap();
  saveToLocalStorage();
  } finally {
    isRendering = false;
  }
}

function renderEdgesOnly(){
  Array.from(svgl.children).forEach(el=>{if(el.id!=='ghost-ln'&&el.id!=='ghost-hd')el.remove()});
  svgl.setAttribute('viewBox',`0 0 ${CS} ${CS}`);
  edges.forEach(e=>{
    const f=gN(e.from),t=gN(e.to);
    if(!f||!t||!isVisible(e.from))return;
    if(!isVisible(e.to)&&!e.collapsed)return;
    const isSel=e.id===selE;const clr=isSel?'#4a7cf7':(e.color||LCOLS[0]);
    const grp=mkSVG('g');grp.setAttribute('class','edge-group'+(isSel?' sel-group':''));grp.dataset.eid=e.id;
    if(!e.collapsed){
      const d=mkPathD(e);
      const hit=mkSVG('path');hit.setAttribute('d',d);hit.setAttribute('class','ehit');hit.dataset.eid=e.id;grp.appendChild(hit);
      const ep=mkSVG('path');ep.setAttribute('d',d);
      ep.setAttribute('class','ep '+(e.dash==='link'?'link':(e.dash||'solid'))+(isSel?' sel-e':''));
      ep.setAttribute('stroke',clr);ep.setAttribute('stroke-width',isSel?Math.max(e.width||1.5,2):(e.width||1.5));ep.setAttribute('fill','none');grp.appendChild(ep);
      if(e.dash!=='link') drawArrowheads(grp,e,clr);
      if(e.label){
        const mid=edgePt(e,0.5);
        const fo=mkSVG('foreignObject');
        fo.setAttribute('x',mid.x-70);fo.setAttribute('y',mid.y-100);
        fo.setAttribute('width',140);fo.setAttribute('height',200);
        fo.setAttribute('style','overflow:visible;pointer-events:none');
        const div=document.createElement('div');
        div.className='edge-label-v3';
        const span=document.createElement('span');span.textContent=e.label;
        div.appendChild(span);fo.appendChild(div);grp.appendChild(fo);
      }

      // Hover helpers
      let hoverTid=null;
      const showH=()=>{clearTimeout(hoverTid); grp.classList.add('hovered')};
      const hideH=()=>{hoverTid=setTimeout(()=> grp.classList.remove('hovered'),200)};
      grp._showH=showH; grp._hideH=hideH;

      if(isSel&&selEHandles){
        const sh = e.shape || gls;
        if (sh === 'bezier' || sh === 'straight') {
          const cp = getCP(e);
          const cp1x=cp.cp1x, cp1y=cp.cp1y, cp2x=cp.cp2x, cp2y=cp.cp2y;
          const {fx, fy, tx, ty} = getEdgePts(e);
          [[fx,fy,cp1x,cp1y],[tx,ty,cp2x,cp2y]].forEach(([x1,y1,x2,y2])=>{const a=mkSVG('line');a.setAttribute('class','bz-arm');a.setAttribute('x1',x1);a.setAttribute('y1',y1);a.setAttribute('x2',x2);a.setAttribute('y2',y2);grp.appendChild(a)});
          [[cp1x,cp1y,'1'],[cp2x,cp2y,'2']].forEach(([cx,cy,cp])=>{const h=mkSVG('circle');h.setAttribute('class','bz-handle');h.setAttribute('r','8');h.setAttribute('cx',cx);h.setAttribute('cy',cy);h.dataset.eid=e.id;h.dataset.cp=cp;grp.appendChild(h)});
        }
      }

      if(!isSel){
        hit.addEventListener('mouseenter',showH);
        hit.addEventListener('mouseleave',hideH);
        // Endpoint grab circles — only when NOT selected
        const exitPt2 = lineExitFrom(e);
        const entryPt2 = lineEntryTo(e);
        const EP_R2 = 6, EP_OFF2 = 8;
        const epPos2 = [
          ['from', exitPt2.x + exitPt2.nx * EP_OFF2, exitPt2.y + exitPt2.ny * EP_OFF2],
          ['to',   entryPt2.x - entryPt2.nx * EP_OFF2, entryPt2.y - entryPt2.ny * EP_OFF2]
        ];
        epPos2.forEach(([which, cx, cy]) => {
          const epc = mkSVG('circle'); epc.setAttribute('class', 'edge-endpoint');
          epc.setAttribute('cx', cx); epc.setAttribute('cy', cy); epc.setAttribute('r', String(EP_R2));
          epc.dataset.eid = e.id; epc.dataset.which = which;
          epc.addEventListener('mouseenter', showH);
          epc.addEventListener('mouseleave', hideH);
          grp.appendChild(epc);
        });
      }
    }
    // Collapse/expand buttons update with curve
    if(true){
      const sh = e.shape || gls;
      if(!e.collapsed && (!isSel || sh === 'elbow')){
        const ex=lineExitFrom(e);
        addCollapseBtn(grp,ex,clr,e);
      }
      else if(e.collapsed){const ex=lineExitFrom(e);addExpandCircle(grp,ex,e.from,e.id);}
    }
    svgl.insertBefore(grp,glLink);
  });
}

function applyT(){canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;canvas.style.transformOrigin='0 0'}

