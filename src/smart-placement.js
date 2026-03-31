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

