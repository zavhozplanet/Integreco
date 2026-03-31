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
  
  if (fromTrashIndex === null && mode === 'auto') {
    if (!n.label) mode = 'edit';
    else if (!n.note) mode = 'edit';
    else mode = 'view';
  }

  titleInput.value=n.label||'';
  areaInput.value=n.note||'';
  noteTab(mode);
  document.getElementById('nmod').classList.add('show');
  
  setTimeout(()=>{
    if(mode==='edit') {
      if(!n.label) titleInput.focus();
      else areaInput.focus();
    } else {
      if(!n.label) titleInput.focus();
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
        n.note = newNote;
        if(newLabel) n.label = newLabel;
        render();
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
function noteTab(mode){
  if(mode==='view'){
    const txt=document.getElementById('narea').value;
    document.getElementById('nrendered').innerHTML=txt.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/(https?:\/\/[^\s<>"]+)/g,'<a href="$1" target="_blank" rel="noopener">$1</a>');
    document.getElementById('narea').style.display='none';document.getElementById('nrendered').style.display='block';
    document.getElementById('ntab-v').classList.add('on');document.getElementById('ntab-e').classList.remove('on');
  } else {
    document.getElementById('narea').style.display='block';document.getElementById('nrendered').style.display='none';
    document.getElementById('ntab-e').classList.add('on');document.getElementById('ntab-v').classList.remove('on');
    document.getElementById('narea').focus();
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
    trash.push({
      label: n.label, 
      note: n.note, 
      id: n.id, 
      deletedAt: Date.now(),
      isFromNode: !isStandalone
    });
    updateTrashBadge();
    
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

