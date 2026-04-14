/* ================================================================
   MAP BACKGROUND — image attached to a root node
   Each root node can have its own background image that moves/scales
   with the map and lives on a layer above the canvas background.
================================================================ */

// Returns the mapBg object for a root; creates a default if absent.
function getMapBg(rootId) {
  const n = gN(rootId);
  if (!n || n.type !== 'root') return null;
  if (!n.mapBg) {
    n.mapBg = {
      image: null,          // base64 data URL
      imgEnabled: false,    // visible?
      imgOpacity: 1,
      imgBlur: 0,
      imgZoom: 1,           // scale relative to baseW/H
      baseW: null,          // base size in canvas units
      baseH: null,
      imgOffsetX: 0,
      imgOffsetY: 0,
      imgFilename: null     // original filename hint
    };
  }
  return n.mapBg;
}

// ── Rendering ──────────────────────────────────────────────────
// Called from applyT() every frame — positions all map-bg divs
function renderAllMapBgs() {
  const container = document.getElementById('map-bg-layer');
  if (!container) return;

  const roots = nodes.filter(n => n.type === 'root');
  const existingIds = new Set(Array.from(container.children).map(el => el.dataset.rootId));

  // Remove stale layers
  Array.from(container.children).forEach(el => {
    if (!roots.find(r => String(r.id) === el.dataset.rootId)) el.remove();
  });

  roots.forEach(root => {
    const mb = root.mapBg;
    const hasImage = mb && mb.image && mb.imgEnabled;

    let el = container.querySelector(`[data-root-id="${root.id}"]`);
    if (!el) {
      el = document.createElement('div');
      el.dataset.rootId = String(root.id);
      el.style.position = 'absolute';
      el.style.transformOrigin = 'center center';
      el.style.pointerEvents = 'none';
      container.appendChild(el);
    }

    if (!hasImage) {
      el.style.display = 'none';
      return;
    }

    if (!mb.baseW || !mb.baseH) {
      mb.baseW = window.innerWidth / zoom;
      mb.baseH = window.innerHeight / zoom;
    }
    const w = mb.baseW * (mb.imgZoom || 1);
    const h = mb.baseH * (mb.imgZoom || 1);

    // Anchor to root node center + offset
    const ox = mb.imgOffsetX || 0;
    const oy = mb.imgOffsetY || 0;
    el.style.display = 'block';
    el.style.left = (root.x + ox - w / 2) + 'px';
    el.style.top  = (root.y + oy - h / 2) + 'px';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';

    el.style.backgroundImage   = `url(${mb.image})`;
    el.style.backgroundSize    = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.opacity           = mb.imgOpacity != null ? mb.imgOpacity : 1;
    el.style.filter            = mb.imgBlur > 0 ? `blur(${mb.imgBlur}px)` : 'none';
  });
}

function getMapBgAtScreen(sx, sy) {
  const container = document.getElementById('map-bg-layer');
  if (!container) return null;
  const children = Array.from(container.children);
  for (let i = children.length - 1; i >= 0; i--) {
    const el = children[i];
    if (el.style.display !== 'none') {
      const rect = el.getBoundingClientRect();
      if (sx >= rect.left && sx <= rect.right && sy >= rect.top && sy <= rect.bottom) {
        return parseInt(el.dataset.rootId);
      }
    }
  }
  return null;
}

// Returns the background bounding rect in canvas coordinates, or null
function getMapBgBounds(rootId) {
  const root = gN(rootId);
  if (!root || root.type !== 'root') return null;
  const mb = root.mapBg;
  if (!mb || !mb.image || !mb.imgEnabled) return null;
  if (!mb.baseW || !mb.baseH) return null;
  const w = mb.baseW * (mb.imgZoom || 1);
  const h = mb.baseH * (mb.imgZoom || 1);
  const cx = root.x + (mb.imgOffsetX || 0);
  const cy = root.y + (mb.imgOffsetY || 0);
  return { x: cx - w/2, y: cy - h/2, x2: cx + w/2, y2: cy + h/2 };
}

// ── UI: Map-BG control panel (in canvctx) ─────────────────────
// "canvasBgMode" state: 'canvas' | 'map'
let canvasBgMode = 'canvas';
// When in 'map' mode, the root we're editing
let mapBgRootId = null;

function setCanvasBgMode(mode, skipSelector = false, specificRootId = null) {
  canvasBgMode = mode;
  document.getElementById('cbg-mode-canvas').classList.toggle('on', mode === 'canvas');
  document.getElementById('cbg-mode-map').classList.toggle('on', mode === 'map');
  document.getElementById('bg-img-group-canvas').style.display = mode === 'canvas' ? '' : 'none';
  document.getElementById('bg-img-group-map').style.display = mode === 'map' ? '' : 'none';
  if (mode === 'map') {
    if (specificRootId !== null) mapBgRootId = specificRootId;
    syncMapBgUI();    // sync sliders/zoom before showing selector
    if (!skipSelector) {    
      openMapBgRootSelector();
    }
  }
}

function toggleMapBgSwitch(enabled) {
  const rootId = mapBgRootId || lastUsedMapRootId;
  if (!rootId) return;
  const mb = getMapBg(rootId);
  if (!mb || !mb.image) return;
  sh();
  mb.imgEnabled = enabled;
  const rn = gN(rootId);
  if (rn) rn.locked = enabled;
  renderAllMapBgs();
  render();
  saveToLocalStorage();
  syncMapBgUI();
}



function openMapBgRootSelector() {
  const overlay = document.getElementById('mapbg-root-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  renderMapBgRootSelector();
}
function closeMapBgRootSelector() {
  const overlay = document.getElementById('mapbg-root-overlay');
  if (overlay) overlay.style.display = 'none';
}

function renderMapBgRootSelector() {
  const grid = document.getElementById('mapbg-root-grid');
  if (!grid) return;
  grid.innerHTML = '';

  const roots = nodes.filter(n => n.type === 'root');
  if (roots.length === 0) {
    grid.innerHTML = '<div class="cat-empty">Нет корневых объектов</div>';
    return;
  }

  // Find currently-visible root (closest to viewport center)
  const vcx = (window.innerWidth / 2 - panX) / zoom;
  const vcy = (window.innerHeight / 2 - panY) / zoom;
  let currentRoot = roots.reduce((best, r) => {
    const d = Math.hypot(r.x - vcx, r.y - vcy);
    return d < Math.hypot(best.x - vcx, best.y - vcy) ? r : best;
  }, roots[0]);

  roots.forEach(root => {
    const mb = root.mapBg;
    const hasImage = mb && mb.image;
    const isEnabled = hasImage && mb.imgEnabled;
    const isCurrent = root.id === currentRoot.id;

    const card = document.createElement('div');
    card.className = 'mapbg-root-card' + (isCurrent ? ' active' : '');
    card.style.cssText = 'position:relative;width:160px;border:1.5px solid var(--nbr);border-radius:14px;overflow:hidden;cursor:pointer;background:#fff;flex-shrink:0;';
    if (isCurrent) card.style.borderColor = 'var(--ac)';

    // Thumbnail
    const thumb = document.createElement('div');
    thumb.style.cssText = 'width:100%;height:100px;display:flex;align-items:center;justify-content:center;';
    if (hasImage) {
      thumb.style.backgroundImage = `url(${mb.image})`;
      thumb.style.backgroundSize = 'cover';
      thumb.style.backgroundPosition = 'center';
    } else {
      // Checkerboard (no image)
      thumb.style.background = 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 0 0 / 16px 16px';
    }

    // Root label overlay
    const label = document.createElement('div');
    label.style.cssText = 'position:absolute;bottom:32px;left:0;right:0;text-align:center;font-size:12px;font-weight:700;color:#fff;text-shadow:0 1px 4px rgba(0,0,0,.6);padding:2px 6px;pointer-events:none;';
    label.textContent = root.label || '+';

    // Checkbox
    const cbWrap = document.createElement('label');
    cbWrap.style.cssText = 'position:absolute;top:6px;left:8px;display:flex;align-items:center;gap:4px;cursor:pointer;z-index:5;';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.style.cssText = 'width:16px;height:16px;cursor:pointer;';
    cb.checked = isEnabled;
    cb.disabled = !hasImage;
    cb.onchange = (e) => {
      e.stopPropagation();
      const mb2 = getMapBg(root.id);
      if (!mb2 || !mb2.image) return;
      sh();
      mb2.imgEnabled = cb.checked;
      // Lock root when bg enabled, unlock when disabled
      const rn = gN(root.id);
      if (rn) rn.locked = cb.checked;
      renderAllMapBgs();
      render();
      saveToLocalStorage();
    };
    cbWrap.appendChild(cb);
    cbWrap.onclick = e => e.stopPropagation(); // don't bubble to card

    // Plus button
    const plusBtn = document.createElement('div');
    plusBtn.style.cssText = 'position:absolute;top:6px;right:8px;width:22px;height:22px;border-radius:50%;background:var(--ac);color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;cursor:pointer;z-index:5;box-shadow:0 2px 6px rgba(0,0,0,.2);';
    plusBtn.textContent = '+';
    plusBtn.title = 'Выбрать изображение';
    plusBtn.onclick = e => { e.stopPropagation(); selectMapBgForRoot(root.id); };

    // Info bar
    const info = document.createElement('div');
    info.style.cssText = 'padding:6px 8px;font-size:12px;font-weight:600;color:var(--tx);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
    info.textContent = root.label || '+';

    // Double-click = also open image picker
    card.ondblclick = () => selectMapBgForRoot(root.id);
    card.onclick = () => {
      const mbSelected = getMapBg(root.id);
      if (mbSelected && mbSelected.image && mbSelected.imgEnabled) {
        // Zoom and center on background
        const bw = (mbSelected.baseW || window.innerWidth) * (mbSelected.imgZoom || 1);
        const bh = (mbSelected.baseH || window.innerHeight) * (mbSelected.imgZoom || 1);
        const margin = 1.15;
        const targetZ = Math.min(window.innerWidth / (bw * margin), window.innerHeight / (bh * margin));
        zoom = Math.min(1.5, Math.max(0.08, targetZ));
        const bcx = root.x + (mbSelected.imgOffsetX || 0);
        const bcy = root.y + (mbSelected.imgOffsetY || 0);
        panX = window.innerWidth / 2 - bcx * zoom;
        panY = window.innerHeight / 2 - bcy * zoom;
      } else {
        // standard centering
        panX = window.innerWidth / 2 - root.x * zoom;
        panY = window.innerHeight / 2 - root.y * zoom;
      }
      applyT();
      if (typeof renderMinimap === 'function') renderMinimap();
    };

    card.appendChild(thumb);
    card.appendChild(label);
    card.appendChild(cbWrap);
    card.appendChild(plusBtn);
    card.appendChild(info);
    grid.appendChild(card);
  });
}

// Open image catalog/file for a specific root
function selectMapBgForRoot(rootId) {
  mapBgRootId = rootId;
  closeMapBgRootSelector();
  // Open image catalog in map-bg mode
  openImgCatalog(true); // pass flag
}

// Called when image chosen from catalog (or file) in map-bg mode
function applyImgCatBgToRoot(file) {
  if (!mapBgRootId) return;
  const reader = new FileReader();
  reader.onload = e => {
    sh();
    const mb = getMapBg(mapBgRootId);
    if (!mb) return;
    mb.image = e.target.result;
    mb.imgEnabled = true;
    fitMapBgToBranch(mapBgRootId);
    // Auto-lock root to its map bg
    const rn = gN(mapBgRootId);
    if (rn) rn.locked = true;
    renderAllMapBgs();
    saveToLocalStorage();

    // Center and zoom to fit background on screen
    const root = gN(mapBgRootId);
    if (root && mb) {
      const bw = mb.baseW * mb.imgZoom;
      const bh = mb.baseH * mb.imgZoom;
      const margin = 1.15; // 15% margin
      const targetZ = Math.min(window.innerWidth / (bw * margin), window.innerHeight / (bh * margin));
      zoom = Math.min(1.5, Math.max(0.08, targetZ));
      
      const bcx = root.x + (mb.imgOffsetX || 0);
      const bcy = root.y + (mb.imgOffsetY || 0);
      panX = window.innerWidth / 2 - bcx * zoom;
      panY = window.innerHeight / 2 - bcy * zoom;
      applyT();
      if (typeof renderMinimap === 'function') renderMinimap();
    }

    mapBgRootId = null;
    closeImgCatalog();
    // Re-sync canvas menu sliders if open
    if (canvCtx.style.display !== 'none') renderCanvCtx();
    toast('Фон карты установлен');
  };
  reader.readAsDataURL(file);
}

// ── Zoom controls ─────────────────────────────────────────────
// minZoom = 25% of default (0.25), no theoretical max
const MAP_BG_MIN_ZOOM = 0.25;

function mapBgZoom(direction) {
  if (!mapBgRootId) {
    // Use last-used map root
    const root = gN(lastUsedMapRootId) || nodes.find(n => n.type === 'root');
    if (!root) return;
    mapBgRootId = root.id;
  }
  const mb = getMapBg(mapBgRootId);
  if (!mb || !mb.image) return;

  const step = direction > 0 ? 1.25 : 0.8;
  const newZoom = Math.max(MAP_BG_MIN_ZOOM, (mb.imgZoom || 1) * step);
  sh();
  mb.imgZoom = newZoom;
  renderAllMapBgs();
  saveToLocalStorage();
  syncMapBgUI();
}

function syncMapBgUI() {
  const rootId = mapBgRootId || lastUsedMapRootId;
  const mb = rootId ? getMapBg(rootId) : null;
  const hasRoot = !!mb && !!mb.image;
  const sw = document.getElementById('bg-img-map-switch');
  if (sw) {
    sw.checked = hasRoot && mb.imgEnabled;
    sw.disabled = !hasRoot;
  }
  const posBtn = document.getElementById('mapbg-positioning-btn');
  if (posBtn) {
    posBtn.style.opacity = hasRoot ? '1' : '0.4';
    posBtn.style.pointerEvents = hasRoot ? 'auto' : 'none';
  }
  // Opacity/Blur sliders
  const opaEl = document.getElementById('mapbg-img-opacity');
  const blurEl = document.getElementById('mapbg-img-blur');
  if (mb && opaEl) opaEl.value = mb.imgOpacity != null ? mb.imgOpacity : 1;
  if (mb && blurEl) blurEl.value = mb.imgBlur != null ? mb.imgBlur : 0;
  const mapSliders = document.getElementById('mapbg-sliders');
  if (mapSliders) {
    mapSliders.style.opacity = hasRoot ? '1' : '0.4';
    mapSliders.style.pointerEvents = hasRoot ? 'auto' : 'none';
  }
}

function updateMapBg(key, val) {
  const rootId = mapBgRootId || lastUsedMapRootId;
  if (!rootId) return;
  const mb = getMapBg(rootId);
  if (!mb) return;
  sh();
  mb[key] = val;
  renderAllMapBgs();
  saveToLocalStorage();
}

function fitMapBgToBranch(rootId) {
  const root = gN(rootId);
  if (!root) return;
  const mb = getMapBg(rootId);
  if (!mb) return;

  const branchNodes = [root];
  const visited = new Set([root.id]);
  const queue = [root.id];
  while(queue.length > 0) {
    const id = queue.shift();
    if(typeof gCh === 'function') {
      gCh(id).forEach(childId => {
        if (!visited.has(childId)) {
          visited.add(childId);
          queue.push(childId);
          const cn = gN(childId);
          if (cn) branchNodes.push(cn);
        }
      });
    }
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  branchNodes.forEach(n => {
    const w = n.width || 120;
    const h = n.height || 40;
    minX = Math.min(minX, n.x - w / 2);
    maxX = Math.max(maxX, n.x + w / 2);
    minY = Math.min(minY, n.y - h / 2);
    maxY = Math.max(maxY, n.y + h / 2);
  });

  // Include edges in the bounding box
  edges.forEach(e => {
    if (visited.has(e.from) && visited.has(e.to)) {
      // Internal edge: check control points
      if (e.cp1x != null) {
        minX = Math.min(minX, e.cp1x);
        maxX = Math.max(maxX, e.cp1x);
        minY = Math.min(minY, e.cp1y);
        maxY = Math.max(maxY, e.cp1y);
      }
      if (e.cp2x != null) {
        minX = Math.min(minX, e.cp2x);
        maxX = Math.max(maxX, e.cp2x);
        minY = Math.min(minY, e.cp2y);
        maxY = Math.max(maxY, e.cp2y);
      }
      // Elbow bend points
      const sh = e.shape || gls;
      if (sh === 'elbow' && e.bend != null) {
        // We could calculate the actual elbow bend point here, 
        // but since we already have nodes and cp/offsets, this covers most cases.
      }
    }
  });

  const bW = maxX - minX;
  const bH = maxY - minY;
  const branchW = bW + 80; // Minimal padding
  const branchH = bH + 80;

  const bCX = (minX + maxX) / 2;
  const bCY = (minY + maxY) / 2;

  mb.baseW = window.innerWidth / zoom;
  mb.baseH = window.innerHeight / zoom;

  const scaleX = branchW / mb.baseW;
  const scaleY = branchH / mb.baseH;

  mb.imgZoom = Math.max(scaleX, scaleY);
  mb.imgOffsetX = bCX - root.x;
  mb.imgOffsetY = bCY - root.y;
}

// ── Positioning Mode ──────────────────────────────────────────
let posState = {
  active: false,
  rootId: null,
  mb: null,     // clone for editing
  orig: null,   // backup for cancel
  dragging: false,
  sx: 0, sy: 0,
  ox: 0, oy: 0
};

function openMapBgPositioning() {
  const rootId = mapBgRootId || lastUsedMapRootId;
  const root = gN(rootId);
  if (!root) return;
  const mb = getMapBg(rootId);
  if (!mb || !mb.image) return;

  posState.active = true;
  posState.rootId = rootId;
  // Clone current state
  posState.mb = JSON.parse(JSON.stringify(mb));
  posState.orig = JSON.parse(JSON.stringify(mb));

  const ov = document.getElementById('mapbg-pos-overlay');
  ov.style.display = 'flex';
  
  // Setup view
  const bgEl = document.getElementById('mapbg-pos-bg');
  bgEl.style.backgroundImage = `url(${mb.image})`;
  
  renderMapBgPos();
}

function closeMapBgPositioning(save) {
  if (save && posState.active) {
    sh();
    const mb = getMapBg(posState.rootId);
    Object.assign(mb, posState.mb);
    renderAllMapBgs();
    saveToLocalStorage();
    toast('Позиция сохранена');
  }
  posState.active = false;
  document.getElementById('mapbg-pos-overlay').style.display = 'none';
}

function mapBgPosReset() {
  if (!posState.active) return;
  posState.mb.imgOffsetX = 0;
  posState.mb.imgOffsetY = 0;
  renderMapBgPos();
}

function mapBgPosZoom(dir) {
  if (!posState.active) return;
  const step = dir > 0 ? 1.1 : 0.9;
  posState.mb.imgZoom = Math.max(0.1, posState.mb.imgZoom * step);
  renderMapBgPos();
}

function renderMapBgPos() {
  if (!posState.active) return;
  const view = document.getElementById('mapbg-pos-view');
  const bg = document.getElementById('mapbg-pos-bg');
  const mapLayer = document.getElementById('mapbg-pos-map');
  const mb = posState.mb;
  const root = gN(posState.rootId);

  const vw = view.clientWidth;
  const vh = view.clientHeight;

  // Background size in the positioning window
  // We want the image to fill the view or at least be prominent
  // Let's assume the background 'base' is the window size
  const baseW = mb.baseW || window.innerWidth;
  const baseH = mb.baseH || window.innerHeight;
  
  // Determine scale to fit base size into view
  const s = Math.min((vw * 0.9) / baseW, (vh * 0.9) / baseH);
  
  const w = baseW * mb.imgZoom * s;
  const h = baseH * mb.imgZoom * s;

  bg.style.width = w + 'px';
  bg.style.height = h + 'px';

  // Map is fixed at center
  mapLayer.style.left = (vw / 2) + 'px';
  mapLayer.style.top = (vh / 2) + 'px';
  mapLayer.style.transform = `scale(${s})`;

  // Background moves based on offsets
  bg.style.left = (vw / 2 + mb.imgOffsetX * s) + 'px';
  bg.style.top = (vh / 2 + mb.imgOffsetY * s) + 'px';

  // Render all map objects
  mapLayer.innerHTML = '';
  
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.style.cssText = 'position:absolute;overflow:visible;pointer-events:none;';
  mapLayer.appendChild(svg);

  // All edges
  edges.forEach(e => {
    const f = gN(e.from), t = gN(e.to);
    if (!f || !t) return;
    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute('class', 'ed-stub');
    // Simple straight line for blueprint view
    path.setAttribute('d', `M ${f.x-root.x} ${f.y-root.y} L ${t.x-root.x} ${t.y-root.y}`);
    svg.appendChild(path);
  });

  // All nodes (standard, groups, notes)
  nodes.forEach(n => {
    const div = document.createElement('div');
    div.className = 'nd-stub' + (n.type==='group'?' group-stub':'');
    const nw = n.width || 120, nh = n.height || 40;
    div.style.cssText = `width:${nw}px;height:${nh}px;left:${n.x-root.x-nw/2}px;top:${n.y-root.y-nh/2}px;`;
    if (n.id === root.id) {
       div.style.boxShadow = '0 0 12px 2px #39ff14';
       div.style.zIndex = '10';
    }
    div.textContent = n.label || '';
    mapLayer.appendChild(div);
  });
}

// Interaction
// Interaction
function initMapBgPosEvents() {
  const view = document.getElementById('mapbg-pos-view');
  if(!view) return;
  view.onmousedown = (e) => {
    if (!posState.active) return;
    posState.dragging = true;
    posState.sx = e.clientX;
    posState.sy = e.clientY;
    posState.ox = posState.mb.imgOffsetX;
    posState.oy = posState.mb.imgOffsetY;
  };
  window.addEventListener('mousemove', (e) => {
    if (!posState.active || !posState.dragging) return;
    const dx = e.clientX - posState.sx;
    const dy = e.clientY - posState.sy;
    
    // We need to know the 's' scale used in renderMapBgPos to move correctly
    const baseW = posState.mb.baseW || window.innerWidth;
    const baseH = posState.mb.baseH || window.innerHeight;
    const s = Math.min((view.clientWidth * 0.9) / baseW, (view.clientHeight * 0.9) / baseH);

    posState.mb.imgOffsetX = posState.ox + dx / s;
    posState.mb.imgOffsetY = posState.oy + dy / s;
    renderMapBgPos();
  });
  window.addEventListener('mouseup', () => {
    posState.dragging = false;
  });
  view.addEventListener('wheel', (e) => {
    if (!posState.active) return;
    e.preventDefault();
    mapBgPosZoom(e.deltaY < 0 ? 1 : -1);
  }, {passive:false});
}

// Call init on load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMapBgPosEvents);
} else {
  initMapBgPosEvents();
}
