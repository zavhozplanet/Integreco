// @ts-nocheck
/* ================================================================
   BRANCH VIEW
================================================================ */
let branchBannerTimer = null;
let branchMenuTimer = null;

function clearBannerTimer() { if (branchBannerTimer) clearTimeout(branchBannerTimer); }
function clearMenuTimer() { if (branchMenuTimer) clearTimeout(branchMenuTimer); }

function hideBannerDelayed() {
  clearBannerTimer();
  branchBannerTimer = setTimeout(() => {
    const banner = document.getElementById('branch-banner');
    if (banner) banner.classList.remove('show');
  }, 3000);
}

function hideMenuDelayed() {
  clearMenuTimer();
  branchMenuTimer = setTimeout(() => {
    closeBranchSettings();
  }, 3000);
}

function enterBranchView(id){
  branchViewId=id;
  const banner = document.getElementById('branch-banner');
  if (banner) {
    banner.style.display = 'flex';
    banner.classList.add('show');
    hideBannerDelayed();
    
    banner.onmouseenter = () => clearBannerTimer();
    banner.onmouseleave = () => hideBannerDelayed();
  }
  
  const menu = document.getElementById('branch-settings-menu');
  if (menu) {
    menu.onmouseenter = () => { clearMenuTimer(); clearBannerTimer(); };
    menu.onmouseleave = () => { hideMenuDelayed(); hideBannerDelayed(); };
  }
  
  const btn = document.getElementById('btn-branch-back');
  if (btn) {
    btn.style.display = 'flex';
    btn.onmouseenter = () => {
      clearBannerTimer();
      if (banner) banner.classList.add('show');
    };
    btn.onmouseleave = () => hideBannerDelayed();
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
    banner.onmouseenter = null;
    banner.onmouseleave = null;
    setTimeout(() => { if (!branchViewId) banner.style.display='none'; }, 300);
  }
  
  const menu = document.getElementById('branch-settings-menu');
  if (menu) {
    menu.onmouseenter = null;
    menu.onmouseleave = null;
  }
  
  const btn = document.getElementById('btn-branch-back');
  if (btn) {
    btn.style.display = 'none';
    btn.onmouseenter = null;
    btn.onmouseleave = null;
  }
  render();resetView();
  closeBranchSettings();
  clearBannerTimer();
  clearMenuTimer();
}

function toggleBranchSettings(ev) {
  ev.stopPropagation();
  const menu = document.getElementById('branch-settings-menu');
  const isShown = menu.style.display === 'block';
  menu.style.display = isShown ? 'none' : 'block';
  if (!isShown) {
    clearMenuTimer();
    document.addEventListener('click', closeBranchSettings);
  }
}

function closeBranchSettings() {
  const menu = document.getElementById('branch-settings-menu');
  if (menu) menu.style.display = 'none';
  document.removeEventListener('click', closeBranchSettings);
  clearMenuTimer();
}

function toggleBranchGroups() {
  branchShowGroups = !branchShowGroups;
  document.getElementById('branch-show-groups-check').checked = branchShowGroups;
  render();
}

