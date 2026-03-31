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

function isVisible(id){
  if(branchViewId){
    let c=id;for(let i=0;i<200;i++){if(c===branchViewId)return true;const p=gPar(c);if(p==null)return false;c=p}
    return false;
  }
  let c=id;for(let i=0;i<200;i++){const p=gPar(c);if(p==null)return true;const e=edges.find(e=>e.from===p&&e.to===c);if(e&&e.collapsed)return false;c=p}
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

