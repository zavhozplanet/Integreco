// @ts-nocheck
/* ================================================================
   MAP CATALOG
   Opens a full-screen overlay listing all .json maps in the
   workspace folder as card or tile previews.
================================================================ */

// ── State ────────────────────────────────────────────────────────
let catalogView = 'cards';   // 'cards' | 'tiles'
let catalogSort = 'newest';  // 'name' | 'newest' | 'oldest'
let catalogItems = [];       // [{filename, label, thumb, nodeCount, mtime}]
const CAT_THUMB_W = 200, CAT_THUMB_H = 120;

// ── Open / Close ─────────────────────────────────────────────────
async function openCatalog() {
  mmenu.classList.remove('show');
  const overlay = document.getElementById('catalog-overlay');
  if (!overlay) return;
  overlay.style.display = 'flex';
  requestAnimationFrame(() => overlay.classList.add('show'));
  await refreshCatalog();
}

function closeCatalog() {
  const overlay = document.getElementById('catalog-overlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  setTimeout(() => { overlay.style.display = 'none'; }, 280);
}

// ── Load & render list ───────────────────────────────────────────
async function refreshCatalog() {
  const grid = document.getElementById('catalog-grid');
  if (!grid) return;
  grid.innerHTML = '<div class="cat-empty">⏳ Загрузка...</div>';

  if (!window.storageAPI || !window.storageAPI.dirHandle) {
    grid.innerHTML = `<div class="cat-empty">
      📂 Рабочая папка не выбрана.<br>
      <button class="cat-select-btn" onclick="selectWorkspaceFolder();closeCatalog()">Выбрать папку</button>
    </div>`;
    return;
  }

  const perm = await window.storageAPI.dirHandle.queryPermission({ mode: 'readwrite' });
  if (perm !== 'granted') {
    grid.innerHTML = `<div class="cat-empty">
      🔒 Нет доступа к папке.<br>
      <button class="cat-select-btn" onclick="selectWorkspaceFolder();closeCatalog()">Разрешить доступ</button>
    </div>`;
    return;
  }

  catalogItems = await scanWorkspaceFolder();
  
  // Apply sorting
  if (catalogSort === 'name') {
    catalogItems.sort((a, b) => a.label.localeCompare(b.label, 'ru'));
  } else if (catalogSort === 'newest' || catalogSort === 'recent') {
    catalogItems.sort((a, b) => b.mtime - a.mtime);
  } else if (catalogSort === 'oldest') {
    catalogItems.sort((a, b) => a.mtime - b.mtime);
  }

  if (catalogItems.length === 0) {
    grid.innerHTML = `<div class="cat-empty">
      Нет карт (.json) в выбранной папке.<br>
      <small style="opacity:0.6">Проверьте, ту ли папку вы открыли.</small>
    </div>`;
    return;
  }

  renderCatalogGrid(grid);
}

function setCatalogSort(sort) {
  catalogSort = sort;
  // Update UI active states
  ['name','newest','oldest','recent'].forEach(s => {
    const btn = document.getElementById('cat-sort-' + s);
    if (btn) btn.classList.toggle('active', sort === s);
  });
  refreshCatalog();
}

async function scanWorkspaceFolder() {
  const items = [];
  try {
    for await (const [name, handle] of window.storageAPI.dirHandle.entries()) {
      if (handle.kind !== 'file' || !name.endsWith('.json')) continue;
      try {
        const file = await handle.getFile();
        const text = await file.text();
        const parsed = JSON.parse(text);
        
        if (parsed.version !== '1.0' || !Array.isArray(parsed.nodes)) continue;

        const rootNode = parsed.nodes.find(n => n.type === 'root') || parsed.nodes[0];
        const label = rootNode?.label || name.replace('.json', '');
        const thumb = buildThumb(parsed.nodes, parsed.edges || []);
        // Save mtime for sorting
        const submapLinks = parsed.nodes
          .filter(n => n.submapFilename)
          .map(n => ({ nodeLabel: n.label || '', filename: n.submapFilename }));
        items.push({ 
          filename: name, 
          label, 
          thumb, 
          nodeCount: parsed.nodes.length,
          mtime: file.lastModified,
          submapLinks
        });
      } catch (e) {}
    }
  } catch (e) {}
  return items;
}

// ── Mini thumbnail via OffscreenCanvas / regular canvas ──────────
function buildThumb(nodes, edges) {
  if (!nodes || nodes.length === 0) return null;
  try {
    const visNodes = nodes.filter(n => n.type !== 'group');
    if (visNodes.length === 0) return null;

    const xs = visNodes.map(n => n.x), ys = visNodes.map(n => n.y);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    const pad = 30;
    const srcW = (maxX - minX) + pad * 2 || 200;
    const srcH = (maxY - minY) + pad * 2 || 120;

    const scale = Math.min(CAT_THUMB_W / srcW, CAT_THUMB_H / srcH, 1);
    const tw = Math.round(srcW * scale);
    const th = Math.round(srcH * scale);

    const c = document.createElement('canvas');
    c.width = CAT_THUMB_W; c.height = CAT_THUMB_H;
    const ctx = c.getContext('2d');

    // Background
    ctx.fillStyle = '#f0ede8';
    ctx.fillRect(0, 0, CAT_THUMB_W, CAT_THUMB_H);

    const offX = (CAT_THUMB_W - tw) / 2;
    const offY = (CAT_THUMB_H - th) / 2;
    const tx = x => offX + (x - minX + pad) * scale;
    const ty = y => offY + (y - minY + pad) * scale;

    // Draw edges
    ctx.strokeStyle = 'rgba(176,171,164,0.7)';
    ctx.lineWidth = 1 * scale;
    edges.forEach(e => {
      const f = nodes.find(n => n.id === e.from);
      const t = nodes.find(n => n.id === e.to);
      if (!f || !t) return;
      ctx.beginPath();
      ctx.moveTo(tx(f.x), ty(f.y));
      ctx.lineTo(tx(t.x), ty(t.y));
      ctx.stroke();
    });

    // Draw nodes
    visNodes.forEach(n => {
      const isRoot = n.type === 'root';
      const r = Math.max(4, 12 * scale);
      const w = Math.max(10, 28 * scale);
      const h = Math.max(7, 16 * scale);
      ctx.fillStyle = isRoot ? '#3d3b38' : (n.color || '#fff');
      ctx.strokeStyle = isRoot ? 'transparent' : 'rgba(216,212,206,0.8)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      const rx = tx(n.x) - w / 2, ry = ty(n.y) - h / 2;
      if (ctx.roundRect) {
        ctx.roundRect(rx, ry, w, h, r);
      } else {
        ctx.rect(rx, ry, w, h);
      }
      ctx.fill();
      if (!isRoot) ctx.stroke();
    });

    return c.toDataURL('image/webp', 0.8);
  } catch (e) {
    return null;
  }
}

// ── Render grid ──────────────────────────────────────────────────
function renderCatalogGrid(grid) {
  grid.className = 'catalog-grid ' + catalogView;
  grid.innerHTML = '';
  const currentFile = window.storageAPI?._currentFilename || 'map.json';

  if (catalogView === 'tree') {
    renderCatalogTree(grid, currentFile);
    return;
  }

  if (catalogSort === 'recent') {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const recentItems = catalogItems.filter(item => (now - item.mtime) < oneDay || catalogItems.indexOf(item) < 3);
    const otherItems = catalogItems.filter(item => !recentItems.includes(item));
    
    if (recentItems.length > 0) {
      _renderCatalogList(grid, recentItems, 'Недавние', currentFile);
    }
    if (otherItems.length > 0) {
      _renderCatalogList(grid, otherItems, 'Другие карты', currentFile);
    }
  } else {
    _renderCatalogList(grid, catalogItems, null, currentFile);
  }
}

function _renderCatalogList(grid, items, title, currentFile) {
  if (title) {
    const hdr = document.createElement('div');
    hdr.className = 'cat-group-header';
    hdr.textContent = title;
    grid.appendChild(hdr);
  }
  items.forEach(item => {
    grid.appendChild(_createCatalogCard(item, currentFile));
  });
}

function _createCatalogCard(item, currentFile) {
  const card = document.createElement('div');
  const fn = item.filename;
  card.className = 'cat-card' + (fn === currentFile ? ' cat-card-active' : '');
  card.title = item.label;

  const thumbHtml = item.thumb
    ? `<img src="${item.thumb}" class="cat-thumb" alt="${item.label}">`
    : `<div class="cat-thumb cat-thumb-empty">🗺️</div>`;

  card.innerHTML = `
    ${thumbHtml}
    <div class="cat-info">
      <div class="cat-label">${escHtml(item.label)}</div>
      <div class="cat-meta">${item.nodeCount} объектов · ${item.filename}</div>
    </div>
    <div class="cat-actions">
      <button class="cat-act-btn cat-share-btn" title="Поделиться">🔗</button>
      <div class="cat-dl-wrap" style="position:relative">
        <button class="cat-act-btn cat-dl-trigger" title="Скачать">⬇️</button>
        <div class="cat-dl-sub" style="display:none">
          <div class="cat-dl-item" data-fmt="jsonld">👁️🧠 JSON-LD</div>
          <div class="cat-dl-item" data-fmt="md">📄 MD</div>
          <div class="cat-dl-item" data-fmt="png">🖼️ PNG</div>
        </div>
      </div>
      <button class="cat-act-btn cat-act-trash" title="В корзину">🗑️</button>
    </div>
  `;

  // Listeners
  card.querySelector('.cat-share-btn').addEventListener('click', (ev) => catShare(ev, fn));
  card.querySelector('.cat-dl-trigger').addEventListener('click', (ev) => catToggleDl(ev, ev.currentTarget));
  card.querySelectorAll('.cat-dl-item').forEach(btn => {
    btn.addEventListener('click', (ev) => catDownload(ev, fn, btn.dataset.fmt));
  });
  
  const trashBtn = card.querySelector('.cat-act-trash');
  let trashConfirmTimer = null;
  trashBtn.addEventListener('click', (ev) => {
    ev.stopPropagation();
    if (!trashBtn.classList.contains('confirming')) {
      trashBtn.classList.add('confirming');
      trashBtn.innerHTML = '❓';
      trashConfirmTimer = setTimeout(() => {
        trashBtn.classList.remove('confirming');
        trashBtn.innerHTML = '🗑️';
      }, 3000);
    } else {
      clearTimeout(trashConfirmTimer);
      catTrashMap(ev, fn, true);
    }
  });

  card.addEventListener('dblclick', (ev) => {
    if (ev.target.closest('.cat-actions')) return;
    ev.stopPropagation();
    catOpenMap(fn);
  });

  card.addEventListener('contextmenu', (ev) => {
    if (typeof showGenericContext === 'function') {
      showGenericContext(ev, { type: 'catalog', filename: fn });
    }
  });

  return card;
}

function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escAttr(s) {
  return String(s).replace(/'/g,"\\'").replace(/"/g,'&quot;');
}

// ── View toggle ──────────────────────────────────────────────────
function setCatalogView(view) {
  catalogView = view;
  document.getElementById('cat-view-cards').classList.toggle('active', view === 'cards');
  document.getElementById('cat-view-tiles').classList.toggle('active', view === 'tiles');
  const treeBtn = document.getElementById('cat-view-tree');
  if (treeBtn) treeBtn.classList.toggle('active', view === 'tree');
  const grid = document.getElementById('catalog-grid');
  if (grid) renderCatalogGrid(grid);
}

// ── Open map from catalog ────────────────────────────────────────
async function catOpenMap(filename, newWindow = false) {
  closeCatalog();
  if (!window.storageAPI || !window.storageAPI.dirHandle) return;

  const dataStr = await window.storageAPI.loadData(filename);
  if (!dataStr) { toast('Не удалось загрузить карту'); return; }

  if (newWindow) {
    // Open in new browser tab — pass data through sessionStorage with a unique key
    const key = 'cat_open_' + Date.now();
    sessionStorage.setItem(key, JSON.stringify({ filename, data: dataStr }));
    window.open(location.pathname + '?catkey=' + encodeURIComponent(key), '_blank');
  } else {
    // Always open in current tab as per Single Window SPA goal
    if (applyData(dataStr)) {
      window.storageAPI._currentFilename = filename;
      saveToLocalStorage(); // Sync session storage for refresh
      toast('Открыто: ' + filename);
    }
  }
}

// ── Card action handlers ─────────────────────────────────────────
async function catShare(ev, filename) {
  ev.stopPropagation();
  toast('Ссылка на файл: ' + filename);
}

function catToggleDl(ev, btn) {
  ev.stopPropagation();
  // Close all other open submenus
  document.querySelectorAll('.cat-dl-sub').forEach(s => {
    if (s !== btn.nextElementSibling) s.style.display = 'none';
  });
  const sub = btn.nextElementSibling;
  sub.style.display = sub.style.display === 'none' ? 'flex' : 'none';
}

async function catDownload(ev, filename, fmt) {
  ev.stopPropagation();
  document.querySelectorAll('.cat-dl-sub').forEach(s => s.style.display = 'none');

  if (!window.storageAPI || !window.storageAPI.dirHandle) return;
  const dataStr = await window.storageAPI.loadData(filename);
  if (!dataStr) { toast('Не удалось загрузить карту'); return; }

  try {
    const parsed = JSON.parse(dataStr);
    exportFmt(fmt, parsed.nodes, parsed.edges);
  } catch(e) {
    toast('Ошибка чтения файла');
  }
}

async function catTrashMap(ev, filename, skipConfirm = false) {
  if (ev) ev.stopPropagation();
  if (!skipConfirm && !confirm('Отправить карту «' + filename + '» в корзину?')) return;
  // Move to trash: read data, add to in-memory trash[], delete file
  try {
    const dataStr = await window.storageAPI.loadData(filename);
    if (dataStr) {
      const parsed = JSON.parse(dataStr);
      const label = parsed.nodes?.find(n => n.type === 'root')?.label || filename;
      const item = { kind: 'map', filename, label, data: dataStr, time: Date.now() };
      trash.push(item);
      updateTrashBadge();
      if(typeof saveTrashToFS === 'function') await saveTrashToFS(item);
      if(typeof saveToLocalStorage === 'function') saveToLocalStorage();
    } else {
      throw new Error('Не удалось прочитать данные файла перед удалением');
    }
    // Delete the file from the folder only after it's in trash
    await window.storageAPI.dirHandle.removeEntry(filename);
    
    // Notify other tabs to close/reset if they have this map open
    if (window._deleteChannel) {
      window._deleteChannel.postMessage({ type: 'deleted', filename });
    }

    // Local reset if the deleted map was the one active in THIS tab
    if (window.storageAPI?._currentFilename === filename) {
      if (parentMapStack && parentMapStack.length > 0) {
        await goBackToParentMap();
      } else if (typeof _initBlankMap === 'function') {
        _initBlankMap();
        window.storageAPI._currentFilename = 'map.json';
        saveToLocalStorage();
      }
    }

    toast('«' + filename + '» перемещена в корзину');
    await refreshCatalog();
  } catch(e) {
    console.error('catTrashMap error', e);
    toast('Ошибка удаления: ' + e.message);
  }
}

// ── Handle catalog-opened tab startup ───────────────────────────
(function handleCatOpen() {
  const params = new URLSearchParams(location.search);
  const catKey = params.get('catkey');
  if (!catKey) return;
  // Clean URL without reload
  history.replaceState({}, '', location.pathname);
  const raw = sessionStorage.getItem(catKey);
  if (!raw) return;
  sessionStorage.removeItem(catKey);
  try {
    const { filename, data } = JSON.parse(raw);
    // Wait for bootApp to finish then apply
    window._pendingCatOpen = { filename, data };
  } catch(e) {}
})();

// ── Auto-name file when first root label is set ────────────────
// Called from edit.js after done() completes for a root node on a new map
function autoNameMapFile(label) {
  if (!window.storageAPI || !window.storageAPI.dirHandle) return;
  if (!label || label.trim() === '') return;
  // Only auto-name if current filename is still a default/temp name
  const cur = window.storageAPI._currentFilename || 'map.json';
  // Default names follow pattern: 'map.json' or 'map_<timestamp>.json'
  const isDefault = cur === 'map.json' || /^map_\d+\.json$/.test(cur);
  if (!isDefault) return; // already has a user-defined name

  const safe = label.trim()
    .replace(/[\\/:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .substring(0, 60);
  const newName = safe + '.json';

  // Move file: save under new name, delete old
  (async () => {
    const dataStr = await window.storageAPI.loadData(cur);
    if (dataStr) {
      const ok = await window.storageAPI.saveData(dataStr, newName);
      if (ok) {
        try { await window.storageAPI.dirHandle.removeEntry(cur); } catch(e) {}
        window.storageAPI._currentFilename = newName;
        toast('Карта сохранена как «' + newName + '»');
      }
    }
  })();
}

// Close catalog dl submenus when clicking anywhere outside
document.addEventListener('click', () => {
  document.querySelectorAll('.cat-dl-sub').forEach(s => s.style.display = 'none');
}, true);

// ── Submap Logic ────────────────────────────────────────────────
async function openObjectAsMap(id) {
  const n = gN(id);
  if (!n) return;

  if (n.submapFilename && window.storageAPI) {
    const existsInRoot = await window.storageAPI.fileExists(n.submapFilename);
    if (existsInRoot) {
      saveToLocalStorage();
      catOpenMap(n.submapFilename);
      return;
    }
    
    // Check in trash
    const existsInTrash = await window.storageAPI.fileExists(n.submapFilename, "_trash");
    if (existsInTrash) {
      showSubmapTrashChoice(id, n.submapFilename);
      return;
    }

    // Not found anywhere, reset link and create new
    delete n.submapFilename;
    sh();
  }

  await createAndOpenSubmap(id);
}


function updateSubmapUi() {
  const btn = document.getElementById('btn-submap-back');
  const level = document.getElementById('submap-level');
  if (!btn || !level) return;

  if (parentMapStack.length > 0) {
    btn.style.display = 'flex';
    level.textContent = parentMapStack.length;
    btn.title = 'Назад к «' + parentMapStack[parentMapStack.length - 1].label + '» (Двойной клик: к главной)';
  } else {
    btn.style.display = 'none';
  }
}

async function goBackToParentMap() {
  if (parentMapStack.length === 0) return;
  saveToLocalStorage();
  const parent = parentMapStack[parentMapStack.length - 1];
  catOpenMap(parent.filename);
}

async function goToRootMap() {
  if (parentMapStack.length === 0) return;
  saveToLocalStorage();
  const root = parentMapStack[0];
  catOpenMap(root.filename);
}

function showSubmapTrashChoice(nodeId, filename) {
  const modal = document.getElementById('choice-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  
  const opt1 = document.getElementById('choice-opt1');
  const opt2 = document.getElementById('choice-opt2');
  const cancel = document.getElementById('choice-cancel');
  
  opt1.onclick = async () => {
    modal.style.display = 'none';
    await restoreAndOpenSubmap(nodeId, filename);
  };
  
  opt2.onclick = async () => {
    modal.style.display = 'none';
    const n = gN(nodeId);
    if (n) {
      delete n.submapFilename;
      sh();
    }
    await createAndOpenSubmap(nodeId);
  };
  
  cancel.onclick = () => {
    modal.style.display = 'none';
  };
}

async function restoreAndOpenSubmap(nodeId, filename) {
  if (!window.storageAPI) return;
  const trashHandle = await window.storageAPI.getTrashHandle();
  if (!trashHandle) return;
  
  try {
    const fileHandle = await trashHandle.getFileHandle(filename);
    const file = await fileHandle.getFile();
    const text = await file.text();
    const item = JSON.parse(text);
    const mapData = item.kind === 'map' ? item.data : text;

    // Write to root
    const ok = await window.storageAPI.saveData(mapData, filename);
    if (ok) {
      // Remove from trash
      await trashHandle.removeEntry(filename);
      // Refresh memory trash if needed
      if (typeof trash !== 'undefined') {
        const idx = trash.findIndex(t => t.filename === filename);
        if (idx !== -1) trash.splice(idx, 1);
        if (typeof updateTrashBadge === 'function') updateTrashBadge();
      }
      
      const n = gN(nodeId);
      if (n) {
        n.submapFilename = filename;
        sh();
        saveToLocalStorage();
      }

      catOpenMap(filename);
      toast('Карта восстановлена');
    }
  } catch (e) {
    toast('Ошибка восстановления');
  }
}

async function createAndOpenSubmap(id) {
  const n = gN(id);
  if (!n) return;
  const currentFilename = window.storageAPI?._currentFilename || 'map.json';
  const rootNode = nodes.find(rn => rn.type === 'root') || nodes[0];
  const currentLabel = rootNode?.label || currentFilename.replace('.json', '');

  const newMap = {
    version: '1.0',
    nodes: [{
      ...JSON.parse(JSON.stringify(n)),
      id: 1, type: 'root', x: CS / 2, y: CS / 2, nodes: []
    }],
    edges: [],
    bgSettings: JSON.parse(JSON.stringify(bgSettings)),
    snapSettings: JSON.parse(JSON.stringify(snapSettings)),
    glDefaults: JSON.parse(JSON.stringify(glDefaults)),
    linkDefaults: JSON.parse(JSON.stringify(linkDefaults)),
    nodeDefaults: JSON.parse(JSON.stringify(nodeDefaults)),
    groupDefaults: JSON.parse(JSON.stringify(groupDefaults)),
    parentMapStack: [...parentMapStack, { filename: currentFilename, label: currentLabel }],
    idC: 1
  };

  const safeLabel = (n.label || '').trim().replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').substring(0, 30) || 'submap';
  const newFilename = `${safeLabel}_${Date.now()}.json`;

  n.submapFilename = newFilename;
  sh();
  saveToLocalStorage(); // Sync parent map with the link to FS

  if (window.storageAPI) window.storageAPI._currentFilename = newFilename;
  if (applyData(JSON.stringify(newMap))) {
    toast('Подкарта создана: ' + newFilename);
  }
}


// ── Map Tree View ────────────────────────────────────────────────
const catTreeCollapsed = new Set();

function buildMapTree(items) {
  const byFile = {};
  items.forEach(it => { byFile[it.filename] = { ...it, children: [] }; });
  const childSet = new Set();
  items.forEach(parent => {
    (parent.submapLinks || []).forEach(link => {
      // Check if the link target actually exists in our file list
      if (byFile[link.filename]) {
        // Avoid self-reference and cycles (basic check)
        if (link.filename !== parent.filename) {
          byFile[parent.filename].children.push(byFile[link.filename]);
          childSet.add(link.filename);
        }
      }
    });
  });
  // Roots are items that are NOT marked as children of any other map
  return items.filter(it => !childSet.has(it.filename)).map(it => byFile[it.filename]);
}

function _makeMapIcon() {
  // Three overlapping circles: purple, turquoise, orange — black outlines on white
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', '22'); svg.setAttribute('height', '22');
  svg.setAttribute('viewBox', '0 0 22 22');
  svg.style.cssText = 'flex-shrink:0;display:block;';
  [
    { cx: 7,  cy: 14, fill: '#9b59b6' }, // purple
    { cx: 15, cy: 14, fill: '#1abc9c' }, // turquoise
    { cx: 11, cy: 8,  fill: '#e67e22' }, // orange
  ].forEach(({ cx, cy, fill }) => {
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('cx', cx); c.setAttribute('cy', cy);
    c.setAttribute('r', '6'); c.setAttribute('fill', fill);
    c.setAttribute('stroke', '#1a1a1a'); c.setAttribute('stroke-width', '1.4');
    svg.appendChild(c);
  });
  return svg;
}

function renderCatalogTree(grid, currentFile) {
  grid.innerHTML = '';
  const roots = buildMapTree(catalogItems);
  if (roots.length === 0) {
    grid.innerHTML = '<div class="cat-empty">Нет карт</div>';
    return;
  }

  function renderNode(node, depth) {
    const hasChildren = node.children && node.children.length > 0;
    const isCollapsed = catTreeCollapsed.has(node.filename);

    const row = document.createElement('div');
    row.className = 'cat-tree-row' + (node.filename === currentFile ? ' cat-tree-active' : '');
    row.style.paddingLeft = (8 + depth * 24) + 'px';

    // Collapse/expand toggle
    const toggle = document.createElement('button');
    toggle.className = 'cat-tree-toggle';
    toggle.textContent = hasChildren ? (isCollapsed ? '▶' : '▼') : '';
    toggle.style.visibility = hasChildren ? 'visible' : 'hidden';
    toggle.onclick = (e) => {
      e.stopPropagation();
      if (isCollapsed) catTreeCollapsed.delete(node.filename);
      else catTreeCollapsed.add(node.filename);
      renderCatalogTree(grid, currentFile);
    };

    const icon = _makeMapIcon();

    const lbl = document.createElement('span');
    lbl.className = 'cat-tree-label';
    lbl.textContent = node.label;
    lbl.title = node.filename;

    const meta = document.createElement('span');
    meta.className = 'cat-tree-meta';
    meta.textContent = node.filename;

    row.appendChild(toggle);
    row.appendChild(icon);
    row.appendChild(lbl);
    row.appendChild(meta);

    row.addEventListener('dblclick', () => catOpenMap(node.filename));
    row.addEventListener('contextmenu', (ev) => {
      if (typeof showGenericContext === 'function') {
        showGenericContext(ev, { type: 'catalog', filename: node.filename });
      }
    });
    grid.appendChild(row);

    if (hasChildren && !isCollapsed) {
      node.children.forEach(child => renderNode(child, depth + 1));
    }
  }

  roots.forEach(r => renderNode(r, 0));
}
