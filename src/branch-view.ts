// @ts-nocheck
/* ================================================================
   BRANCH VIEW
================================================================ */
function enterBranchView(id){
  branchViewId=id;
  document.getElementById('branch-banner').style.display='block';
  document.getElementById('branch-label').textContent=gN(id)?.label||'...';
  render();resetView();
}
function exitBranchView(){
  branchViewId=null;document.getElementById('branch-banner').style.display='none';render();resetView();
}

