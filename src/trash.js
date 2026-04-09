/* ================================================================
   TRASH
================================================================ */
let selectedTrashItems = new Set();

function openTrash(){
  hideAllMenus();
  renderTrash();
  document.getElementById('tmod').classList.add('show');
}
function closeTrash(){document.getElementById('tmod').classList.remove('show')}
function renderTrash(){
  const list=document.getElementById('tlist');
  list.innerHTML='';
  selectedTrashItems.clear();
  updateTrashActions();
  
  if(!trash.length){
    list.innerHTML='<div class="ti-empty">Корзина пуста</div>';
    document.getElementById('t-select-all').checked = false;
    document.getElementById('t-select-all').disabled = true;
    return;
  }
  
  document.getElementById('t-select-all').disabled = false;
  document.getElementById('t-select-all').checked = false;
  
  trash.forEach((item, idx)=>{
    const div=document.createElement('div');
    div.className='ti';
    const icon = item.isFromNode ? '➔📝' : '📝';
    div.innerHTML=`
      <input type="checkbox" class="t-checkbox" data-idx="${idx}" onchange="toggleTrashItem(${idx}, this.checked)" style="width:18px;height:18px;cursor:pointer" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;gap:10px;flex:1" onclick="closeTrash();openNote(null,'view',${idx})">
        <span>${icon}</span> <span>${item.label || '+'}</span>
      </div>
    `;
    list.appendChild(div);
  });
}

function toggleTrashItem(idx, isChecked) {
  if(isChecked) selectedTrashItems.add(idx);
  else selectedTrashItems.delete(idx);
  
  const allChecked = selectedTrashItems.size === trash.length && trash.length > 0;
  document.getElementById('t-select-all').checked = allChecked;
  
  updateTrashActions();
}

function toggleAllTrash(isChecked) {
  const checkboxes = document.querySelectorAll('.t-checkbox');
  if(isChecked) {
    trash.forEach((_, idx) => selectedTrashItems.add(idx));
    checkboxes.forEach(cb => cb.checked = true);
  } else {
    selectedTrashItems.clear();
    checkboxes.forEach(cb => cb.checked = false);
  }
  updateTrashActions();
}

function updateTrashActions() {
  const actionsDiv = document.getElementById('t-actions');
  if(selectedTrashItems.size > 0) {
    actionsDiv.style.display = 'flex';
    const canCopyCut = selectedTrashItems.size === 1;
    document.getElementById('t-cut-btn').style.opacity = canCopyCut ? '1' : '0.3';
    document.getElementById('t-cut-btn').style.pointerEvents = canCopyCut ? 'auto' : 'none';
    document.getElementById('t-copy-btn').style.opacity = canCopyCut ? '1' : '0.3';
    document.getElementById('t-copy-btn').style.pointerEvents = canCopyCut ? 'auto' : 'none';
  } else {
    actionsDiv.style.display = 'none';
    document.getElementById('t-share-sub').style.display = 'none';
    document.getElementById('t-dl-sub').style.display = 'none';
  }
}

function toggleTShareMenu(ev) {
  if(ev) ev.stopPropagation();
  document.getElementById('t-share-sub').style.display = document.getElementById('t-share-sub').style.display === 'flex' ? 'none' : 'flex';
  document.getElementById('t-dl-sub').style.display = 'none';
}

function toggleTDlMenu(ev) {
  if(ev) ev.stopPropagation();
  document.getElementById('t-dl-sub').style.display = document.getElementById('t-dl-sub').style.display === 'flex' ? 'none' : 'flex';
  document.getElementById('t-share-sub').style.display = 'none';
}

function tAction(action) {
  if(selectedTrashItems.size === 0) return;
  
  const indices = Array.from(selectedTrashItems).sort((a,b) => b - a);
  
  if(action === 'cut' || action === 'copy') {
    if(indices.length !== 1) return;
    const item = trash[indices[0]];
    navigator.clipboard.writeText(item.note || '');
    toast(action === 'cut' ? 'Вырезано' : 'Скопировано');
    if(action === 'cut') {
      trash.splice(indices[0], 1);
      updateTrashBadge();
      renderTrash();
    }
  } else if(action === 'share-txt' || action === 'share-md') {
    let combinedText = '';
    indices.reverse().forEach(idx => {
      combinedText += (trash[idx].label || '+') + '\n' + (trash[idx].note || '') + '\n\n';
    });
    if(navigator.share){
      navigator.share({text:combinedText.trim()}).catch(()=>{});
    } else {
      toast('Скопируйте адрес из строки браузера');
    }
    document.getElementById('t-share-sub').style.display = 'none';
  } else if(action === 'dl-txt' || action === 'dl-md') {
    let combinedText = '';
    indices.reverse().forEach(idx => {
      combinedText += (trash[idx].label || '+') + '\n' + (trash[idx].note || '') + '\n\n';
    });
    const fmt = action === 'dl-txt' ? 'txt' : 'md';
    const blob=new Blob([combinedText.trim()],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`trash-notes.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
    document.getElementById('t-dl-sub').style.display = 'none';
  } else if(action === 'delete') {
    if(confirm(`Удалить выбранные заметки (${indices.length}) навсегда?`)) {
      indices.forEach(idx => trash.splice(idx, 1));
      updateTrashBadge();
      renderTrash();
    }
  }
}

function updateTrashBadge(){
  const b=document.getElementById('trash-badge');
  if(trash.length>0){b.classList.add('show');b.textContent=trash.length>9?'9+':trash.length}
  else b.classList.remove('show');
}

function centerOnNode(id){
  const n=gN(id);if(!n)return;
  const rc=wrap.getBoundingClientRect();
  const targetX=n.x,targetY=n.y;
  const viewW=rc.width/zoom,viewH=rc.height/zoom;
  panX=viewW/2-targetX;panY=viewH/2-targetY;
  render();
}

function hideCanvDblMenu(){canvDblMenu.style.display='none'}
function showCanvDblMenu(cx,cy){
  hideAllMenus();
  canvDblMenu.style.display='flex';
  posMenu(canvDblMenu, cx, cy);
  canvDblMenu._cx=cx;canvDblMenu._cy=cy;
}
function addFromDbl(type){
  hideCanvDblMenu();
  const rc=wrap.getBoundingClientRect();
  const p=s2c(canvDblMenu._cx-rc.left,canvDblMenu._cy-rc.top);
  sh();
  let id;
  if(type==='root') id=mkNode(p.x,p.y,'+',null,false,'root');
  else if(type==='node') id=mkNode(p.x,p.y,'+',null,false,'node');
  else if(type==='note') id=mkNode(p.x,p.y,'+',null,false,'note');
  else if(type==='group') id=mkNode(p.x,p.y,'Новая группа',null,false,'group');
  else if(type==='multi') id=mkNode(p.x,p.y,'+',null,false,'multi');
  render();selNode(id);
  if(type==='group'){
    if(isMob())showMobRename(id,true);else setTimeout(()=>editNode(id,true),50);
  } else if(type!=='note'){
    if(isMob())showMobRename(id,true);else setTimeout(()=>editNode(id,true),50);
  } else {
    openNote(id,'edit');
  }
}

window.addEventListener('click', (ev)=>{
  const nbm = document.getElementById('n-burger-menu');
  if(nbm.classList.contains('show') && !ev.target.closest('#n-burger')) {
    nbm.classList.remove('show');
  }
  if(mmenu.classList.contains('show') && !ev.target.closest('#btn-menu')) {
    mmenu.classList.remove('show');
  }
  const tShareSub = document.getElementById('t-share-sub');
  const tDlSub = document.getElementById('t-dl-sub');
  if(tShareSub && tShareSub.style.display === 'flex' && !ev.target.closest('#t-actions')) {
    tShareSub.style.display = 'none';
  }
  if(tDlSub && tDlSub.style.display === 'flex' && !ev.target.closest('#t-actions')) {
    tDlSub.style.display = 'none';
  }
});

