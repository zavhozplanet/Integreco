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
  const sourceEl = (n.type === 'group') ? targetContainer : sp;
  if(sourceEl) {
    ta.style.color = window.getComputedStyle(sourceEl).color;
  }
  targetContainer.insertBefore(ta,sp);ta.focus();ta.select();
  let isDone = false;
  const done=()=>{
    if(isDone) return;
    isDone = true;
    const val = ta.value.trim();
    if(val !== n.label) {
      if(!isNew) sh();
      else hasUnsavedChanges = true; // Mark as modified even if skipping history
      n.label = val;
      saveToLocalStorage(); // ensure label persists even if render is skipped
      // Auto-name the map file when first title is set for a root node on a new map
      if(n.type === 'root' && typeof autoNameMapFile === 'function') {
        autoNameMapFile(val);
      }
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
  const ext = nodeHalfExtents(id);
  const w = ext.hw * 2;
  const h = ext.hh * 2;
  let fx = n.x + w/2, fy = n.y + h/2;
  if(corner.includes('r')) fx = n.x - w/2;
  if(corner.includes('b')) fy = n.y - h/2;

  groupResize = { active: true, id, fx, fy };
  document.body.classList.add('is-resizing');
}

function updateGroupResize(ev){
  if(!groupResize.active) return;
  const clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
  const clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
  const rc = wrap.getBoundingClientRect();
  let p = s2c(clientX - rc.left, clientY - rc.top);
  const n = gN(groupResize.id);
  if(n){
    let minAllowedX = null, maxAllowedX = null;
    let minAllowedY = null, maxAllowedY = null;
    if (n.type === 'multi') {
      const margin = 16; // some UI padding space
      edges.forEach(e => {
        if (e.from === n.id || e.to === n.id) {
          const side = e.from === n.id ? 'from' : 'to';
          if (e[side + 'Side'] && e[side + 'Offset'] != null) {
            const isH = e[side + 'Side'] === 't' || e[side + 'Side'] === 'b';
            const offset = e[side + 'Offset'];
            if (isH) {
              const absX = n.x + offset;
              if (minAllowedX == null || absX < minAllowedX) minAllowedX = absX;
              if (maxAllowedX == null || absX > maxAllowedX) maxAllowedX = absX;
            } else {
              const absY = n.y + offset;
              if (minAllowedY == null || absY < minAllowedY) minAllowedY = absY;
              if (maxAllowedY == null || absY > maxAllowedY) maxAllowedY = absY;
            }
          }
        }
      });
      if (minAllowedX != null) {
        if (p.x > groupResize.fx) p.x = Math.max(p.x, maxAllowedX + margin);
        else p.x = Math.min(p.x, minAllowedX - margin);
      }
      if (minAllowedY != null) {
        if (p.y > groupResize.fy) p.y = Math.max(p.y, maxAllowedY + margin);
        else p.y = Math.min(p.y, minAllowedY - margin);
      }
    }

    const oldX = n.x, oldY = n.y;
    const minW = n.type === 'multi' ? 40 : 100;
    const minH = n.type === 'multi' ? 40 : 70;
    n.width = Math.max(minW, Math.abs(p.x - groupResize.fx));
    n.height = Math.max(minH, Math.abs(p.y - groupResize.fy));
    n.x = (p.x + groupResize.fx) / 2;
    n.y = (p.y + groupResize.fy) / 2;
    
    // adjust offsets for multi so lines stay stationary
    if (n.type === 'multi') {
      const shiftX = n.x - oldX;
      const shiftY = n.y - oldY;
      if (shiftX !== 0 || shiftY !== 0) {
        edges.forEach(e => {
          if (e.from === n.id || e.to === n.id) {
            const side = e.from === n.id ? 'from' : 'to';
            if (e[side + 'Side'] && e[side + 'Offset'] != null) {
              const isH = e[side + 'Side'] === 't' || e[side + 'Side'] === 'b';
              if (isH && shiftX !== 0) e[side + 'Offset'] -= shiftX;
              else if (!isH && shiftY !== 0) e[side + 'Offset'] -= shiftY;
            }
          }
        });
      }
    }
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

