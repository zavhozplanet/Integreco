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

async function saveTrashToFS(item) {
  if (!window.storageAPI || !window.storageAPI.dirHandle) return;
  const filename = item.kind === 'map' ? item.filename : `note_${item.id || Date.now()}_${(item.label || 'note').substring(0,20).replace(/[^a-z0-9]/gi, '_')}.json`;
  item.fsFilename = filename; 
  await window.storageAPI.saveTrashItem(filename, JSON.stringify(item));
}

async function deleteTrashFromFS(item) {
  if (!window.storageAPI || !window.storageAPI.dirHandle || !item.fsFilename) return;
  await window.storageAPI.deleteTrashItem(item.fsFilename);
}

async function loadTrashFromFS() {
  if (!window.storageAPI || !window.storageAPI.dirHandle) return;
  const files = await window.storageAPI.listTrashFiles();
  const fsItems = [];
  for (let f of files) {
    try {
      const handle = f.handle;
      const file = await handle.getFile();
      const text = await file.text();
      const parsed = JSON.parse(text);
      if(!parsed.time && parsed.deletedAt) parsed.time = parsed.deletedAt;
      parsed.fsFilename = f.name;
      fsItems.push(parsed);
    } catch (e) {
      console.warn('Failed to load trash item from FS', f.name, e);
    }
  }
  
  fsItems.forEach(fsItem => {
    const exists = trash.find(mItem => 
      (mItem.kind === 'map' && mItem.filename === fsItem.filename) || 
      (mItem.kind !== 'map' && mItem.id === fsItem.id && fsItem.id)
    );
    if (!exists) {
      trash.push(fsItem);
    } else {
      exists.fsFilename = fsItem.fsFilename;
    }
  });
  
  trash.sort((a,b) => (b.time||b.deletedAt||0) - (a.time||a.deletedAt||0));
  updateTrashBadge();
}

function renderTrash(){
  const list=document.getElementById('tlist');
  list.innerHTML='';
  selectedTrashItems.clear();
  updateTrashActions();
  
  if(!trash.length){
    list.innerHTML='<div class="ti-empty">Корзина пуста</div>';
    if(document.getElementById('t-select-all')) {
      document.getElementById('t-select-all').checked = false;
      document.getElementById('t-select-all').disabled = true;
    }
    if(document.getElementById('t-clear-btn')) document.getElementById('t-clear-btn').style.display = 'none';
    return;
  }
  
  if(document.getElementById('t-select-all')) document.getElementById('t-select-all').disabled = false;
  if(document.getElementById('t-clear-btn')) document.getElementById('t-clear-btn').style.display = 'inline-block';
  
  trash.forEach((item, idx)=>{
    const div=document.createElement('div');
    div.className='ti';
    const isMap = item.kind === 'map';
    const icon = isMap ? '🗺️' : (item.isFromNode ? '➔📝' : '📝');
    let clickAction = isMap ? "" : `onclick="closeTrash();openNote(null,'view',${idx})"`;
    
    div.innerHTML=`
      <input type="checkbox" class="t-checkbox" data-idx="${idx}" onchange="toggleTrashItem(${idx}, this.checked)" style="width:18px;height:18px;cursor:pointer" onclick="event.stopPropagation()">
      <div style="display:flex;align-items:center;gap:10px;flex:1;${isMap?'cursor:default':''}" ${clickAction}>
        <span style="font-size:18px">${icon}</span> 
        <div style="display:flex;flex-direction:column">
          <span style="font-weight:600">${item.label || (isMap ? item.filename : '+')}</span>
          <span style="font-size:10px;color:var(--mu)">${new Date(item.deletedAt || item.time).toLocaleString()}</span>
        </div>
      </div>
    `;
    list.appendChild(div);
  });
}

function toggleTrashItem(idx, isChecked) {
  if(isChecked) selectedTrashItems.add(idx);
  else selectedTrashItems.delete(idx);
  
  const allChecked = selectedTrashItems.size === trash.length && trash.length > 0;
  if(document.getElementById('t-select-all')) document.getElementById('t-select-all').checked = allChecked;
  
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
  if(!actionsDiv) return;
  if(selectedTrashItems.size > 0) {
    actionsDiv.style.display = 'flex';
    const canCopyCut = selectedTrashItems.size === 1;
    document.getElementById('t-cut-btn').style.opacity = canCopyCut ? '1' : '0.3';
    document.getElementById('t-cut-btn').style.pointerEvents = canCopyCut ? 'auto' : 'none';
    document.getElementById('t-copy-btn').style.opacity = canCopyCut ? '1' : '0.3';
    document.getElementById('t-copy-btn').style.pointerEvents = canCopyCut ? 'auto' : 'none';
  } else {
    actionsDiv.style.display = 'none';
    if(document.getElementById('t-share-sub')) document.getElementById('t-share-sub').style.display = 'none';
    if(document.getElementById('t-dl-sub')) document.getElementById('t-dl-sub').style.display = 'none';
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

function tAction(action, singleIdx = null) {
  const indices = (singleIdx !== null) ? [singleIdx] : Array.from(selectedTrashItems).sort((a,b) => b - a);
  
  if(action === 'clear-all') {
    if(confirm('Очистить корзину полностью? Это действие необратимо.')) {
      (async () => {
        for(let item of trash) {
          await deleteTrashFromFS(item);
        }
        trash = [];
        updateTrashBadge();
        if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
        renderTrash();
      })();
    }
    return;
  }

  if(indices.length === 0) return;
  
  if(action === 'restore') {
     (async () => {
       let restoredCount = 0;
       for(let idx of indices) {
         const item = trash[idx];
         if(item.kind === 'map') {
            if(window.storageAPI && window.storageAPI.dirHandle) {
              const ok = await window.storageAPI.saveData(item.data, item.filename);
              if(ok) {
                await deleteTrashFromFS(item);
                trash.splice(idx, 1);
                restoredCount++;
              }
            }
         } else {
            // Restore object (note text)
            const n = gN(item.id);
            if(!n) {
               toast('Узел для восстановления заметки не найден', 3000);
               continue;
            }
            // Constraint: Object restoration only if no new objects were moved/created
            if(lastMapMutationTime > (item.deletedAt + 1000)) { // 1s buffer for deletion mutation
               toast('Карта была изменена. Восстановление узла «'+(n.label||n.id)+'» невозможно.', 3000);
               continue;
            }
            // Constraint: Note restoration only if parent text wasn't edited
            if(n.updatedAt > item.deletedAt) {
               toast('Текст узла «'+(n.label||n.id)+'» был изменен. Восстановление заметки невозможно.', 3000);
               continue;
            }

            sh();
            n.note = item.note;
            await deleteTrashFromFS(item);
            trash.splice(idx, 1);
            restoredCount++;
         }
       }
       if(restoredCount > 0) {
         toast('Восстановлено объектов: ' + restoredCount);
         updateTrashBadge();
         if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
         renderTrash();
         if(typeof refreshCatalog === 'function') refreshCatalog();
         render();
       }
     })();
     return;
  }
  
  if(action === 'cut' || action === 'copy') {
    if(indices.length !== 1) return;
    const item = trash[indices[0]];
    navigator.clipboard.writeText(item.note || '');
    toast(action === 'cut' ? 'Вырезано' : 'Скопировано');
    if(action === 'cut') {
      const item = trash[indices[0]];
      deleteTrashFromFS(item);
      trash.splice(indices[0], 1);
      updateTrashBadge();
      if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
      renderTrash();
    }
  } else if(action === 'share-txt' || action === 'share-md') {
    let combinedText = '';
    indices.forEach(idx => {
       if(trash[idx].kind !== 'map') {
         combinedText += (trash[idx].label || '+') + '\n' + (trash[idx].note || '') + '\n\n';
       }
    });
    if(navigator.share && combinedText){
      navigator.share({text:combinedText.trim()}).catch(()=>{});
    } else if(combinedText) {
      navigator.clipboard.writeText(combinedText.trim());
      toast('Текст скопирован в буфер обмена');
    }
    if(document.getElementById('t-share-sub')) document.getElementById('t-share-sub').style.display = 'none';
  } else if(action === 'dl-txt' || action === 'dl-md') {
    let combinedText = '';
    indices.forEach(idx => {
       if(trash[idx].kind !== 'map') {
         combinedText += (trash[idx].label || '+') + '\n' + (trash[idx].note || '') + '\n\n';
       }
    });
    if(!combinedText) return;
    const fmt = action === 'dl-txt' ? 'txt' : 'md';
    const blob=new Blob([combinedText.trim()],{type:'text/plain'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');
    a.href=url;
    a.download=`trash-notes.${fmt}`;
    a.click();
    URL.revokeObjectURL(url);
    if(document.getElementById('t-dl-sub')) document.getElementById('t-dl-sub').style.display = 'none';
  } else if(action === 'delete') {
    if(confirm(`Удалить выбранные объекты (${indices.length}) навсегда?`)) {
      (async () => {
        const sorted = [...indices].sort((a,b)=>b-a);
        for(let idx of sorted) {
          const item = trash[idx];
          await deleteTrashFromFS(item);
          trash.splice(idx, 1);
        }
        updateTrashBadge();
        if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
        renderTrash();
      })();
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
  canvDblMenu.classList.remove('from-plus');
  const rootItem = canvDblMenu.querySelector('.cdm-root-node');
  if(rootItem) rootItem.style.display = 'flex';
  canvDblMenu.style.display='flex';
  posMenu(canvDblMenu, cx, cy);
  canvDblMenu._cx=cx;canvDblMenu._cy=cy;
}
function showPlusCtx(ev, nodeId, dirHint, sensorPos){
  ev.preventDefault();
  ev.stopPropagation();
  hideAllMenus();
  canvDblMenu.classList.add('from-plus');
  const rootItem = canvDblMenu.querySelector('.cdm-root-node');
  if(rootItem) rootItem.style.display = 'none';
  canvDblMenu.style.display='flex';
  posMenu(canvDblMenu, ev.clientX, ev.clientY);
  canvDblMenu._cx=ev.clientX;canvDblMenu._cy=ev.clientY;
  canvDblMenu._plusNodeId = nodeId;
  canvDblMenu._plusDir = dirHint;
  canvDblMenu._targetPoint = null;
  
  // Calculate canvas coordinates of the click for potential fixed start point
  const rc = wrap.getBoundingClientRect();
  canvDblMenu._plusStartPoint = s2c(ev.clientX - rc.left, ev.clientY - rc.top);
}
function showPlusCtxAfterDrag(ev, nodeId, dirHint, targetPoint, startPoint){
  hideAllMenus();
  canvDblMenu.classList.add('from-plus');
  const rootItem = canvDblMenu.querySelector('.cdm-root-node');
  if(rootItem) rootItem.style.display = 'none';
  canvDblMenu.style.display='flex';
  posMenu(canvDblMenu, ev.clientX, ev.clientY);
  canvDblMenu._cx=ev.clientX;canvDblMenu._cy=ev.clientY;
  canvDblMenu._plusNodeId = nodeId;
  canvDblMenu._plusDir = dirHint;
  canvDblMenu._targetPoint = targetPoint;
  canvDblMenu._plusStartPoint = startPoint;
}
function addFromDbl(type){
  const fromPlus = canvDblMenu.classList.contains('from-plus');
  hideCanvDblMenu();
  if(fromPlus){
    if (canvDblMenu._targetPoint) {
       addChildTypeAt(canvDblMenu._plusNodeId, canvDblMenu._targetPoint, canvDblMenu._plusStartPoint, type);
    } else {
       addChildType(canvDblMenu._plusNodeId, canvDblMenu._plusDir, canvDblMenu._plusStartPoint, type);
    }
    return;
  }
  const rc=wrap.getBoundingClientRect();
  const p=s2c(canvDblMenu._cx-rc.left,canvDblMenu._cy-rc.top);
  sh();
  let id;
  if(type==='root') id = mkNode(p.x,p.y,'+',null,false,'root');
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

