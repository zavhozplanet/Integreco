const edges = [
  {id: 1, from: 'A', to: 'B', dash: 'solid', isLink: false, collapsed: true},
  {id: 2, from: 'B', to: 'C', dash: 'solid', isLink: false, collapsed: false},
  {id: 3, from: 'D', to: 'C', dash: 'link', isLink: true, collapsed: false}
];
const nodes = [
  {id: 'A', type: 'root'},
  {id: 'B', type: 'node'},
  {id: 'C', type: 'node'},
  {id: 'D', type: 'root'}
];
function gN(id){return nodes.find(n=>n.id===id)}
function isBaseVisible(id){
  let q = [id];
  let visited = new Set();
  while(q.length > 0) {
    let cur = q.shift();
    const n = gN(cur);
    if(!n || n.type === 'root') return true;
    if(visited.has(cur)) continue;
    visited.add(cur);
    const parents = edges.filter(e => e.to === cur && e.dash !== 'link' && !e.isLink);
    if(parents.length === 0) return true; // floating node or root is visible
    for(const e of parents) {
      if(!e.collapsed) {
        q.push(e.from);
      }
    }
  }
  return false;
}
console.log("A is visible:", isBaseVisible('A'));
console.log("B is visible:", isBaseVisible('B'));
console.log("C is visible:", isBaseVisible('C'));
console.log("D is visible:", isBaseVisible('D'));
