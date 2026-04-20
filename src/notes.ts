// @ts-nocheck
/* ================================================================
   NOTES
================================================================ */
let currentTrashIndex = null;

function openNote(id, mode='edit', fromTrashIndex=null){
  let n;
  currentTrashIndex = fromTrashIndex;
  
  const backBtn = document.getElementById('n-back-btn');
  const doneBtn = document.getElementById('n-done-btn');
  const pasteBtn = document.getElementById('n-paste-btn');
  const footer = document.getElementById('nfooter');
  const titleInput = document.getElementById('ntitle');
  const areaInput = document.getElementById('narea');

  if(fromTrashIndex !== null) {
    n = trash[fromTrashIndex];
    noteNodeId = null; // not a live node
    
    backBtn.style.display = 'block';
    doneBtn.style.display = 'none';
    pasteBtn.style.display = 'none';
    footer.style.display = 'none';
    titleInput.readOnly = true;
    areaInput.readOnly = true;
    
    document.getElementById('n-trash-btn').style.display = 'none';
    document.getElementById('n-del-btn').style.display = 'flex';
    
    mode = 'view';
  } else {
    n = gN(id); if(!n) return;
    noteNodeId = id;
    
    backBtn.style.display = 'none';
    doneBtn.style.display = 'block';
    pasteBtn.style.display = 'flex';
    footer.style.display = 'flex';
    titleInput.readOnly = false;
    areaInput.readOnly = false;
    
    document.getElementById('n-trash-btn').style.display = 'flex';
    document.getElementById('n-del-btn').style.display = 'flex';
  }
  
  const isLabelEmpty = !n.label || String(n.label).trim() === '' || n.label === '+' || n.label === 'Группа';
  const isNoteEmpty = !n.note || String(n.note).trim() === '';

  if (fromTrashIndex === null && mode === 'auto') {
    if (isLabelEmpty) mode = 'edit';
    else if (isNoteEmpty) mode = 'edit';
    else mode = 'view';
  }

  if (fromTrashIndex === null) {
    if (isLabelEmpty && !n.titleStyle) {
      n.titleStyle = JSON.parse(JSON.stringify(noteDefaults.title));
    }
    if (isNoteEmpty && !n.noteStyle) {
      n.noteStyle = JSON.parse(JSON.stringify(noteDefaults.text));
    }
  }

  titleInput.value = n.label === '+' ? '' : (n.label || '');
  areaInput.value = n.note || '';

  // Apply styles
  const resetStyles = (el) => {
    el.style.fontFamily = '';
    el.style.fontWeight = '';
    el.style.fontStyle = '';
    el.style.fontSize = '';
    el.style.color = '';
    el.style.textAlign = '';
  };
  resetStyles(titleInput);
  resetStyles(areaInput);
  
  const ts = n.titleStyle;
  if (ts) {
    if(ts.fontFamily) titleInput.style.fontFamily = ts.fontFamily;
    if(ts.fontWeight) titleInput.style.fontWeight = ts.fontWeight;
    if(ts.fontStyle) titleInput.style.fontStyle = ts.fontStyle;
    if(ts.fontSize) titleInput.style.fontSize = ts.fontSize + 'px';
    if(ts.color) titleInput.style.color = ts.color;
    if(ts.textAlign) titleInput.style.textAlign = ts.textAlign;
  } else {
    titleInput.style.fontSize = '15px';
    titleInput.style.textAlign = 'left';
    titleInput.style.color = '#2c2a27';
  }
  
  const ns = n.noteStyle;
  if (ns) {
    if(ns.fontFamily) areaInput.style.fontFamily = ns.fontFamily;
    if(ns.fontWeight) areaInput.style.fontWeight = ns.fontWeight;
    if(ns.fontStyle) areaInput.style.fontStyle = ns.fontStyle;
    if(ns.fontSize) areaInput.style.fontSize = ns.fontSize + 'px';
    if(ns.color) areaInput.style.color = ns.color;
    if(ns.textAlign) areaInput.style.textAlign = ns.textAlign;
  } else {
    areaInput.style.fontSize = '14px';
    areaInput.style.textAlign = 'left';
    areaInput.style.color = '#2c2a27';
  }

  renderNoteTitleView();
  renderNoteAreaView();
  document.getElementById('nmod').classList.add('show');
  
  setTimeout(()=>{
    if(mode==='edit' && fromTrashIndex === null) {
      if(isLabelEmpty) editNoteTitle();
      else editNoteArea();
    }
  }, 200);
}
function closeNote(){
  if(noteNodeId) {
    const n=gN(noteNodeId);
    if(n) {
      const newNote = document.getElementById('narea').value.trim();
      const newLabel = document.getElementById('ntitle').value.trim();
      if(n.note !== newNote || (newLabel && n.label !== newLabel)) {
        sh();
        const wasLabelEmpty = !n.label || String(n.label).trim() === '' || n.label === '+' || n.label === 'Группа';
        const wasNoteEmpty = !n.note || String(n.note).trim() === '';
        
        n.note = newNote;
        if(newLabel) n.label = newLabel;
        
        if (wasLabelEmpty && !n.titleStyle && newLabel) {
          n.titleStyle = JSON.parse(JSON.stringify(noteDefaults.title));
        }
        if (wasNoteEmpty && !n.noteStyle && newNote) {
          n.noteStyle = JSON.parse(JSON.stringify(noteDefaults.text));
        }
        
        render();
        if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
      }
    }
  }
  document.getElementById('nmod').classList.remove('show');
  document.getElementById('n-burger-menu').classList.remove('show');
  document.getElementById('n-dl-sub').classList.remove('show');
  noteNodeId=null;
  currentTrashIndex=null;
}
function closeNoteAndOpenTrash() {
  closeNote();
  openTrash();
}
function updateNoteTabUI() {
  const ntitle = document.getElementById('ntitle');
  const narea = document.getElementById('narea');
  const isEditing = (ntitle && ntitle.style.display !== 'none') || (narea && narea.style.display !== 'none');
  const eb = document.getElementById('ntab-e');
  const vb = document.getElementById('ntab-v');
  if(eb) eb.classList.toggle('on', isEditing);
  if(vb) vb.classList.toggle('on', !isEditing);
}

function noteTab(mode) {
  if (mode === 'edit') {
    editNoteTitle();
    editNoteArea();
  } else {
    renderNoteTitleView();
    renderNoteAreaView();
  }
  updateNoteTabUI();
}

function renderNoteTitleView() {
  const ntitle = document.getElementById('ntitle');
  const ntitleView = document.getElementById('ntitle-view');
  if(!ntitle || !ntitleView) return;
  const txt = ntitle.value.trim();
  ntitleView.innerHTML = txt ? parseMd(txt) : '<span style="color:var(--mu)">+</span>';
  
  ntitleView.style.fontFamily = ntitle.style.fontFamily;
  ntitleView.style.fontWeight = ntitle.style.fontWeight;
  ntitleView.style.fontStyle = ntitle.style.fontStyle;
  ntitleView.style.fontSize = ntitle.style.fontSize;
  ntitleView.style.color = ntitle.style.color;
  ntitleView.style.textAlign = ntitle.style.textAlign;
  
  ntitle.style.display = 'none';
  ntitleView.style.display = 'block';
  
  // Also save changes to node if different
  if (noteNodeId) {
    const n = gN(noteNodeId);
    if (n && n.label !== txt) {
      sh();
      const wasEmpty = !n.label || String(n.label).trim() === '' || n.label === '+' || n.label === 'Группа';
      n.label = txt;
      if (wasEmpty && !n.titleStyle && txt) {
        n.titleStyle = JSON.parse(JSON.stringify(noteDefaults.title));
        const ts = n.titleStyle;
        if(ts.fontFamily) ntitleView.style.fontFamily = ntitle.style.fontFamily = ts.fontFamily;
        if(ts.fontWeight) ntitleView.style.fontWeight = ntitle.style.fontWeight = ts.fontWeight;
        if(ts.fontStyle) ntitleView.style.fontStyle = ntitle.style.fontStyle = ts.fontStyle;
        if(ts.fontSize) ntitleView.style.fontSize = ntitle.style.fontSize = ts.fontSize + 'px';
        if(ts.color) ntitleView.style.color = ntitle.style.color = ts.color;
        if(ts.textAlign) ntitleView.style.textAlign = ntitle.style.textAlign = ts.textAlign;
      }
      render();
      if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
    }
  }
  updateNoteTabUI();
}

function editNoteTitle() {
  const ntitle = document.getElementById('ntitle');
  const ntitleView = document.getElementById('ntitle-view');
  if(ntitle && ntitleView && !ntitle.readOnly) {
    ntitleView.style.display = 'none';
    ntitle.style.display = 'block';
    ntitle.focus();
    updateNoteTabUI();
  }
}

function renderNoteAreaView() {
  const narea = document.getElementById('narea');
  const nrendered = document.getElementById('nrendered');
  const fmtBtn = document.getElementById('n-fmt-text-btn');
  if(!narea || !nrendered) return;
  
  const txt = narea.value;
  nrendered.innerHTML = txt.trim() ? parseMd(txt) : '<span style="color:var(--mu)">+</span>';
  
  nrendered.style.fontFamily = narea.style.fontFamily;
  nrendered.style.fontWeight = narea.style.fontWeight;
  nrendered.style.fontStyle = narea.style.fontStyle;
  nrendered.style.fontSize = narea.style.fontSize;
  nrendered.style.color = narea.style.color;
  nrendered.style.textAlign = narea.style.textAlign;
  
  narea.style.display = 'none';
  nrendered.style.display = 'block';
  if(fmtBtn) fmtBtn.style.display = 'none';
  
  // Save changes
  if (noteNodeId) {
    const n = gN(noteNodeId);
    if (n && n.note !== txt.trim()) {
      sh();
      const wasEmpty = !n.note || String(n.note).trim() === '';
      n.note = txt.trim();
      if (wasEmpty && !n.noteStyle && txt.trim()) {
        n.noteStyle = JSON.parse(JSON.stringify(noteDefaults.text));
        const ns = n.noteStyle;
        if(ns.fontFamily) nrendered.style.fontFamily = narea.style.fontFamily = ns.fontFamily;
        if(ns.fontWeight) nrendered.style.fontWeight = narea.style.fontWeight = ns.fontWeight;
        if(ns.fontStyle) nrendered.style.fontStyle = narea.style.fontStyle = ns.fontStyle;
        if(ns.fontSize) nrendered.style.fontSize = narea.style.fontSize = ns.fontSize + 'px';
        if(ns.color) nrendered.style.color = narea.style.color = ns.color;
        if(ns.textAlign) nrendered.style.textAlign = narea.style.textAlign = ns.textAlign;
      }
      render();
      if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
    }
  }
  updateNoteTabUI();
}

function editNoteArea() {
  const narea = document.getElementById('narea');
  const nrendered = document.getElementById('nrendered');
  const fmtBtn = document.getElementById('n-fmt-text-btn');
  if(narea && nrendered && !narea.readOnly) {
    nrendered.style.display = 'none';
    narea.style.display = 'block';
    if(fmtBtn) fmtBtn.style.display = 'block';
    narea.focus();
    updateNoteTabUI();
  }
}
function toggleNBurger(ev){
  if(ev) ev.stopPropagation();
  document.getElementById('n-burger-menu').classList.toggle('show');
}
function toggleNDlSub(){document.getElementById('n-dl-sub').classList.toggle('show')}
function copyNote(){const txt=document.getElementById('narea').value;navigator.clipboard.writeText(txt);toast('Скопировано')}
function cutNote(){const txt=document.getElementById('narea').value;navigator.clipboard.writeText(txt);document.getElementById('narea').value='';toast('Вырезано')}
async function pasteNote(){const txt=await navigator.clipboard.readText();const area=document.getElementById('narea');const start=area.selectionStart;const end=area.selectionEnd;area.value=area.value.substring(0,start)+txt+area.value.substring(end);toast('Вставлено')}
function shareNote(){const txt=document.getElementById('narea').value;if(navigator.share){navigator.share({text:txt}).catch(()=>{})}else{toast('Скопируйте адрес из строки браузера')}}
function downloadNote(fmt){const txt=document.getElementById('narea').value;const blob=new Blob([txt],{type:'text/plain'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=`note-${noteNodeId||'trash'}.${fmt}`;a.click();URL.revokeObjectURL(url)}
function trashNote(){
  if(currentTrashIndex !== null) return;
  const n = gN(noteNodeId);
  if(!n) return;
  
  if(confirm('Переместить заметку в корзину?')){
    sh();
    const isStandalone = n.type === 'note';
    const item = {
      label: n.label, 
      note: n.note, 
      id: n.id, 
      deletedAt: Date.now(),
      isFromNode: !isStandalone
    };
    trash.push(item);
    updateTrashBadge();
    if(typeof saveTrashToFS === 'function') saveTrashToFS(item);
    if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
    
    if(isStandalone) {
      const id = noteNodeId;
      closeNote();
      delNode(id, true, true);
    } else {
      n.note = '';
      closeNote();
      render();
    }
  }
}
function deleteNote(){
  if(currentTrashIndex !== null) {
    if(confirm('Удалить заметку навсегда?')){
      trash.splice(currentTrashIndex, 1);
      updateTrashBadge();
      closeNoteAndOpenTrash();
    }
    return;
  }
  
  const n = gN(noteNodeId);
  if(!n) return;
  
  if(confirm('Удалить заметку навсегда?')){
    sh();
    const isStandalone = n.type === 'note';
    if(isStandalone) {
      const id = noteNodeId;
      closeNote();
      delNode(id, true, true);
    } else {
      n.note = '';
      closeNote();
      render();
    }
  }
}

