/* ================================================================
   SMART PLACEMENT
================================================================ */
function smartPlace(parentId, dirHint){
  const p=gN(parentId);
  // Direction vector: from hint if given, otherwise from grandparent direction
  let vx=1,vy=0;
  if(dirHint==='e' || dirHint==='right'){vx=1;vy=0}
  else if(dirHint==='w' || dirHint==='left'){vx=-1;vy=0}
  else if(dirHint==='n' || dirHint==='top'){vx=0;vy=-1}
  else if(dirHint==='s' || dirHint==='bottom'){vx=0;vy=1}
  else{
    const parentPid=gPar(parentId);
    if(parentPid!=null){const pp=gN(parentPid);if(pp){vx=p.x-pp.x;vy=p.y-pp.y;const l=Math.sqrt(vx*vx+vy*vy)||1;vx/=l;vy/=l}}
  }
  const dist=200;
  // Generate candidates spread around the direction, biased heavily toward it
  const candidates=[];
  const spread=dirHint?45:60; // tighter spread when direction is explicit
  for(let a=-spread;a<=spread;a+=15){
    const rad=a*Math.PI/180;
    const ca=Math.cos(rad),sa=Math.sin(rad);
    const rx=vx*ca-vy*sa, ry=vx*sa+vy*ca;
    candidates.push({x:p.x+rx*dist,y:p.y+ry*dist,score:Math.abs(a)*0.5});
  }
  // Score: prefer far from other nodes, prefer far from other nodes
  candidates.forEach(c=>{
    let minD=Infinity;
    nodes.forEach(n=>{const d=Math.hypot(n.x-c.x,n.y-c.y);if(d<minD)minD=d});
    c.score+=Math.max(0,180-minD)*2;
  });
  candidates.sort((a,b)=>a.score-b.score);
  return{x:candidates[0].x,y:candidates[0].y};
}

function addChild(parentId, dirHint){
  sh();
  const pos=smartPlace(parentId, dirHint);
  const id=mkNode(pos.x,pos.y,'',parentId);
  if(autoMode)autoLayout();else render();
  selN=id;render();
  if(isMob()) showMobRename(id,true);
  else setTimeout(()=>editNode(id,true),50);
}

function alignGroupNodes(gId) {
  const g = gN(gId);
  if (!g || g.type !== 'group') return;
  const inGroup = nodes.filter(n => 
    n.type !== 'group' && isVisible(n.id) &&
    n.x >= g.x - g.width / 2 && n.x <= g.x + g.width / 2 && 
    n.y >= g.y - g.height / 2 && n.y <= g.y + g.height / 2
  );
  if (inGroup.length === 0) return;

  sh();
  
  // Get title height from DOM if possible, fallback to 35
  const titleEl = document.getElementById('nd' + gId)?.querySelector('.group-title');
  const titleH = titleEl ? titleEl.offsetHeight : 35;
  const margin = 20;

  // Find max dimensions to avoid overflow
  let maxW = 0, maxH = 0;
  inGroup.forEach(n => {
    const {hw, hh} = nodeHalfExtents(n.id);
    if (hw > maxW) maxW = hw;
    if (hh > maxH) maxH = hh;
  });

  const minX = g.x - g.width / 2 + maxW + margin;
  const maxX = g.x + g.width / 2 - maxW - margin;
  const minY = g.y - g.height / 2 + titleH + maxH + margin;
  const maxY = g.y + g.height / 2 - maxH - margin;

  const distribute = (targetNodes, axis, min, max) => {
    if (targetNodes.length === 1) {
      targetNodes[0][axis] = (min + max) / 2;
      return;
    }
    // Sort original values
    const sorted = targetNodes.map(n => n[axis]).sort((a, b) => a - b);
    // Find unique "lanes" with tolerance (so near-aligned nodes stay aligned)
    const unique = [];
    if (sorted.length > 0) {
      unique.push(sorted[0]);
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i] - unique[unique.length - 1] > 30) { 
          unique.push(sorted[i]);
        }
      }
    }
    
    // Distribution map: original unique value -> new distributed value
    const map = new Map();
    const count = unique.length;
    // If range is inverted or too small, just center everything
    if (max <= min || count <= 1) {
      const center = (min + max) / 2;
      unique.forEach(u => map.set(u, center));
    } else {
      const step = (max - min) / (count - 1);
      unique.forEach((u, i) => map.set(u, min + i * step));
    }
    
    targetNodes.forEach(n => {
      let best = unique[0];
      let mD = Math.abs(n[axis] - best);
      for (let u of unique) {
        let d = Math.abs(n[axis] - u);
        if (d < mD) { mD = d; best = u; }
      }
      n[axis] = map.get(best);
    });
  };

  distribute(inGroup, 'x', minX, maxX);
  distribute(inGroup, 'y', minY, maxY);

  render();
}

