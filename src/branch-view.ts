// @ts-nocheck
/* ================================================================
   BRANCH VIEW
================================================================ */
let branchBannerTimer = null;

function enterBranchView(id){
  branchViewId=id;
  const banner = document.getElementById('branch-banner');
  if (banner) {
    banner.classList.remove('show');
    banner.style.display = 'block';
  }
  
  const btn = document.getElementById('btn-branch-back');
  if (btn) {
    btn.style.display = 'flex';
    btn.onmouseenter = () => {
      if (branchBannerTimer) clearTimeout(branchBannerTimer);
      banner.classList.add('show');
    };
    btn.onmouseleave = () => {
      branchBannerTimer = setTimeout(() => {
        banner.classList.remove('show');
      }, 3000);
    };
  }
  document.getElementById('branch-label').textContent=gN(id)?.label||'...';
  render();resetView();
}
function exitBranchView(){
  branchViewId=null;
  const banner = document.getElementById('branch-banner');
  if (banner) {
    banner.classList.remove('show');
    setTimeout(() => { if (!branchViewId) banner.style.display='none'; }, 300);
  }
  
  const btn = document.getElementById('btn-branch-back');
  if (btn) {
    btn.style.display = 'none';
    btn.onmouseenter = null;
    btn.onmouseleave = null;
  }
  render();resetView();
}

