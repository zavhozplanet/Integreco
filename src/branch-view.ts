// @ts-nocheck
/* ================================================================
   BRANCH VIEW
================================================================ */
function enterBranchView(id){
  branchViewId=id;
  document.getElementById('branch-banner').style.display='block';
  const btn = document.getElementById('btn-branch-back');
  if (btn) btn.style.display = 'flex';
  document.getElementById('branch-label').textContent=gN(id)?.label||'...';
  render();resetView();
}
function exitBranchView(){
  branchViewId=null;
  document.getElementById('branch-banner').style.display='none';
  const btn = document.getElementById('btn-branch-back');
  if (btn) btn.style.display = 'none';
  render();resetView();
}

