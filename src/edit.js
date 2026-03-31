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

