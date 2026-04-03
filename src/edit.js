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

function startGroupResize(ev, id, corner){
  ev.stopPropagation();
  const n = gN(id);
  if(!n) return;
  // fixed point is the opposite corner
  let fx = n.x + n.width/2, fy = n.y + n.height/2;
  if(corner.includes('r')) fx = n.x - n.width/2;
  if(corner.includes('b')) fy = n.y - n.height/2;

  groupResize = { active: true, id, fx, fy };
  document.body.classList.add('is-resizing');
}

function updateGroupResize(ev){
  if(!groupResize.active) return;
  const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
  const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
  const rc = wrap.getBoundingClientRect();
  const p = s2c(clientX - rc.left, clientY - rc.top);
  const n = gN(groupResize.id);
  if(n){
    n.width = Math.max(100, Math.abs(p.x - groupResize.fx));
    n.height = Math.max(70, Math.abs(p.y - groupResize.fy));
    n.x = (p.x + groupResize.fx) / 2;
    n.y = (p.y + groupResize.fy) / 2;
    render();
  }
}

function endGroupResize(){
  if(groupResize.active){
    groupResize.active = false;
    document.body.classList.remove('is-resizing');
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

