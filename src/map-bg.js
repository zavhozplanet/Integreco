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
      imgZoom: 1,           // scale relative to default (1 = screen-size)
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

    // Default size = screen size in canvas units
    const defaultW = window.innerWidth / zoom;
    const defaultH = window.innerHeight / zoom;
    const imgZoom = mb.imgZoom || 1;
    const w = defaultW * imgZoom;
    const h = defaultH * imgZoom;

    // Anchor to root node center
    el.style.display = 'block';
    el.style.left = (root.x - w / 2) + 'px';
    el.style.top  = (root.y - h / 2) + 'px';
    el.style.width  = w + 'px';
    el.style.height = h + 'px';

    el.style.backgroundImage   = `url(${mb.image})`;
    el.style.backgroundSize    = 'cover';
    el.style.backgroundPosition = 'center';
    el.style.opacity           = mb.imgOpacity != null ? mb.imgOpacity : 1;
    el.style.filter            = mb.imgBlur > 0 ? `blur(${mb.imgBlur}px)` : 'none';
  });
}

// ── UI: Map-BG control panel (in canvctx) ─────────────────────
// "canvasBgMode" state: 'canvas' | 'map'
let canvasBgMode = 'canvas';
// When in 'map' mode, the root we're editing
let mapBgRootId = null;

function setCanvasBgMode(mode) {
  canvasBgMode = mode;
  document.getElementById('cbg-mode-canvas').classList.toggle('on', mode === 'canvas');
  document.getElementById('cbg-mode-map').classList.toggle('on', mode === 'map');
  document.getElementById('bg-img-group-canvas').style.display = mode === 'canvas' ? '' : 'none';
  document.getElementById('bg-img-group-map').style.display = mode === 'map' ? '' : 'none';
  if (mode === 'map') {
    syncMapBgUI();    // sync sliders/zoom before showing selector
    openMapBgRootSelector();
  }
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
      renderAllMapBgs();
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
      // Center on this root
      panX = window.innerWidth / 2 - root.x * zoom;
      panY = window.innerHeight / 2 - root.y * zoom;
      applyT();
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
    // Reset zoom to default
    mb.imgZoom = 1;
    renderAllMapBgs();
    saveToLocalStorage();

    // Center on root
    const root = gN(mapBgRootId);
    if (root) {
      panX = window.innerWidth / 2 - root.x * zoom;
      panY = window.innerHeight / 2 - root.y * zoom;
      applyT();
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
  const zoomRow = document.getElementById('bg-img-map-zoom-row');
  if (zoomRow) {
    zoomRow.style.opacity = hasRoot ? '1' : '0.4';
    zoomRow.style.pointerEvents = hasRoot ? 'auto' : 'none';
    const zoomLabel = document.getElementById('mapbg-zoom-label');
    if (zoomLabel && mb) zoomLabel.textContent = Math.round((mb.imgZoom || 1) * 100) + '%';
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
