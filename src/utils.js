/* ================================================================
   UTILS
================================================================ */
function nid(){return++idC}
function gN(id){return nodes.find(n=>n.id===id)}
function gE(id){return edges.find(e=>e.id===id)}
function gCh(id){return edges.filter(e=>e.from===id).map(e=>e.to)}
function gPar(id){const e=edges.find(e=>e.to===id);return e?e.from:null}
function isMob(){return window.innerWidth<768||('ontouchstart' in window)}
function s2c(sx,sy){return{x:(sx-panX)/zoom,y:(sy-panY)/zoom}}
function c2s(cx,cy){return{x:cx*zoom+panX,y:cy*zoom+panY}}
// Find node at canvas coords (cx,cy), optionally excluding excludeId
function findNodeAt(cx,cy,excludeId){
  let best=null,bestD=Infinity;
  nodes.forEach(n=>{
    if(!isVisible(n.id)||n.id===excludeId)return;
    let hw,hh;
    if(n.type==='group'){hw=(n.width||300)/2;hh=(n.height||200)/2}
    else{const ext=nodeHalfExtents(n.id);hw=ext.hw;hh=ext.hh}
    if(cx>=n.x-hw&&cx<=n.x+hw&&cy>=n.y-hh&&cy<=n.y+hh){
      const d=Math.hypot(cx-n.x,cy-n.y);if(d<bestD){bestD=d;best=n.id}
    }
  });
  return best;
}

function isVisible(id){
  const n = gN(id);
  if(n && n.type === 'group') {
    const inGroup = nodes.filter(x => 
      x.type !== 'group' && 
      x.x >= n.x - n.width/2 && x.x <= n.x + n.width/2 && 
      x.y >= n.y - n.height/2 && x.y <= n.y + n.height/2
    );
    if(inGroup.length > 0) {
      const anyVisible = inGroup.some(x => isBaseVisible(x.id));
      if(!anyVisible) return false;
    }
  }
  return isBaseVisible(id);
}

function isBaseVisible(id){
  if(branchViewId){
    let c=id;for(let i=0;i<200;i++){if(c===branchViewId)return true;const p=gPar(c);if(p==null)return false;c=p}
    return false;
  }
  let c=id;for(let i=0;i<200;i++){const p=gPar(c);if(p==null)return true;const e=edges.find(e=>e.from===p&&e.to===c);if(e&&e.collapsed&&e.dash!=='link')return false;c=p}
  return true;
}

function sh(){hist.push(JSON.stringify({nodes,edges,bgSettings}));if(hist.length>100)hist.shift();fut=[]}
function undo(){if(!hist.length)return;fut.push(JSON.stringify({nodes,edges,bgSettings}));loadSt(JSON.parse(hist.pop()))}
function redo(){if(!fut.length)return;hist.push(JSON.stringify({nodes,edges,bgSettings}));loadSt(JSON.parse(fut.pop()))}
function loadSt(s){nodes=s.nodes;edges=s.edges;bgSettings=s.bgSettings||bgSettings;applyBg();idC=Math.max(0,...nodes.map(n=>n.id),...edges.map(e=>e.id));selN=null;selE=null;selEHandles=true;selNSet.clear();render()}

function toast(msg,duration=2000){
  const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.display='none'},duration);
}

function pruneGroupEdges() {
  let toRemove = [];
  edges.forEach(e => {
    const fn = gN(e.from), tn = gN(e.to);
    if (!fn || !tn) return;
    if (fn.type === 'group' && tn.type !== 'group') {
      const hw = (fn.width || 300)/2, hh = (fn.height || 200)/2;
      if (tn.x >= fn.x - hw && tn.x <= fn.x + hw && tn.y >= fn.y - hh && tn.y <= fn.y + hh)
        toRemove.push(e.id);
    } else if (tn.type === 'group' && fn.type !== 'group') {
      const hw = (tn.width || 300)/2, hh = (tn.height || 200)/2;
      if (fn.x >= tn.x - hw && fn.x <= tn.x + hw && fn.y >= tn.y - hh && fn.y <= tn.y + hh)
        toRemove.push(e.id);
    }
  });
  if (toRemove.length > 0) {
    edges = edges.filter(e => !toRemove.includes(e.id));
    if (selE && toRemove.includes(selE)) selE = null;
  }
}
