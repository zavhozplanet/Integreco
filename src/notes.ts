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

  noteTab(mode, false);
  document.getElementById('nmod').classList.add('show');
  
  setTimeout(()=>{
    if(mode==='edit' && fromTrashIndex === null) {
      if(isLabelEmpty) titleInput.focus();
      else areaInput.focus();
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
function noteTab(mode, autoFocus=true){
  const ntitle = document.getElementById('ntitle');
  const ntitleView = document.getElementById('ntitle-view');
  const narea = document.getElementById('narea');
  const nrendered = document.getElementById('nrendered');
  
  if(mode==='view'){
    // Render Title
    const ttxt = ntitle.value.trim();
    ntitleView.innerHTML = ttxt ? parseMd(ttxt) : '<span style="color:var(--mu)">+</span>';
    ntitleView.style.fontFamily = ntitle.style.fontFamily;
    ntitleView.style.fontWeight = ntitle.style.fontWeight;
    ntitleView.style.fontStyle = ntitle.style.fontStyle;
    ntitleView.style.fontSize = ntitle.style.fontSize;
    ntitleView.style.color = ntitle.style.color;
    ntitleView.style.textAlign = ntitle.style.textAlign;
    ntitle.style.display = 'none';
    ntitleView.style.display = 'block';

    // Render Area
    const txt = narea.value;
    nrendered.innerHTML = txt.trim() ? parseMd(txt) : '<span style="color:var(--mu)">+</span>';
    nrendered.style.fontFamily = narea.style.fontFamily;
    nrendered.style.fontWeight = narea.style.fontWeight;
    nrendered.style.fontStyle = narea.style.fontStyle;
    nrendered.style.fontSize = narea.style.fontSize;
    nrendered.style.color = narea.style.color;
    nrendered.style.textAlign = narea.style.textAlign;
    narea.style.display='none';
    nrendered.style.display='block';

    const vb = document.getElementById('ntab-v');
    const eb = document.getElementById('ntab-e');
    if(vb) vb.classList.add('on');
    if(eb) eb.classList.remove('on');
    const fmtBtn = document.getElementById('n-fmt-text-btn');
    if(fmtBtn) fmtBtn.style.display='none';
  } else {
    ntitle.style.display = 'block';
    ntitleView.style.display = 'none';
    narea.style.display='block';
    nrendered.style.display='none';
    
    const eb = document.getElementById('ntab-e');
    const vb = document.getElementById('ntab-v');
    if(eb) eb.classList.add('on');
    if(vb) vb.classList.remove('on');
    const fmtBtn = document.getElementById('n-fmt-text-btn');
    if(fmtBtn) fmtBtn.style.display='block';
    
    if(autoFocus) {
      const isTitleEmpty = !ntitle.value.trim();
      if(isTitleEmpty) ntitle.focus();
      else narea.focus();
    }
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

