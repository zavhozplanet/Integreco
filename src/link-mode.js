/* ================================================================
   LINK MODE
================================================================ */
function startLinkMode(fromId){
  linkMode=true;linkFromId=fromId;
  document.getElementById('link-overlay').style.display='block';
  document.getElementById('link-hint').style.display='block';
  selNode(fromId);
}
function exitLinkMode(){
  linkMode=false;linkFromId=null;
  document.getElementById('link-overlay').style.display='none';
  document.getElementById('link-hint').style.display='none';
}
function handleLinkClick(toId){
  if(toId===linkFromId){exitLinkMode();return}
  const exists = edges.some(e => (e.from === linkFromId && e.to === toId) || (e.from === toId && e.to === linkFromId));
  if(exists) {
    toast('Связь уже существует');
    exitLinkMode();
    return;
  }
  const fromN=gN(linkFromId), toN=gN(toId);
  sh();
  const isToNote = toN && toN.type === 'note';
  const isFromNote = fromN && fromN.type === 'note';
  
  let e;
  if(isToNote || isFromNote) {
    // Note link: straight, dotted, medium, branch color
    const branchColor = fromN ? (fromN.color || LCOLS[0]) : LCOLS[0];
    e = {id:nid(),from:linkFromId,to:toId,shape:'straight',dash:'dotted',width:1.5,dir:'none',color:branchColor,cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false};
    edges.push(e);
  } else {
    // Regular link: use global defaults, dashed as default dash
    e = {id:nid(),from:linkFromId,to:toId,
      shape:glDefaults.shape||gls,
      dash:glDefaults.dash||'dashed',
      width:glDefaults.width||1.5,
      dir:glDefaults.dir||'none',
      color:glDefaults.color||LCOLS[0],
      cp1x:null,cp1y:null,cp2x:null,cp2y:null,collapsed:false,isLink:true};
    edges.push(e);
  }
  
  exitLinkMode();render();
  // Don't show line panel for existing node linking
}

