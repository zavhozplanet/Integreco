// @ts-nocheck
/* ================================================================
   MOBILE RENAME
================================================================ */
function showMobRename(id,isNew){
  mobRnNodeId=id;mobRnIsNew=isNew;const n=gN(id);
  const ov=document.getElementById('mob-rename');const inp=document.getElementById('mob-rninput');
  inp.value=n&&n.label?n.label:'';
  document.getElementById('mob-rntitle').textContent=isNew?'Название нового узла':'Переименовать';
  ov.classList.add('show');ov.style.display='flex';
  setTimeout(()=>inp.focus(),150);
  inp.onkeydown=ev=>{if(ev.key==='Enter')mobRnOk()};
}
function mobRnOk(){
  const n=gN(mobRnNodeId);if(!n)return;
  const v=document.getElementById('mob-rninput').value.trim();
  if(mobRnIsNew&&!v){delBranch(mobRnNodeId);mobRnHide();return}
  if(!mobRnIsNew) sh();
  n.label=v||'Без названия';render();mobRnHide();selNode(mobRnNodeId);
}
function mobRnCancel(){
  if(mobRnIsNew&&mobRnNodeId){const n=gN(mobRnNodeId);if(n&&!n.label)delBranch(mobRnNodeId)}
  mobRnHide();
}
function mobRnHide(){const ov=document.getElementById('mob-rename');ov.classList.remove('show');ov.style.display='none';mobRnNodeId=null}

