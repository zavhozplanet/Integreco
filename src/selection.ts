// @ts-nocheck
/* ================================================================
   SELECTION
================================================================ */
function selNode(id){
  selN=id;selE=null;selEHandles=true;selNSet.clear();closeLp();
  if(id) {
    lastActiveNodeId=id;
    let curr = gN(id);
    if(curr) {
      let visited = new Set();
      while(curr) {
        visited.add(curr.id);
        let pid = gPar(curr.id);
        if(!pid || visited.has(pid)) break;
        let p = gN(pid);
        if(!p) break;
        curr = p;
      }
      lastUsedMapRootId = curr.id;
    }
  }
  // remove touch-plus from all
  document.querySelectorAll('.touch-plus').forEach(el=>el.classList.remove('touch-plus'));
  render();
}
function selEdge(id,clientX,clientY,showHandles=true){
  selE=id;selEHandles=showHandles;selN=null;selNSet.clear();render();
  if(!isMob()&&clientX!=null)showLpAt(clientX,clientY,id);
  else if(isMob()&&showHandles)showLSheet();
}
function deselAll(){selN=null;selE=null;selEHandles=true;selNSet.clear();closeLp();document.querySelectorAll('.touch-plus').forEach(el=>el.classList.remove('touch-plus'));render()}

