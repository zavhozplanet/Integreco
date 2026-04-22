// @ts-nocheck
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

function isPtInStad(px, py, nx, ny, hw, hh, isGroup, style) {
  const dx = Math.abs(px - nx), dy = Math.abs(py - ny);
  if (isGroup) return dx <= hw && dy <= hh;
  const shape = style && style.shape ? style.shape : 'pill';
  if (shape === 'rect') return dx <= hw && dy <= hh;
  if (shape === 'round') {
    const r = 8;
    if (dx <= hw - r || dy <= hh - r) return dx <= hw && dy <= hh;
    const cdx = dx - (hw - r), cdy = dy - (hh - r);
    return (cdx * cdx + cdy * cdy <= r * r + 0.1);
  }
  const rad = Math.min(hw, hh);
  if (dx <= hw - rad || dy <= hh - rad) return dx <= hw && dy <= hh;
  const cdx = dx - (hw - rad), cdy = dy - (hh - rad);
  return (cdx * cdx + cdy * cdy <= rad * rad + 0.1); // Small epsilon
}

function isPointInNode(id, px, py) {
  const n = gN(id);
  if (!n) return false;
  const {hw, hh} = nodeHalfExtents(id);
  return isPtInStad(px, py, n.x, n.y, hw, hh, n.type === 'group' || n.type === 'multi', n.style);
}

function getSnapPoint(n, target, edge, side) {
  if (!n) return {x: 0, y: 0};
  const type = (n.type === 'root' || n.type === 'node') ? 'node' : n.type;

  const isFixed = edge && edge[side + 'Fixed'] === true;
  const isForceUnfixed = edge && edge[side + 'Fixed'] === false;

  // 1. Explicitly FIXED (either via button or drag)
  if (isFixed) {
    if (edge[side + 'Side']) {
      return _getSidePoint(n, edge, side, edge[side + 'Side']);
    }
    const computed = _computeBestSide(n, target, edge, side);
    edge[side + 'Side'] = computed.s;
    if (computed.offset != null) edge[side + 'Offset'] = computed.offset;
    return computed.pt;
  }

  // 2. Explicitly UNFIXED (override global setting if any)
  if (isForceUnfixed) {
    // Make sure we evaluate multi correctly (it has its own native offset logic, but normally we just return cardinal center if unfixed here)
    if (n.type === 'group') return groupSnapPoint(n, target);
    if (n.type === 'multi') return _computeBestSide(n, target, edge, side).pt;
    return {x: n.x, y: n.y};
  }

  // ── MULTI nodes always use side+offset anchoring ─────────────
  if (n.type === 'multi') {
    if (!snapSettings[type] && !snapSettings.multiAdaptive) {
      // no snap at all for multi → still use side/offset path below
    }
    const isAdaptive = !!snapSettings.multiAdaptive;
    if (!isAdaptive && edge && edge[side + 'Side']) {
      return _getSidePoint(n, edge, side, edge[side + 'Side']);
    }
    const computed = _computeBestSide(n, target, edge, side);
    if (edge) {
      edge[side + 'Side'] = computed.s;
      if (computed.offset != null) edge[side + 'Offset'] = computed.offset;
    }
    return computed.pt;
  }

  // ── Groups without fixation: use cardinal snap ────────────────
  if (n.type === 'group') {
    if (!snapSettings.group) return groupSnapPoint(n, target);
    const isAdaptive = !!snapSettings.groupAdaptive;
    if (!isAdaptive && edge && edge[side + 'Side']) {
      return _getSidePoint(n, edge, side, edge[side + 'Side']);
    }
    const computed = _computeBestSide(n, target, edge, side);
    if (!isAdaptive && edge) { edge[side + 'Side'] = computed.s; }
    return computed.pt;
  }

  // ── Regular nodes (node/root/note) ────────────────────────────
  if (!snapSettings[type]) return {x: n.x, y: n.y};
  const isAdaptive = !!snapSettings[type + 'Adaptive'];
  if (!isAdaptive && edge && edge[side + 'Side']) {
    return _getSidePoint(n, edge, side, edge[side + 'Side']);
  }
  const computed = _computeBestSide(n, target, edge, side);
  if (!isAdaptive && edge) edge[side + 'Side'] = computed.s;
  return computed.pt;
}

// Helper: get the point on node side, respecting offset for multi/group-fixed
function _getSidePoint(n, edge, side, s) {
  let hw, hh;
  if (n.type === 'group' || n.type === 'multi') {
    hw = (n.width || 300) / 2;
    hh = (n.height || 200) / 2;
  } else {
    const ext = nodeHalfExtents(n.id);
    hw = ext.hw; hh = ext.hh;
  }
  // offset only used for multi and group-fixed
  let ox = 0, oy = 0;
  if (edge && edge[side + 'Offset'] != null) {
    const isH = s === 't' || s === 'b';
    if (isH) ox = edge[side + 'Offset'];
    else     oy = edge[side + 'Offset'];
  }
  if (s === 'l') return { x: n.x - hw - 1, y: n.y + oy };
  if (s === 'r') return { x: n.x + hw + 1, y: n.y + oy };
  if (s === 't') return { x: n.x + ox, y: n.y - hh - 1 };
  if (s === 'b') return { x: n.x + ox, y: n.y + hh + 1 };
  return { x: n.x, y: n.y };
}

// Helper: compute the best side (and offset for multi/group) from target direction
function _computeBestSide(n, target, edge, side) {
  let hw, hh;
  if (n.type === 'group' || n.type === 'multi') {
    hw = (n.width || 300) / 2;
    hh = (n.height || 200) / 2;
  } else {
    const ext = nodeHalfExtents(n.id);
    hw = ext.hw; hh = ext.hh;
  }
  const dx = target.x - n.x, dy = target.y - n.y;
  let s;
  if (Math.abs(dx / (hw || 1)) > Math.abs(dy / (hh || 1))) {
    s = dx > 0 ? 'r' : 'l';
  } else {
    s = dy > 0 ? 'b' : 't';
  }

  // For multi AND group-fixed: compute exact offset within the side
  let offset = null;
  if (n.type === 'multi' || (n.type === 'group' && edge && edge[side + 'Fixed'])) {
    const isH = s === 't' || s === 'b';
    const maxO = (isH ? hw : hh) - 8;
    if (isH) offset = Math.max(-maxO, Math.min(maxO, dx));
    else     offset = Math.max(-maxO, Math.min(maxO, dy));
    // For multi: save into edge if non-adaptive (done by caller for multi, here do it for group-fixed)
    if (n.type === 'group' && edge && edge[side + 'Fixed']) {
      edge[side + 'Offset'] = offset;
    }
  }

  const pt = _getSidePoint(n, edge && { ...edge, [side + 'Offset']: offset }, side, s);
  return { s, offset, pt };
}

function getEdgePts(e) {
  const f=gN(e.from), t=gN(e.to);
  if(!f||!t) return {fx:0,fy:0,tx:0,ty:0};
  const fp = getSnapPoint(f, t, e, 'from');
  const tp = getSnapPoint(t, f, e, 'to');
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
  if(n.type === 'group' || n.type === 'multi') return {hw: (n.width||300)/2, hh: (n.height||200)/2};

  const isRoot=gPar(nodeId)==null;
  const fs=n.style && n.style.fontSize ? n.style.fontSize : (isRoot?15:14);
  const ff = n.style && n.style.fontFamily ? n.style.fontFamily : 'Inter,sans-serif';
  const fw = (n.style && n.style.fontWeight === 'bold') ? 'bold ' : (isRoot ? '600 ' : '400 ');
  const fst = (n.style && n.style.fontStyle === 'italic') ? 'italic ' : '';
  
  const pv=n.style && n.style.padding != null ? n.style.padding : (isRoot?14:10);
  const ph=n.style && n.style.padding != null ? n.style.padding * 2.2 : (isRoot?26:22);
  const minW=isRoot?0:88,maxW=isRoot?Infinity:210;
  _mtx.font=fst+fw+fs+'px '+ff;
  const tw=_mtx.measureText(stripMd(n.label||'')).width;
  const w=Math.max(minW,Math.min(maxW,tw+ph*2));
  const h=fs*1.45+pv*2;
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
  const STEPS=120;
  for(let i=1;i<=STEPS;i++){
    const ti=i/STEPS;
    const p=edgePt(e, ti);
    if (isNaN(p.x) || isNaN(p.y)) continue;
    
    const inNode = isPtInStad(p.x, p.y, f.x, f.y, hw, hh, f.type==='group', f.style);

    if(!inNode){
      let lo=(i-1)/STEPS, hi=ti;
      for(let r=0;r<10;r++){
        const mid=(lo+hi)/2, mp=edgePt(e,mid);
        if(isPtInStad(mp.x, mp.y, f.x, f.y, hw, hh, f.type==='group', f.style)) lo=mid; else hi=mid;
      }
      const refined=edgePt(e,hi), tang=edgeTan(e, hi), len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
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

  const {hw, hh} = nodeHalfExtents(e.to);
  const STEPS = 120;
  for(let i=STEPS-1; i>=0; i--){
    const ti=i/STEPS;
    const p=edgePt(e, ti);
    if (isNaN(p.x) || isNaN(p.y)) continue;
    
    const inNode = isPtInStad(p.x, p.y, t.x, t.y, hw, hh, t.type==='group', t.style);

    if(!inNode){
      let lo=ti, hi=(i+1)/STEPS;
      for(let r=0; r<10; r++){
        const mid=(lo+hi)/2, mp=edgePt(e,mid);
        if(isPtInStad(mp.x, mp.y, t.x, t.y, hw, hh, t.type==='group', t.style)) hi=mid; else lo=mid;
      }
      const refined=edgePt(e,hi), tang=edgeTan(e, hi), len=Math.sqrt(tang.x*tang.x+tang.y*tang.y)||1;
      return{x:refined.x,y:refined.y,nx:tang.x/len,ny:tang.y/len,ti:hi};
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
function addExpandCircle(grp,ex,fromId,eid, isGroupCollapseOverride){
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

  const tog=ev=>{
    ev.stopPropagation();ev.preventDefault();
    if (isGroupCollapseOverride) {
       const tN = gN(e.to); 
       if (tN && tN.type === 'group') {
           const btn = document.getElementById('ghide-' + tN.id);
           if (btn) {
              btn.style.setProperty('color', '#ffb03a', 'important');
              btn.style.transform = 'scale(1.2)';
              setTimeout(() => {
                 btn.style.color = '';
                 btn.style.transform = '';
              }, 2000);
           }
       }
    } else {
       e.collapsed=false;sh();render();
    }
  };
  hitA.addEventListener('mousedown',ev=>ev.stopPropagation());
  hitA.addEventListener('click',tog);hitA.addEventListener('touchend',tog);

  // Hover: show ghost preview of collapsed branch
  let previewGrp=null;
  hitA.addEventListener('mouseenter',()=>{
    previewGrp=mkSVG('g');previewGrp.style.opacity='0.35';previewGrp.style.pointerEvents='none';
    if (isGroupCollapseOverride) {
        renderGroupConnectionsPreview(e.to, previewGrp, e.id);
        const tN = gN(e.to);
        if (tN) {
           const sketch = document.getElementById('gsketch-' + tN.id);
           if (sketch) sketch.classList.add('active');
        }
    } else {
        const isLink = e.isLink || e.dash === 'link';
        const hidden = !isVisible(e.from) || !isVisible(e.to);
        const collapsed = isCollapsedNode(e.from) || isCollapsedNode(e.to);

        if (isLink && (hidden || collapsed)) {
          // Do nothing
        } else {
          const origCol = e.collapsed;
          try {
            e.collapsed=false;
            renderBranchPreview(e.to,previewGrp,{x:cx,y:cy},e);
          } finally {
            e.collapsed=origCol;
          }
        }
    }
    svgl.insertBefore(previewGrp,glLink);
  });
  hitA.addEventListener('mouseleave',()=>{
    if(previewGrp){previewGrp.remove();previewGrp=null;}
    if (isGroupCollapseOverride) {
        const tN = gN(e.to);
        if (tN) {
           const sketch = document.getElementById('gsketch-' + tN.id);
           if (sketch) sketch.classList.remove('active');
        }
    }
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

  function applyNodeStyle(n, rect, label) {
    const isRoot = !gPar(n.id);
    const isNote = n.type === 'note';
    const isGroup = n.type === 'group';
    const isMulti = n.type === 'multi';
    const st = n.style || {};

    // Shape
    const {hw, hh} = nodeHalfExtents(n.id);
    let rx = hh, ry = hh; // pill default
    if (isGroup) { rx = 12; ry = 12; }
    else if (isMulti) { rx = 8; ry = 8; }
    else if (st.shape === 'round') { rx = 8; ry = 8; }
    else if (st.shape === 'rect') { rx = 0; ry = 0; }
    rect.setAttribute('rx', String(rx)); rect.setAttribute('ry', String(ry));

    // Colors
    let bg = isRoot ? '#3d3b38' : (isNote ? '#fffdf0' : '#ffffff');
    let bc = '#d8d4ce';
    let bw = 1.5;
    let op = st.opacity != null ? st.opacity : 1;

    if (isGroup) {
      bg = (n.bg && n.bg.color) || '#ffffff';
      bc = (n.bg && n.bg.color) || '#aaa';
      op = (n.bg && n.bg.opacity != null) ? n.bg.opacity : 0.1;
      bw = 2;
    } else {
      if (st.backgroundColor) bg = st.backgroundColor;
      if (st.borderColor) bc = st.borderColor;
      if (st.borderWidth != null) bw = st.borderWidth;
    }

    rect.setAttribute('fill', bg);
    rect.setAttribute('stroke', bc);
    rect.setAttribute('stroke-width', String(bw));

    if (!isGroup) {
      if (st.borderType === 'dashed') rect.setAttribute('stroke-dasharray', '5,5');
      else if (st.borderType === 'dotted') rect.setAttribute('stroke-dasharray', '2,2');
      else if (st.borderType === 'none') rect.setAttribute('stroke-width', '0');
    } else {
      rect.setAttribute('stroke-dasharray', '8,4');
    }

    // Opacity
    rect.setAttribute('fill-opacity', String(op));
    rect.setAttribute('stroke-opacity', String(isGroup ? op * 2 : op));

    // Label color
    label.setAttribute('fill', getContrastColor(bg));
    if (isGroup) {
      label.setAttribute('y', String(n.y - hh + 18));
      label.setAttribute('font-weight', '600');
    }
  }

  // Stub line from button to root node
  if(fromPt&&rootN){
    const d=initialEdge?mkPathD(initialEdge):`M${fromPt.x},${fromPt.y}L${rootN.x},${rootN.y}`;
    const stub=mkSVG('path');
    stub.setAttribute('d',d);
    stub.setAttribute('fill', 'none');
    stub.setAttribute('stroke', (initialEdge&&initialEdge.color)||LCOLS[0]);
    stub.setAttribute('stroke-width', (initialEdge && initialEdge.width) || '1.5');
    stub.style.pointerEvents='none';lineElems.push(stub);
  }

  // Root node box + label
  if(rootN){
    previewNodeIds.add(rootId);
    const{hw,hh}=nodeHalfExtents(rootId);
    const rect=mkSVG('rect');
    rect.setAttribute('x',String(rootN.x-hw));rect.setAttribute('y',String(rootN.y-hh));
    rect.setAttribute('width',String(hw*2));rect.setAttribute('height',String(hh*2));
    const label=mkSVG('text');
    label.setAttribute('x',String(rootN.x));label.setAttribute('y',String(rootN.y));
    label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');
    label.setAttribute('font-size','13');label.style.pointerEvents='none';
    label.textContent=rootN.label||'';
    applyNodeStyle(rootN, rect, label);
    nodeElems.push(rect,label);
  }

  const visited = new Set();
  function collectNode(id){
    if(visited.has(id)) return;
    visited.add(id);
    // If it's a connection line (link), do not recursively show descendants
    const isLink = initialEdge && (initialEdge.isLink || initialEdge.dash === 'link');
    if (isLink) return;

    gCh(id).forEach(cid=>{
      const par=gN(id),chi=gN(cid);if(!par||!chi)return;
      previewNodeIds.add(cid);
      const pe=edges.find(x=>x.from===id&&x.to===cid);
      const isCurLink = pe && (pe.isLink || pe.dash === 'link');

      const clr=(pe&&pe.color)||LCOLS[0];
      const d=pe?mkPathD(pe):`M${par.x},${par.y}L${chi.x},${chi.y}`;
      const line=mkSVG('path');line.setAttribute('d',d);line.setAttribute('fill','none');
      line.setAttribute('stroke',clr);
      line.setAttribute('stroke-width', (pe && pe.width) || '1.5');
      line.style.pointerEvents='none';
      if(pe && pe.dash === 'dashed') line.setAttribute('stroke-dasharray','5,5');
      else if(pe && pe.dash === 'dotted') line.setAttribute('stroke-dasharray','2,2');
      else if(isCurLink) line.setAttribute('stroke-dasharray','4,3');
      lineElems.push(line);

      const{hw,hh}=nodeHalfExtents(cid);
      const rect=mkSVG('rect');
      rect.setAttribute('x',String(chi.x-hw));rect.setAttribute('y',String(chi.y-hh));
      rect.setAttribute('width',String(hw*2));rect.setAttribute('height',String(hh*2));
      const label=mkSVG('text');
      label.setAttribute('x',String(chi.x));label.setAttribute('y',String(chi.y));
      label.setAttribute('text-anchor','middle');label.setAttribute('dominant-baseline','central');
      label.setAttribute('font-size','13');label.style.pointerEvents='none';
      label.textContent=chi.label||'';
      applyNodeStyle(chi, rect, label);
      nodeElems.push(rect,label);

      // Recurse only if it's a structural line
      if (!isCurLink) {
        collectNode(cid);
      }
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
      rect.setAttribute('x', String(gr.x - gr.width/2));
      rect.setAttribute('y', String(gr.y - gr.height/2));
      rect.setAttribute('width', String(gr.width));
      rect.setAttribute('height', String(gr.height));
      rect.setAttribute('rx', '12'); rect.setAttribute('ry', '12');
      
      const bg = (gr.bg && gr.bg.color) || '#aaaaaa';
      const op = (gr.bg && gr.bg.opacity != null) ? gr.bg.opacity : 0.1;
      
      rect.setAttribute('fill', bg);
      rect.setAttribute('fill-opacity', String(op));
      rect.setAttribute('stroke', bg);
      rect.setAttribute('stroke-opacity', String(op * 2));
      rect.setAttribute('stroke-width', '2');
      rect.setAttribute('stroke-dasharray', '8,4');
      groupElems.push(rect);
    }
  });

  groupElems.forEach(el=>g.appendChild(el));
  lineElems.forEach(el=>g.appendChild(el));
  nodeElems.forEach(el=>g.appendChild(el));
}

function renderGroupConnectionsPreview(groupId, g, highlightedEdgeId) {
  edges.forEach(pe => {
    if (pe.from === groupId || pe.to === groupId) {
      const f = gN(pe.from);
      const t = gN(pe.to);
      if (!f || !t) return;
      
      const d = mkPathD(pe);
      const line = mkSVG('path');
      line.setAttribute('d', d);
      line.setAttribute('fill', 'none');
      line.setAttribute('stroke', (pe.id === highlightedEdgeId ? '#ffb03a' : (pe.color || LCOLS[0])));
      line.setAttribute('stroke-width', '2');
      if (pe.dash === 'link') line.setAttribute('stroke-dasharray', '8,4');
      line.style.pointerEvents = 'none';
      g.appendChild(line);
      
      // If edge is OUTGOING from the group and branch is collapsed, preview the branch too!
      if (pe.from === groupId && pe.collapsed) {
        const origCol = pe.collapsed;
        try {
          pe.collapsed = false;
          renderBranchPreview(pe.to, g, lineExitFrom(pe), pe);
        } finally {
          pe.collapsed = origCol;
        }
      }
    }
  });
}

function mkSVG(tag){return document.createElementNS('http://www.w3.org/2000/svg',tag)}

let isRendering = false;
function render(){
  if(isRendering) return;
  isRendering = true;
  try {
    document.body.classList.toggle('edge-selected', !!selE);
    canvas.querySelectorAll('.node').forEach(el=>el.remove());
    canvas.querySelectorAll('.group-box').forEach(el=>el.remove());
    Array.from(svgl.children).forEach(el=>{if(el.id!=='ghost-ln'&&el.id!=='ghost-hd')el.remove()});
    svgl.setAttribute('viewBox',`0 0 ${CS} ${CS}`);svgl.setAttribute('width',CS);svgl.setAttribute('height',CS);

    const defs = mkSVG('defs');
    svgl.appendChild(defs);
    const visibleGroups = nodes.filter(n => n.type === 'group' && isVisible(n.id));
    visibleGroups.forEach(g => {
      const cp = mkSVG('clipPath'); cp.id = 'clip-g-' + g.id;
      const rect = mkSVG('rect');
      const hw = (g.width || 300) / 2, hh = (g.height || 200) / 2;
      rect.setAttribute('x', g.x - hw); rect.setAttribute('y', g.y - hh);
      rect.setAttribute('width', hw * 2); rect.setAttribute('height', hh * 2);
      cp.appendChild(rect); defs.appendChild(cp);
    });

  // Edges first — SVG renders behind node divs

  edges.forEach(e=>{
    const f=gN(e.from),t=gN(e.to);
    if(!f||!t||!isVisible(e.from))return;
    
    // Outgoing from a hidden group -> entirely invisible
    if (f.type === 'group' && f.collapsed) return;
    
    const isLink = e.dash === 'link' || e.isLink;
    const effGroupCollapsed = (t.type === 'group' && t.collapsed);
    
    // Links effectively collapse if their target is hidden
    let effCollapsed = e.collapsed || effGroupCollapsed || (isLink && !isVisible(e.to));
    
    // Skip edges whose TO node is invisible due to an ancestor being collapsed
    // (but NOT if this specific edge is effectively collapsed — we still need it for the expand circle)
    if(!isVisible(e.to) && !effCollapsed && !effGroupCollapsed) return;
    
    const isSel=e.id===selE;
    let baseClr = e.color || LCOLS[0];
    let clr = isSel ? '#4a7cf7' : adjustColorForContrast(baseClr, bgSettings.color || '#f0ede8');

    const grp=mkSVG('g');
    // child-sel: show collapse btn when child node is selected (but not when line itself is selected)
    const childSelected=selN===e.to;
    const isPending = pendingInsert && pendingInsert.edgeId === e.id;
    grp.setAttribute('class','edge-group'+(isSel?' sel-group':'')+(childSelected?' child-sel':'')+(isPending?' drop-target':''));
    grp.dataset.eid=e.id;
    
    if(!effCollapsed){
      // Draw line + arrowheads + handles normally
      const d=mkPathD(e);
      const hit=mkSVG('path');hit.setAttribute('d',d);hit.setAttribute('class','ehit');
      hit.dataset.eid=e.id;grp.appendChild(hit);
      const ep=mkSVG('path');ep.setAttribute('d',d);
      ep.setAttribute('class','ep '+(e.dash==='link'?'link':(e.dash||'solid'))+(isSel?' sel-e':''));
      ep.setAttribute('stroke',clr);ep.setAttribute('stroke-width',isSel?Math.max(e.width||1.5,2):(e.width||1.5));
      ep.setAttribute('fill','none');
      if(e.label){
        const mid=edgePt(e,0.5);
        // SVG mask: creates visual "break" in the line under the label text
        const m = mkSVG('mask'); m.id='m-e-'+e.id;
        const r1=mkSVG('rect'); r1.setAttribute('x',0); r1.setAttribute('y',0); r1.setAttribute('width',CS); r1.setAttribute('height',CS); r1.setAttribute('fill','white');
        const r2=mkSVG('rect'); 
        const gw=Math.max(24, e.label.length*7.5+10), gh=18;
        r2.setAttribute('x',mid.x-gw/2); r2.setAttribute('y',mid.y-gh/2); r2.setAttribute('width',gw); r2.setAttribute('height',gh); r2.setAttribute('fill','black');
        m.appendChild(r1); m.appendChild(r2); grp.appendChild(m);
        ep.setAttribute('mask',`url(#${m.id})`);
        // Label text overlay
        const fo=mkSVG('foreignObject');
        fo.setAttribute('x',mid.x-70);fo.setAttribute('y',mid.y-100);
        fo.setAttribute('width',140);fo.setAttribute('height',200);
        fo.setAttribute('style','overflow:visible;pointer-events:none');
        const div=document.createElement('div');
        div.className='edge-label-v3';
        const span=document.createElement('span');span.innerHTML=parseMd(e.label);
        if(e.style) {
          if(e.style.fontFamily) span.style.fontFamily = e.style.fontFamily;
          if(e.style.fontWeight) span.style.fontWeight = e.style.fontWeight;
          if(e.style.fontStyle) span.style.fontStyle = e.style.fontStyle;
          if(e.style.fontSize) span.style.fontSize = e.style.fontSize + 'px';
          if(e.style.color) span.style.color = e.style.color;
          if(e.style.textAlign) div.style.textAlign = e.style.textAlign;
        }
        div.appendChild(span);fo.appendChild(div);grp.appendChild(fo);
      }
      grp.appendChild(ep);
      drawArrowheads(grp,e,clr);
      
      // Draw adapted clipped line segments for any group this edge crosses
      if (!isSel) {
        const {fx, fy, tx, ty} = getEdgePts(e);
        const minX = Math.min(fx, tx) - 50, maxX = Math.max(fx, tx) + 50;
        const minY = Math.min(fy, ty) - 50, maxY = Math.max(fy, ty) + 50;
        
        visibleGroups.forEach(g => {
          const hw = (g.width || 300) / 2, hh = (g.height || 200) / 2;
          const gxMin = g.x - hw, gxMax = g.x + hw;
          const gyMin = g.y - hh, gyMax = g.y + hh;
          // Simple AABB collision check
          if (minX <= gxMax && maxX >= gxMin && minY <= gyMax && maxY >= gyMin) {
            const cg = mkSVG('g');
            cg.setAttribute('clip-path', `url(#clip-g-${g.id})`);
            
            const effBg = blendColors(bgSettings.color || '#f0ede8', g.bg?.color || '#ffffff', g.bg?.opacity ?? 0.1);
            const adjClr = adjustColorForContrast(baseClr, effBg);
            if (adjClr !== clr) {
              const cep = mkSVG('path'); cep.setAttribute('d',d);
              cep.setAttribute('class','ep '+(e.dash==='link'?'link':(e.dash||'solid')));
              cep.setAttribute('stroke',adjClr); cep.setAttribute('stroke-width',(e.width||1.5));
              cep.setAttribute('fill','none');
              if (e.label) cep.setAttribute('mask',`url(#m-e-${e.id})`);
              cg.appendChild(cep);
              drawArrowheads(cg, e, adjClr);
              
              grp.appendChild(cg);
            }
          }
        });
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
    const ex=lineExitFrom(e);
    if(effCollapsed){
      addExpandCircle(grp,ex,e.from,e.id, effGroupCollapsed);
    } else {
      const sh = e.shape || gls;
      if(!isSel || sh === 'elbow') {
        addCollapseBtn(grp,ex,clr,e);
      }
    }
    svgl.insertBefore(grp,glLink);
  });

  // Groups: Split into Background (behind SVG) and UI (above SVG)
  nodes.filter(n=>n.type==='group' && isVisible(n.id) && (!branchViewId || branchShowGroups)).forEach(n=>{
    const isSel = n.id===selN||selNSet.has(n.id);
    
    // 1. Background layer: contains color/images/border, goes behind lines
    const divBg=document.createElement('div');
    divBg.className='group-box g-bg-box'+(isSel?' selected':'');

    divBg.id='gb'+n.id;
    divBg.style.left=n.x+'px';divBg.style.top=n.y+'px';
    divBg.style.width=n.width+'px';divBg.style.height=n.height+'px';
    
    const bgBase=document.createElement('div'); bgBase.id='g-bg-base-'+n.id; bgBase.className='g-bg-layer';
    const bgImg=document.createElement('div'); bgImg.id='g-bg-img-'+n.id; bgImg.className='g-bg-layer';
    const bgPat=document.createElement('div'); bgPat.id='g-bg-pat-'+n.id; bgPat.className='g-bg-layer';
    divBg.appendChild(bgBase); divBg.appendChild(bgImg); divBg.appendChild(bgPat);
    canvas.prepend(divBg);
    applyBg(n.id);
    
    // Background interaction is here so it doesn't block SVG lines above it
    divBg.addEventListener('contextmenu',ev=>{ ev.preventDefault();ev.stopPropagation(); showGroupBgCtx(ev.clientX,ev.clientY,n.id); });

    // 2. UI layer: contains title/buttons/resizers, goes above lines
    const divUI=document.createElement('div');
    divUI.className='node group-box g-ui-box'+(isSel?' selected':'');
    divUI.id='nd'+n.id; // Keep id nd for drag-selection logic
    divUI.style.left=n.x+'px';divUI.style.top=n.y+'px';
    divUI.style.width=n.width+'px';divUI.style.height=n.height+'px';
    
    const isCollapsed = n.bg && n.bg.titleCollapsed;
    const isGroupHidden = !!n.collapsed;
    
    // Effective background calculator for adaptive contrast
    const canvBg = bgSettings.color || '#f0ede8';
    const groupBg = n.bg?.color || '#ffffff';
    const groupOp = n.bg?.opacity ?? 0.1;
    const effGroupBg = blendColors(canvBg, groupBg, groupOp);
    
    const titleBg = n.bg?.titleColor || '#ffffff';
    const titleOp = n.bg?.titleOpacity ?? 0.95;
    const effTitleBg = blendColors(effGroupBg, titleBg, titleOp);
    
    if (isGroupHidden) {
      divBg.style.opacity = '0';
      divBg.style.pointerEvents = 'none';
      divUI.classList.add('is-hidden');
    }
    
    const title=document.createElement('div');
    title.className='group-title';
    title.innerHTML=parseMd(n.label);
    if(n.bg && n.bg.titleColor) {
      title.style.backgroundColor = hexToRgba(n.bg.titleColor, n.bg.titleOpacity ?? 0.95);
      title.style.color = getContrastColor(n.bg.titleColor);
      title.style.borderBottomColor = 'rgba(0,0,0,0.15)';
    } else {
      title.style.color = '#2c2a27';
      title.style.backgroundColor = `rgba(255,255,255,${n.bg.titleOpacity ?? 0.95})`;
    }
    if (isCollapsed || isGroupHidden) title.style.display = 'none';

    title.addEventListener('mousedown',ev=>{ if(ev.button!==0 && ev.button!==1) return; ev.stopPropagation(); onNodeMD(ev,n.id); });
    title.addEventListener('touchstart',ev=>{ev.stopPropagation();onNdTS(ev,n.id)},{passive:false});

    title.addEventListener('touchmove',ev=>{onNdTM(ev,n.id)},{passive:false});
    title.addEventListener('touchend',ev=>{onNdTE(ev,n.id)});
    title.addEventListener('dblclick',ev=>{ev.stopPropagation();openNote(n.id,'auto')});
    title.addEventListener('contextmenu',ev=>{ ev.preventDefault();ev.stopPropagation(); showGroupCtx(ev.clientX,ev.clientY,n.id); });

    // Collapse title button (top-right)
    const collBtn = document.createElement('div');
    collBtn.className = 'group-collapse-btn' + (isCollapsed ? ' clps' : '');
    collBtn.textContent = '⛶';
    // Logic: if not collapsed and group not hidden -> it's over title bar. Otherwise over group background.
    const effCollBg = (!isCollapsed && !isGroupHidden) ? effTitleBg : effGroupBg;
    collBtn.style.color = getContrastColor(effCollBg);
    if (isGroupHidden) collBtn.style.display = 'none';
    
    collBtn.addEventListener('mousedown', ev => {
      if(ev.button!==0 && ev.button!==1) return;
      ev.stopPropagation();
      const sx = ev.clientX, sy = ev.clientY;

      const onUp = (upEv) => {
        window.removeEventListener('mouseup', onUp);
        const dist = Math.hypot(upEv.clientX - sx, upEv.clientY - sy);
        if (dist < 5) { 
          if (!n.bg) n.bg = {};
          n.bg.titleCollapsed = !n.bg.titleCollapsed;
          sh(); render();
        }
      };
      window.addEventListener('mouseup', onUp);
      onNodeMD(ev, n.id);
    });

    divUI.appendChild(collBtn);
    
    // Hide Group object button (top-left)
    const hideBtn = document.createElement('div');
    hideBtn.className = 'group-hide-btn' + (isGroupHidden ? ' hdn' : '');
    hideBtn.textContent = '👁'; 
    // Logic: if group hidden -> over canvas. Else if title expanded -> over title. Else -> over group bg.
    let effHideBg = canvBg;
    if (!isGroupHidden) {
      effHideBg = (!isCollapsed) ? effTitleBg : effGroupBg;
    }
    hideBtn.style.color = getContrastColor(effHideBg);
    hideBtn.id = 'ghide-' + n.id;
    hideBtn.addEventListener('mousedown', ev => {
      if(ev.button!==0 && ev.button!==1) return;

      ev.stopPropagation();
      const sx = ev.clientX, sy = ev.clientY;
      const onUp = (upEv) => {
        window.removeEventListener('mouseup', onUp);
        if (Math.hypot(upEv.clientX - sx, upEv.clientY - sy) < 5) {
          n.collapsed = !n.collapsed;
          sh(); render();
        }
      };
      window.addEventListener('mouseup', onUp);
      onNodeMD(ev, n.id);
    });
    divUI.appendChild(hideBtn);

    if (isGroupHidden) {
      const sketch = document.createElement('div');
      sketch.className = 'group-sketch';
      sketch.id = 'gsketch-' + n.id;
      // Size identically to background
      sketch.style.width = '100%';
      sketch.style.height = '100%';
      
      let previewSVG = null;
      hideBtn.addEventListener('mouseenter', () => {
         sketch.classList.add('active');
         previewSVG = mkSVG('g'); previewSVG.style.opacity = '0.5'; previewSVG.style.pointerEvents = 'none';
         renderGroupConnectionsPreview(n.id, previewSVG, null);
         svgl.insertBefore(previewSVG, glLink);
      });
      hideBtn.addEventListener('mouseleave', () => {
         sketch.classList.remove('active');
         if (previewSVG) { previewSVG.remove(); previewSVG=null; }
      });
      divUI.appendChild(sketch);
    }



    // Sensors and interactions
    ['top','bottom','left','right'].forEach(pos => {
      const sensor = document.createElement('div');
      sensor.className = 'group-frame-sensor ' + pos;
      sensor.addEventListener('mouseenter',()=>divUI.classList.add('hovered'));
      sensor.addEventListener('mouseleave',()=>divUI.classList.remove('hovered'));
      sensor.addEventListener('mousedown',ev=>{ if(ev.button!==0 && ev.button!==1) return; ev.stopPropagation(); startPlusDrag(ev,n.id,pos,sensor,pos); });
      sensor.oncontextmenu = ev => showPlusCtx(ev, n.id, pos, pos);
      divUI.appendChild(sensor);
    });
    // title.addEventListener('mouseenter',()=>divUI.classList.add('hovered'));
    // title.addEventListener('mouseleave',()=>divUI.classList.remove('hovered'));

    ['tl','tr','bl','br'].forEach(pos=>{
      const r=document.createElement('div');
      r.className='group-resizer '+pos;
      r.addEventListener('mousedown',ev=>{ev.stopPropagation();startGroupResize(ev,n.id,pos)});
      r.addEventListener('touchstart',ev=>{ev.stopPropagation();startGroupResize(ev,n.id,pos)},{passive:false});
      divUI.appendChild(r);
    });

    ['top','bottom','left','right'].forEach(pos=>{
      const np=document.createElement('div');np.className='np group-np '+pos;np.textContent='+';
      np.addEventListener('mouseenter',()=>divUI.classList.add('hovered'));
      np.addEventListener('mouseleave',()=>divUI.classList.remove('hovered'));
      np.addEventListener('mousedown',ev=>{ if(ev.button!==0 && ev.button!==1) return; ev.stopPropagation(); startPlusDrag(ev,n.id,pos,np,pos); });
      np.oncontextmenu = ev => showPlusCtx(ev, n.id, pos, pos);
      divUI.appendChild(np);
    });

    divUI.appendChild(title);
    canvas.appendChild(divUI);
  });

  // Nodes on top — DOM divs paint over SVG
  nodes.filter(n=>n.type!=='group' && isVisible(n.id)).forEach(n=>{
    const isRoot=n.type==='root';
    const isNote=n.type==='note';
    const isMulti=n.type==='multi';
    const div=document.createElement('div');
    div.className='node'+(n.id===selN||selNSet.has(n.id)?' selected':'')+(isRoot?' is-root':'')+(n.note?' has-note':'')+(n.id===branchViewId?' branch-root':'')+(isNote?' type-note':'')+(isMulti?' type-multi':'')+(pendingInsert && pendingInsert.nodeId === n.id ? ' drop-node-target' : '');
    div.id='nd'+n.id;div.style.left=n.x+'px';div.style.top=n.y+'px';
    div.setAttribute('draggable', 'false');
    div.ondragstart = () => false;

    if(isMulti) {
      const ext = nodeHalfExtents(n.id);
      div.style.width = (ext.hw * 2 + 6) + 'px'; 
      div.style.height = (ext.hh * 2 + 6) + 'px';
      
      // Resizer handles
      ['tl','tr','bl','br'].forEach(pos=>{
        const r=document.createElement('div');
        r.className='multi-resizer '+pos;
        r.addEventListener('mousedown',ev=>{ev.stopPropagation();startGroupResize(ev,n.id,pos)});
        r.addEventListener('touchstart',ev=>{ev.stopPropagation();startGroupResize(ev,n.id,pos)},{passive:false});
        div.appendChild(r);
      });
    }

    const ni=document.createElement('div');ni.className='ni';
    
    if(isMulti) {
      // Side sensors for highlight and drag connection MUST be inside .ni to share stacking context with .np buttons
      ['n','s','e','w'].forEach(pos=>{
        const sensor=document.createElement('div');
        sensor.className='multi-side-sensor '+pos;
        sensor.addEventListener('mousedown',ev=>{ if(ev.button!==0 && ev.button!==1) return; ev.stopPropagation(); startPlusDrag(ev,n.id,pos,sensor,pos); });
        sensor.oncontextmenu = ev => showPlusCtx(ev, n.id, pos, pos);
        ni.appendChild(sensor);
      });
    }
    if(n.style) {
      if(n.style.shape==='rect') ni.style.borderRadius='0px';
      else if(n.style.shape==='round') ni.style.borderRadius='8px';
      else if(n.style.shape==='pill') ni.style.borderRadius='50px';
      
      if(n.style.borderWidth!=null) ni.style.borderWidth=n.style.borderWidth+'px';
      if(n.style.borderType) ni.style.borderStyle=n.style.borderType;
      if(n.style.borderColor) ni.style.borderColor=n.style.borderColor;
      if(n.style.padding!=null) ni.style.padding=`${n.style.padding}px ${n.style.padding*2.2}px`;
      
      let rgbStr = isRoot ? '61,59,56' : (isNote ? '255,253,240' : '255,255,255');
      if(n.style.backgroundColor && n.style.backgroundColor.startsWith('#')) {
        const h = n.style.backgroundColor;
        const r = parseInt(h.slice(1,3), 16), g = parseInt(h.slice(3,5), 16), b = parseInt(h.slice(5,7), 16);
        rgbStr = `${r},${g},${b}`;
      } else if (n.style.backgroundColor) {
        ni.style.backgroundColor = n.style.backgroundColor;
      }
      if(n.style.opacity!=null || n.style.backgroundColor) {
        const op = n.style.opacity != null ? n.style.opacity : 1;
        if(rgbStr) ni.style.background=`rgba(${rgbStr}, ${op})`;
      }
      if(n.style.blur) {
        ni.style.backdropFilter=`blur(${n.style.blur}px)`;
        ni.style.webkitBackdropFilter=`blur(${n.style.blur}px)`;
      }
    }
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
    const rawLabel = n.label||(n.id===selN?'':'+');
    // Render inline Markdown for view mode; plain '+' stays as text
    if(n.label) sp.innerHTML = parseMd(rawLabel);
    else sp.textContent = rawLabel;

    if(n.style) {
      if(n.style.fontFamily) sp.style.fontFamily = n.style.fontFamily;
      if(n.style.fontWeight) sp.style.fontWeight = n.style.fontWeight;
      if(n.style.fontStyle) sp.style.fontStyle = n.style.fontStyle;
      if(n.style.fontSize) sp.style.fontSize = n.style.fontSize + 'px';
      if(n.style.textAlign) ni.style.textAlign = n.style.textAlign;
    }

    if(!n.label)sp.style.color='var(--mu)';
    if(!isMob()){sp.style.cursor='text';sp.addEventListener('click',ev=>{ev.stopPropagation();editNode(n.id)})}
    ni.appendChild(sp);
    
    // Adaptive text color for contrast
    if(n.style && n.style.color) {
      sp.style.color = n.style.color;
    } else if(n.style && n.style.backgroundColor) {
      sp.style.color = getContrastColor(n.style.backgroundColor);
    } else if (isRoot) {
      sp.style.color = '#ffffff';
    } else if (isNote) {
      sp.style.color = '#2c2a27';
    }
    // Cardinal plus buttons on node edges, shown on hover
    ['e','w','n','s'].forEach(dir=>{
      const np=document.createElement('div');np.className='np '+dir+' smart-side';
      np.setAttribute('draggable', 'false');
      np.ondragstart = () => false;
      np.textContent='+';np.addEventListener('mousedown',ev=>{ if(ev.button!==0 && ev.button!==1) return; ev.stopPropagation(); startPlusDrag(ev,n.id,dir,np,dir); });
      np.oncontextmenu = ev => showPlusCtx(ev, n.id, dir, dir);
      ni.appendChild(np);
    });
    // Mobile: touch-specific plus buttons
    if(isMob()){
      const npC=document.createElement('div');npC.className='np center';npC.textContent='+';
      npC.setAttribute('draggable', 'false');
      npC.ondragstart = () => false;
      npC.addEventListener('touchend',ev=>{ev.stopPropagation();ev.preventDefault();addChild(n.id)});
      npC.oncontextmenu = ev => showPlusCtx(ev, n.id, null, null);
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
        showMultiCtx(ev.clientX, ev.clientY, n.id);
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

function renderEdgesOnly(specificEdgeIds){
  const updateSubset = Array.isArray(specificEdgeIds);
  if(!updateSubset) {
    Array.from(svgl.children).forEach(el=>{if(el.id!=='ghost-ln'&&el.id!=='ghost-hd')el.remove()});
    svgl.setAttribute('viewBox',`0 0 ${CS} ${CS}`);
  }

  const targetEdges = updateSubset ? edges.filter(e => specificEdgeIds.includes(e.id)) : edges;

  targetEdges.forEach(e=>{
    const f=gN(e.from),t=gN(e.to);
    if(!f||!t||!isVisible(e.from))return;
    const effGroupCollapsed = (t.type === 'group' && t.collapsed);
    const effCollapsed = e.collapsed || effGroupCollapsed;
    
    if(!isVisible(e.to) && !effCollapsed && !effGroupCollapsed) return;
    
    // If updating subset, remove old group first
    if(updateSubset) {
      const old = svgl.querySelector(`.edge-group[data-eid="${e.id}"]`);
      if(old) old.remove();
    }

    const isSel=e.id===selE;
    let baseClr = e.color || LCOLS[0];
    let clr = isSel ? '#4a7cf7' : adjustColorForContrast(baseClr, bgSettings.color || '#f0ede8');
    const grp=mkSVG('g');
    const isPending = pendingInsert && pendingInsert.edgeId === e.id;
    grp.setAttribute('class','edge-group'+(isSel?' sel-group':'')+(isPending?' drop-target':''));
    grp.dataset.eid=e.id;
    
    if(!effCollapsed){
      const d=mkPathD(e);
      const hit=mkSVG('path');hit.setAttribute('d',d);hit.setAttribute('class','ehit');hit.dataset.eid=e.id;grp.appendChild(hit);
      const ep=mkSVG('path');ep.setAttribute('d',d);
      ep.setAttribute('class','ep '+(e.dash==='link'?'link':(e.dash||'solid'))+(isSel?' sel-e':''));
      ep.setAttribute('stroke',clr);ep.setAttribute('stroke-width',isSel?Math.max(e.width||1.5,2):(e.width||1.5));ep.setAttribute('fill','none');
      if(e.label){
        const mid=edgePt(e,0.5);
        const m = mkSVG('mask'); m.id='m-eo-'+e.id;
        const r1=mkSVG('rect'); r1.setAttribute('x',0); r1.setAttribute('y',0); r1.setAttribute('width',CS); r1.setAttribute('height',CS); r1.setAttribute('fill','white');
        const r2=mkSVG('rect');
        const gw=Math.max(24, e.label.length*7.5+10), gh=18;
        r2.setAttribute('x',mid.x-gw/2); r2.setAttribute('y',mid.y-gh/2); r2.setAttribute('width',gw); r2.setAttribute('height',gh); r2.setAttribute('fill','black');
        m.appendChild(r1); m.appendChild(r2); grp.appendChild(m);
        ep.setAttribute('mask',`url(#${m.id})`);
      }
      grp.appendChild(ep);
      if(e.dash!=='link') drawArrowheads(grp,e,clr);
      if(e.label){
        const mid=edgePt(e,0.5);
        const fo=mkSVG('foreignObject');
        fo.setAttribute('x',mid.x-70);fo.setAttribute('y',mid.y-100);
        fo.setAttribute('width',140);fo.setAttribute('height',200);
        fo.setAttribute('style','overflow:visible;pointer-events:none');
        const div=document.createElement('div');
        div.className='edge-label-v3';
        const span=document.createElement('span');span.innerHTML=parseMd(e.label);
        if(e.style) {
          if(e.style.fontFamily) span.style.fontFamily = e.style.fontFamily;
          if(e.style.fontWeight) span.style.fontWeight = e.style.fontWeight;
          if(e.style.fontStyle) span.style.fontStyle = e.style.fontStyle;
          if(e.style.fontSize) span.style.fontSize = e.style.fontSize + 'px';
          if(e.style.color) span.style.color = e.style.color;
          if(e.style.textAlign) div.style.textAlign = e.style.textAlign;
        }
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
    const sh = e.shape || gls;
    if(!effCollapsed && (!isSel || sh === 'elbow')){
      const ex=lineExitFrom(e);
      addCollapseBtn(grp,ex,clr,e);
    }
    else if(effCollapsed){const ex=lineExitFrom(e);addExpandCircle(grp,ex,e.from,e.id, effGroupCollapsed);}
    // Insert before ghost lines
    svgl.insertBefore(grp,glLink);
  });
}

function applyT(){
  canvas.style.transform=`translate(${panX}px,${panY}px) scale(${zoom})`;
  canvas.style.transformOrigin='0 0';
  // Refresh map-bg layer positions (attached to root nodes)
  if (typeof renderAllMapBgs === 'function') renderAllMapBgs();
}


