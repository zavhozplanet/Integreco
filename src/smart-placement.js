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
    n.type !== 'group' && 
    n.x >= g.x - g.width/2 && n.x <= g.x + g.width/2 && 
    n.y >= g.y - g.height/2 && n.y <= g.y + g.height/2
  );
  if (inGroup.length === 0) return;

  sh();
  // Sort by Y then X to keep natural flow
  inGroup.sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const count = inGroup.length;
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);

  const pad = 40;
  const availW = g.width - pad * 2;
  const availH = g.height - pad * 2;
  
  const dx = cols > 1 ? availW / (cols - 1) : 0;
  const dy = rows > 1 ? availH / (rows - 1) : 0;

  const startX = g.x - g.width/2 + pad;
  const startY = g.y - g.height/2 + pad;

  inGroup.forEach((n, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    n.x = startX + c * dx + (cols === 1 ? availW/2 : 0);
    n.y = startY + r * dy + (rows === 1 ? availH/2 : 0);
  });

  render();
}

