/* ================================================================
   CREATE / DELETE
================================================================ */
function mkEdge(fromId,toId,isLink){
  const fromN=gN(fromId), toN=gN(toId);
  const isToNote = toN && toN.type === 'note';
  const isFromNote = fromN && fromN.type === 'note';
  
  if(isToNote || isFromNote) {
    const branchColor = fromN ? (fromN.color || LCOLS[0]) : LCOLS[0];
    return {id:nid(),from:fromId,to:toId,shape:'straight',dash:'dotted',width:1.5,dir:'none',color:branchColor,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false,fromSide:null,toSide:null};
  }
  
  if(isLink){
    return {id:nid(),from:fromId,to:toId,
      shape:linkDefaults.shape||'straight',
      dash:linkDefaults.dash||'link',
      width:linkDefaults.width||1,
      dir:linkDefaults.dir||'none',
      color:linkDefaults.color||LCOLS[0],
      cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false,isLink:true,fromSide:null,toSide:null};
  }
  
  return{id:nid(),from:fromId,to:toId,
    shape:glDefaults.shape||'straight',
    dash:glDefaults.dash||'solid',
    color:glDefaults.color||LCOLS[0],
    width:glDefaults.width||1.5,
    dir:glDefaults.dir||'forward',
    cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false,fromSide:null,toSide:null};
}

function mkNode(x,y,label,pid,isLink,type='node', customStyle=null){
  const id=nid();
  const node = {id,x,y,label:label||'+',col:false,note:'',type,locked:false};
  if(customStyle) node.style = customStyle;
  else if(type==='node') node.style = JSON.parse(JSON.stringify(nodeDefaults.style));
  else if(type==='note') {
    node.style = { shape: 'pill', backgroundColor: '#fffdf0', borderColor: '#e6e0b0', padding: 12 };
  }
  if(type === 'group') {
    node.width = 300;
    node.height = 200;
    node.bg = {
      color: 'rgba(255, 255, 255, 0.1)',
      recentColors: [],
      pattern: 'none',
      patScale: 1,
      patOpacity: 0.15,
      patBlur: 0,
      image: null,
      imgEnabled: false,
      imgOpacity: 1,
      imgBlur: 0
    };
  } else if (type === 'multi') {
    // Estimate size for "1.5x longer than usual node"
    // Usually node size depends on text. Let's set a fixed starting width that's visibly wider.
    node.width = 240; // Default text node might be around ~100-150px
    node.height = 50;
    if(!customStyle) node.style = JSON.parse(JSON.stringify(nodeDefaults.style));
  }
  nodes.push(node);
  if(pid!=null) edges.push(mkEdge(pid,id,isLink));
  lastActiveNodeId=id;
  if(pid==null || type==='root') lastUsedMapRootId=id;
  updateTrashBadge();
  return id;
}

function delNode(id, reattach=true, skipTrash=false){
  sh();
  const n=gN(id);if(!n)return;
  if(!skipTrash) {
    if(n.type === 'note') {
      if(n.note || (n.label && n.label !== '+')) {
        trash.push({label:n.label, note:n.note, id:n.id, deletedAt:Date.now(), isFromNode: false});
        updateTrashBadge();
      }
    } else if(n.note) {
      trash.push({label:n.label, note:n.note, id:n.id, deletedAt:Date.now(), isFromNode: true});
      updateTrashBadge();
    }
  }
  const pid=gPar(id);
  const children=gCh(id);
  nodes=nodes.filter(n=>n.id!==id);
  edges=edges.filter(e=>e.from!==id&&e.to!==id);
  // reattach children to parent
  if(reattach&&pid!=null){
    children.forEach(cid=>{
      edges.push(mkEdge(pid,cid,false));
    });
  }
  if(selN===id)selN=null;
  render();
}

function delBranch(id, skipTrash=false){
  sh();
  function dr(i){
    const n=gN(i);
    if(n && !skipTrash) {
      if(n.type === 'note' && (n.note || (n.label && n.label !== '+'))) {
        trash.push({label:n.label, note:n.note, id:n.id, deletedAt:Date.now(), isFromNode: false});
      } else if(n.note) {
        trash.push({label:n.label, note:n.note, id:n.id, deletedAt:Date.now(), isFromNode: true});
      }
    }
    gCh(i).forEach(c=>dr(c));
    nodes=nodes.filter(n=>n.id!==i);
    edges=edges.filter(e=>e.from!==i&&e.to!==i);
  }
  dr(id);
  if(!skipTrash) updateTrashBadge();
  selN=null;render();
}

// Insert a new node at the midpoint of an edge (via LP button)
function insertNodeOnEdge(edgeId){
  const e=gE(edgeId);if(!e)return;
  const mid=edgePt(e,0.5);
  sh();
  const nodeId=mkNode(mid.x,mid.y,'+',null,false,'node');
  // New edges: keep style of original
  const e1={...e,id:nid(),to:nodeId,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false};
  const e2={...e,id:nid(),from:nodeId,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false};
  edges=edges.filter(x=>x.id!==edgeId);
  edges.push(e1,e2);
  selE=null;selN=nodeId;
  render();
  if(isMob())showMobRename(nodeId,true);
  else setTimeout(()=>editNode(nodeId,true),50);
}

// Insert an existing node between the two endpoints of an edge (drag-to-line)
function insertNodeBetween(edgeId, nodeId){
  const e=gE(edgeId);if(!e)return;
  // Don't insert if the node is already an endpoint
  if(e.from===nodeId||e.to===nodeId)return;
  sh();
  // Remove the existing edge; add two new ones: from→node, node→to
  const fromId=e.from, toId=e.to;
  const e1={...e,id:++idC,to:nodeId,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false};
  const e2={...e,id:++idC,from:nodeId,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false};
  // Remove existing edge from/to this node to avoid loops
  edges=edges.filter(x=>x.id!==edgeId);
  // Also remove existing parent edge of nodeId (so it gets re-rooted here)
  edges=edges.filter(x=>!(x.to===nodeId&&!x.isLink));
  edges.push(e1,e2);
  pruneGroupEdges();
  render();
  toast('\u2295 Узел встроен в линию');
}

