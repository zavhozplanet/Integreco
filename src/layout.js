/* ================================================================
   AUTO LAYOUT
================================================================ */
function autoLayout(){
  const r=nodes.find(n=>n.type==='root');if(!r)return;
  if(!r.locked) { r.x=CS/2; r.y=CS/2; }
  edges.forEach(e=>{e.cp1x=null;e.cp1y=null;e.cp2x=null;e.cp2y=null});
  const rootCh=gCh(r.id);
  const n=rootCh.length;if(!n)return;
  const NODE_W=240, NODE_H=55, GAP=20;

  function subtreeSize(id,dx,dy){
    const ch=gCh(id);
    if(!ch.length)return dx!==0?NODE_H+GAP:NODE_W+GAP;
    return ch.reduce((a,cid)=>a+subtreeSize(cid,dx,dy),0);
  }

  function layBranch(id,x,y,dx,dy){
    const nd=gN(id);
    if(!nd.locked) { nd.x=x; nd.y=y; }
    else { x=nd.x; y=nd.y; }
    const ch=gCh(id);if(!ch.length)return;
    const step=dx!==0?NODE_W:NODE_H;
    const sizes=ch.map(cid=>subtreeSize(cid,dx,dy));
    const total=sizes.reduce((a,b)=>a+b,0);
    let perp=dx!==0?y-total/2:x-total/2;
    ch.forEach((cid,i)=>{
      const sz=sizes[i];const mid=perp+sz/2;
      layBranch(cid,dx!==0?x+dx*step:mid,dy!==0?y+dy*step:mid,dx,dy);
      perp+=sz;
    });
  }

  // Interleave R,L,U,D for balanced distribution
  const order=[{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:-1},{dx:0,dy:1}];
  const groups=new Map();
  order.forEach(d=>{groups.set(`${d.dx},${d.dy}`,{...d,children:[]})});
  rootCh.forEach((cid,i)=>groups.get(`${order[i%4].dx},${order[i%4].dy}`).children.push(cid));

  groups.forEach(({dx,dy,children})=>{
    if(!children.length)return;
    const sizes=children.map(cid=>subtreeSize(cid,dx,dy));
    const total=sizes.reduce((a,b)=>a+b,0);
    const step=dx!==0?NODE_W:NODE_H;
    let perp=dx!==0?r.y-total/2:r.x-total/2;
    children.forEach((cid,i)=>{
      const sz=sizes[i];const mid=perp+sz/2;
      layBranch(cid,dx!==0?r.x+dx*step:mid,dy!==0?r.y+dy*step:mid,dx,dy);
      perp+=sz;
    });
  });
}

function toggleAuto(){
  if(!autoMode){
    // switching ON: save current positions as snapshot, then layout
    preAutoSnapshot=JSON.parse(JSON.stringify({nodes,edges}));
    sh(); // also push to undo so ↩ can restore manual positions
    autoMode=true;
    document.getElementById('btn-auto').textContent='🤚';
    autoLayout();render();resetView();
    toast('Авто-расположение включено');
  } else {
    // switching OFF: restore pre-auto positions
    autoMode=false;
    document.getElementById('btn-auto').textContent='⊞';
    if(preAutoSnapshot){
      // push current (auto) state so redo works
      fut.push(JSON.stringify({nodes,edges}));
      loadSt(preAutoSnapshot);
      preAutoSnapshot=null;
    }
    toast('Ручное расположение — позиции восстановлены');
  }
}

