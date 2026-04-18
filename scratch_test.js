let nodes = [
  {id: 1, type: 'root'},
  {id: 2, type: 'node'},
  {id: 3, type: 'node'}
];
let edges = [
  {id: 10, from: 1, to: 2, collapsed: true, dash: 'solid'},
  {id: 11, from: 2, to: 3, collapsed: false, dash: 'solid'}
];
let branchViewId = null;

function gN(id){return nodes.find(n=>n.id===id)}
function gPar(id) {
  const n = gN(id);
  if (n && n.type === 'root') return null;
  const e = edges.find(e => e.to === id && e.dash !== 'link');
  return e ? e.from : null;
}
function isBaseVisible(id){
  if(branchViewId){
    let c=id;for(let i=0;i<200;i++){if(c===branchViewId)return true;const p=gPar(c);if(p==null)return false;c=p}
    return false;
  }
  
  let q = [id];
  let visited = new Set();
  while(q.length > 0) {
    let cur = q.shift();
    const n = gN(cur);
    if(!n || n.type === 'root') return true;
    if(visited.has(cur)) continue;
    visited.add(cur);
    if(visited.size > 200) break; 

    const parents = edges.filter(e => e.to === cur);
    if(parents.length === 0) return true; 
    
    for(const e of parents) {
      if(!e.collapsed) {
        q.push(e.from);
      }
    }
  }
  return false;
}

console.log("isBaseVisible(2):", isBaseVisible(2));
console.log("isBaseVisible(3):", isBaseVisible(3));
