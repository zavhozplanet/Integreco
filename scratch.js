const fs = require('fs');
// Let's copy utils.ts and mock nodes/edges
let code = fs.readFileSync('src/utils.ts', 'utf-8');
code = code.replace('// @ts-nocheck', '');
code = code.replace(/window\..*/g, ''); // remove window.innerWidth etc
code += `
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

console.log("isBaseVisible(2):", isBaseVisible(2));
console.log("isBaseVisible(3):", isBaseVisible(3));
`;
fs.writeFileSync('scratch.js', code);
