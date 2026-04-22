// @ts-nocheck
/* ================================================================
   BRANCH VIEW
================================================================ */
let branchBannerTimer = null;

function enterBranchView(id){
  branchViewId=id;
  const banner = document.getElementById('branch-banner');
  if (banner) {
    banner.style.display = 'flex';
    banner.classList.add('show');
    if (branchBannerTimer) clearTimeout(branchBannerTimer);
    branchBannerTimer = setTimeout(() => {
      banner.classList.remove('show');
    }, 3000);
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
  render();
  centerOnBranch(id);
}

function centerOnBranch(rootId) {
  const branchNodes = [];
  const visited = new Set();
  function collect(id) {
    if (visited.has(id)) return;
    visited.add(id);
    const n = gN(id);
    if (n) branchNodes.push(n);
    // Use gCh logic to follow structural edges
    edges.filter(e => e.from === id && e.dash !== 'link' && !e.isLink).forEach(e => collect(e.to));
  }
  collect(rootId);

  if (branchNodes.length === 0) return;

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  branchNodes.forEach(n => {
    const {hw, hh} = nodeHalfExtents(n.id);
    minX = Math.min(minX, n.x - hw);
    maxX = Math.max(maxX, n.x + hw);
    minY = Math.min(minY, n.y - hh);
    maxY = Math.max(maxY, n.y + hh);
  });

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  panX = wrap.clientWidth / 2 - cx * zoom;
  panY = wrap.clientHeight / 2 - cy * zoom;
  applyT();
  renderMinimap();
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
  closeBranchSettings();
}

function toggleBranchSettings(ev) {
  ev.stopPropagation();
  const menu = document.getElementById('branch-settings-menu');
  const isShown = menu.style.display === 'block';
  menu.style.display = isShown ? 'none' : 'block';
  if (!isShown) {
    document.addEventListener('click', closeBranchSettings);
  }
}

function closeBranchSettings() {
  const menu = document.getElementById('branch-settings-menu');
  if (menu) menu.style.display = 'none';
  document.removeEventListener('click', closeBranchSettings);
}

function toggleBranchGroups() {
  branchShowGroups = !branchShowGroups;
  document.getElementById('branch-show-groups-check').checked = branchShowGroups;
  render();
}

