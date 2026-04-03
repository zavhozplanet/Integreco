/* ================================================================
   NODE EDITING
================================================================ */
function editNode(id, isNew=false){
  const n=gN(id);if(!n)return;
  const el=document.getElementById('nd'+id);if(!el)return;
  
  let targetContainer, sp;
  if(n.type === 'group') {
    targetContainer = el.querySelector('.group-title');
    sp = document.createElement('span'); // Dummy span
    sp.style.display = 'none';
    targetContainer.innerHTML = '';
    targetContainer.appendChild(sp);
  } else {
    targetContainer = el.querySelector('.ni');
    sp = targetContainer.querySelector('span');
    sp.style.display='none';
  }
  
  const ta=document.createElement('textarea');ta.className='nedit';ta.value=n.label;ta.placeholder=' ;)';ta.rows=1;
  targetContainer.insertBefore(ta,sp);ta.focus();ta.select();
  let isDone = false;
  const done=()=>{
    if(isDone) return;
    isDone = true;
    const val = ta.value.trim();
    if(val !== n.label) {
      if(!isNew) sh();
      n.label = val;
      saveToLocalStorage(); // ensure label persists even if render is skipped
    }
    if(!isRendering) render();
  };
  ta.addEventListener('blur',done);
  ta.addEventListener('keydown',ev=>{if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();ta.blur()}if(ev.key==='Escape'){isDone=true;render();}if(ev.key==='Tab'){ev.preventDefault();done();setTimeout(()=>addChild(id),50)}});
  ta.addEventListener('input',()=>{ta.style.height='auto';ta.style.height=ta.scrollHeight+'px'});
}

let groupResize={active:false};

function startGroupResize(ev, id){
  ev.stopPropagation();
  const n = gN(id);
  if(!n) return;
  const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
  const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
  groupResize = {
    active: true,
    id,
    startX: clientX,
    startY: clientY,
    startW: n.width,
    startH: n.height
  };
}

function updateGroupResize(ev){
  if(!groupResize.active) return;
  const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
  const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
  const dx = (clientX - groupResize.startX) / zoom;
  const dy = (clientY - groupResize.startY) / zoom;
  const n = gN(groupResize.id);
  if(n){
    n.width = Math.max(100, groupResize.startW + dx);
    n.height = Math.max(50, groupResize.startH + dy);
    render();
  }
}

function endGroupResize(){
  if(groupResize.active){
    groupResize.active = false;
    sh();
  }
}

function editEdge(eid){
  const e=gE(eid);if(!e)return;
  const mid=edgePt(e,0.5);
  const sp=c2s(mid.x, mid.y);
  
  // Cleanup any old editor just in case
  const old=document.getElementById('edge-editor-active'); if(old)old.remove();

  const ta=document.createElement('textarea');
  ta.id='edge-editor-active';
  ta.className='edge-edit';
  ta.value=e.label||'';
  ta.placeholder='';
  ta.rows=1;
  
  // Extremely visible styling for debugging/visibility
  ta.style.left=sp.x+'px';ta.style.top=sp.y+'px';
  ta.style.transform='translate(-50%,-50%)';
  ta.style.border='2px solid #4a7cf7'; 
  
  const container = document.getElementById('wrap') || document.body;
  container.appendChild(ta);
  
  setTimeout(()=>{
    ta.focus();
    ta.select();
    // Auto-resize
    ta.style.height='auto';ta.style.height=ta.scrollHeight+'px';
  },50);

  let done=false;
  const finish=()=>{
    if(done)return;done=true;
    const val=ta.value.trim();
    if(val!==e.label){sh();e.label=val;saveToLocalStorage();}
    ta.remove();render();
  };
  ta.addEventListener('blur',finish);
  ta.addEventListener('keydown',ev=>{
    if(ev.key==='Enter'&&!ev.shiftKey){ev.preventDefault();ta.blur()}
    if(ev.key==='Escape'){done=true;ta.remove();render()}
  });
}

