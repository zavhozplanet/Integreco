// @ts-nocheck
/* ================================================================
   INIT
================================================================ */
function init(){
  applyBg();
  const r=mkNode(CS/2,CS/2,'Главная тема',null,false,'root');hist=[];
  const br=[
    {l:'Идея 1',dx:230,dy:-150},{l:'Идея 2',dx:260,dy:50},
    {l:'Идея 3',dx:60,dy:-220},{l:'Идея 4',dx:-220,dy:-100},
    {l:'Идея 5',dx:-240,dy:80},{l:'Идея 6',dx:60,dy:200},
  ];
  br.forEach(b=>{
    const bid=mkNode(CS/2+b.dx,CS/2+b.dy,b.l,r);
    mkNode(CS/2+b.dx+195,CS/2+b.dy-40,'',bid);
    mkNode(CS/2+b.dx+195,CS/2+b.dy+40,'',bid);
  });
  hist=[];render();
  zoom=1;panX=wrap.clientWidth/2-CS/2;panY=wrap.clientHeight/2-CS/2;applyT();
}

async function bootApp() {
  if (window.storageAPI) await window.storageAPI.init();

  // Cross-tab deletion sync
  const deleteChannel = new BroadcastChannel('integreco_map_events');
  deleteChannel.onmessage = (ev) => {
    if (ev.data.type === 'deleted' && window.storageAPI?._currentFilename === ev.data.filename) {
      // Try to close tab, fallback to blank map if blocked
      window.close();
      setTimeout(() => {
        if (!window.closed && typeof _initBlankMap === 'function') {
          _initBlankMap();
          window.storageAPI._currentFilename = 'map.json';
          toast('Карта была удалена в другой вкладке');
        }
      }, 300);
    }
  };
  window._deleteChannel = deleteChannel;

  // ── Handle catalog open in new tab ───────────────────────────
  if (window._pendingCatOpen) {
    const { filename, data } = window._pendingCatOpen;
    window._pendingCatOpen = null;
    applyData(data);
    window.storageAPI._currentFilename = filename;
    saveToLocalStorage(); // Sync session storage for refresh
    return;
  }

  // ── Handle new tab from "+" button (newtabkey) ───────────────
  const params = new URLSearchParams(location.search);
  const newtabKey = params.get('newtabkey');
  if (newtabKey) {
    history.replaceState({}, '', location.pathname);
    const raw = sessionStorage.getItem(newtabKey);
    if (raw) {
      sessionStorage.removeItem(newtabKey);
      try {
        const { newFile } = JSON.parse(raw);
        if (window.storageAPI && window.storageAPI.dirHandle) {
          // Try to inherit folder access from storageAPI (persisted in IndexedDB)
          const perm = await window.storageAPI.dirHandle.queryPermission({ mode: 'readwrite' });
          if (perm === 'granted') {
            window.storageAPI._currentFilename = newFile;
          }
        }
      } catch(e) {}
    }
    _initBlankMap();
    return;
  }

  // ── Normal startup ────────────────────────────────────────────
  let loaded = false;

  if (window.storageAPI && window.storageAPI.dirHandle) {
    const permOpts = { mode: 'readwrite' };
    const perm = await window.storageAPI.dirHandle.queryPermission(permOpts);
    if (perm === 'granted') {
       if (typeof loadTrashFromFS === 'function') await loadTrashFromFS();
       
       // Try to restore the specific file this tab was working on
       let filename = window.storageAPI._currentFilename || 'map.json';
       const sess = sessionStorage.getItem('integreco-tab-data');
       if (sess) {
         try { filename = JSON.parse(sess).filename || filename; } catch(e){}
       }
       window.storageAPI._currentFilename = filename;

       const dataStr = await window.storageAPI.loadData(filename);
       if (dataStr) {
         loaded = applyData(dataStr);
         if (loaded) saveToLocalStorage(); // Ensure sessionStorage is synced with FS data
       }
    } else {
       showReconnectOverlay();
       return;
    }
  }

  if (!loaded) {
    loaded = loadFromLocalStorage();
  }

  if (!loaded) {
    init();
  }

  // Restore UI settings
  const ui = localStorage.getItem('integreco-ui-settings');
  if (ui) {
    try {
      const p = JSON.parse(ui);
      if (p.btnOpa !== undefined) updateUiOpa('btn', p.btnOpa);
      if (p.menuOpa !== undefined) updateUiOpa('menu', p.menuOpa);
      // Sync sliders
      const btnSl = document.getElementById('ui-btn-opa-slider');
      const menuSl = document.getElementById('ui-menu-opa-slider');
      if (btnSl) btnSl.value = p.btnOpa;
      if (menuSl) menuSl.value = p.menuOpa;
      syncUiBtnColors();
    } catch(e){}
  } else {
    syncUiBtnColors(); // Default colors on first run
  }
}

function _initBlankMap() {
  // Create a fresh empty canvas with a center "+" placeholder — user will type the first title
  nodes = []; edges = []; idC = 0; hist = []; fut = [];
  hasUnsavedChanges = false;
  selN = null; selE = null;

  // Reset settings defaults to factory values (preventing inheritance from previous map)
  glDefaults = {shape:'straight',dash:'solid',width:1.5,dir:'forward',color:null, fontFamily: 'Inter, sans-serif', fontWeight: 'normal', fontStyle: 'normal', fontSize: 13, textAlign: 'center', defaultFlags: { variant: false, size: false, color: false }};
  linkDefaults = {shape:'straight',dash:'link',width:1,dir:'none',color:null, fontFamily: 'Inter, sans-serif', fontWeight: 'normal', fontStyle: 'normal', fontSize: 13, textAlign: 'center', defaultFlags: { variant: false, size: false, color: false }};
  nodeDefaults = {
    style: {shape:'pill', borderType:'solid', borderWidth:1.5, padding:10, opacity:1, blur:0, borderColor:null, backgroundColor:null},
    recentColors: []
  };
  bgSettings = {
    color: '#f0ede8', lastColor: '#f0ede8', pattern: 'none', patOpacity: 0.15, patBlur: 0, patScale: 1, 
    image: null, imgEnabled: false, imgOpacity: 1, imgBlur: 0, recentColors: []
  };
  snapSettings = {
    node: false, nodeAdaptive: true,
    note: false, noteAdaptive: true,
    group: false, groupAdaptive: true,
    multi: false, multiAdaptive: true
  };
  autoMode = false;
  applyBg(); // Refresh visual background immediately

  // Create a root node that immediately enters edit mode so user types the title
  const r = mkNode(CS/2, CS/2, '', null, false, 'root');
  hist = [];
  render();
  zoom = 1;
  panX = wrap.clientWidth / 2 - CS / 2;
  panY = wrap.clientHeight / 2 - CS / 2;
  applyT();
  // Show the empty-canvas "+" prompt, then focus for typing
  setTimeout(() => editNode(r, true), 80);
  saveToLocalStorage();
}

function updateUiOpa(type, val) {
  const v = parseFloat(val);
  if (type === 'btn') {
    uiSettings.btnOpa = v;
    document.documentElement.style.setProperty('--ui-btn-opa', v);
    syncUiBtnColors();
  } else {
    uiSettings.menuOpa = v;
    document.documentElement.style.setProperty('--ui-menu-opa', v);
  }
  localStorage.setItem('integreco-ui-settings', JSON.stringify(uiSettings));
}

function syncUiBtnColors() {
  const opa = uiSettings.btnOpa !== undefined ? uiSettings.btnOpa : 0.88;
  const hex = bgSettings.color || '#f0ede8';
  
  let r = parseInt(hex.slice(1, 3), 16) || 0;
  let g = parseInt(hex.slice(3, 5), 16) || 0;
  let b = parseInt(hex.slice(5, 7), 16) || 0;

  // Approximate image effect - dragging image opacity effectively lowers luminance readability 
  if (bgSettings.imgEnabled && bgSettings.image != null) {
    const io = bgSettings.imgOpacity || 1;
    // Darken approximation to force safe white text over complex images
    r = Math.max(0, r - (255 * io * 0.4));
    g = Math.max(0, g - (255 * io * 0.4));
    b = Math.max(0, b - (255 * io * 0.4));
  }
  
  // Blend white button background with canvas background
  const effR = Math.round(255 * opa + r * (1 - opa));
  const effG = Math.round(255 * opa + g * (1 - opa));
  const effB = Math.round(255 * opa + b * (1 - opa));
  
  // Luminance: 0 = black, 1 = white. 
  // Custom threshold 0.68 ensures 50%-opaque buttons over dark backgrounds get white text.
  const lum = (effR * 0.299 + effG * 0.587 + effB * 0.114) / 255;
  
  const isDark = lum < 0.68;
  const color = isDark ? '#ffffff' : '#2c2a27';
  
  // Progressive border fading depending on opacity level
  let bColor;
  if (opa > 0.6) bColor = 'var(--nbr-dk)';
  else if (opa > 0.2) bColor = isDark ? 'rgba(255, 255, 255, 0.4)' : 'rgba(0, 0, 0, 0.25)';
  else bColor = color;
  
  document.documentElement.style.setProperty('--ui-btn-icon-color', color);
  document.documentElement.style.setProperty('--ui-btn-border-color', bColor);
}

function showReconnectOverlay() {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = 0; div.style.left = 0; div.style.right = 0; div.style.bottom = 0;
  div.style.background = 'rgba(0,0,0,0.85)';
  div.style.color = '#fff';
  div.style.display = 'flex';
  div.style.flexDirection = 'column';
  div.style.alignItems = 'center';
  div.style.justifyContent = 'center';
  div.style.zIndex = 9999;
  div.innerHTML = `
    <h2>Восстановление связи (Syncthing)</h2>
    <p style="margin-bottom:20px;text-align:center;max-width:400px;line-height:1.4">Браузер требует подтверждения для восстановления защищённого доступа к вашей рабочей локальной папке.</p>
    <button id="recon-btn" style="padding:12px 24px;border-radius:12px;border:none;background:#2ed573;color:#fff;font-size:16px;font-weight:bold;cursor:pointer;box-shadow:0 4px 12px rgba(46,213,115,0.4)">Разрешить доступ</button>
  `;
  document.body.appendChild(div);
  document.getElementById('recon-btn').onclick = async () => {
    const permOpts = { mode: 'readwrite' };
    try {
      await window.storageAPI.dirHandle.requestPermission(permOpts);
      const dataStr = await window.storageAPI.loadData();
      if (dataStr) applyData(dataStr);
      else if (!loadFromLocalStorage()) init();
    } catch(e) {
      console.warn("Permission denied, fallback to local storage");
      if (!loadFromLocalStorage()) init();
    }
    div.style.opacity = 0;
    setTimeout(() => div.remove(), 300);
  };
}

bootApp();

async function exportData() {
  const data = {
    version: '1.0',
    nodes,
    edges,
    bgSettings,
    snapSettings,
    glDefaults, linkDefaults, nodeDefaults, groupDefaults,
    parentMapStack,
    idC
  };
  const json = JSON.stringify(data, null, 2);

  // If using File System Access API, save to _backups folder
  if (window.storageAPI && window.storageAPI.dirHandle) {
    const rootLabel = nodes.find(n => n.type === 'root')?.label || 'map';
    const cleanLabel = rootLabel.replace(/[<>:"/\\|?*]/g, '_').slice(0, 50);
    const timestamp = new Date().toLocaleString('ru-RU').replace(/[,]/g, '').replace(/[.: ]/g, '-');
    const filename = `${cleanLabel}_backup_${timestamp}.json`;
    
    const ok = await window.storageAPI.saveData(json, filename, '_backups');
    if (ok) {
      toast(`Бэкап сохранен: _backups/${filename}`);
      return;
    }
  }

  // Fallback to traditional download if no workspace folder
  const blob = new Blob([json], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap_backup.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    if (applyData(e.target.result)) {
      if (typeof closeCatalog === 'function') closeCatalog();
      if (window.storageAPI) {
        window.storageAPI._currentFilename = file.name;
        // Mark as modified so it gets physically saved to the workspace folder instantly
        hasUnsavedChanges = true;
        saveToLocalStorage();
        toast('Файл «' + file.name + '» добавлен в рабочую папку');
      }
    }
  };
  reader.readAsText(file);
}

function saveToLocalStorage() {
  const data = {
    version: '1.0',
    nodes, edges, bgSettings, snapSettings, stealthActive,
    glDefaults, linkDefaults, nodeDefaults, noteDefaults, groupDefaults,
    lastUsedMapRootId, idC,
    parentMapStack,
    filename: window.storageAPI?._currentFilename || 'map.json',
    hasUnsavedChanges
  };
  const str = JSON.stringify(data);
  try {
    localStorage.setItem('mindmap-data', str);
    // Tab-specific persistence to handle independent refreshes
    sessionStorage.setItem('integreco-tab-data', str);
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
  
  if (window.storageAPI && window.storageAPI.dirHandle) {
    const fn = window.storageAPI._currentFilename || 'map.json';
    if (hasUnsavedChanges) {
      window.storageAPI.saveData(str, fn).catch(e => console.error("FS Save Error", e));
    }
  }
}

function loadFromLocalStorage() {
  // Priority 1: Current tab's session state (refreshes)
  const sess = sessionStorage.getItem('integreco-tab-data');
  if (sess) {
    const parsed = JSON.parse(sess);
    if (parsed.filename) window.storageAPI._currentFilename = parsed.filename;
    return applyData(parsed);
  }
  // Priority 2: Global last-used data (new tabs)
  const data = localStorage.getItem('mindmap-data');
  if (data) return applyData(data);
  return false;
}

function applyData(data) {
  try {
    const parsed = typeof data === 'string' ? JSON.parse(data) : data;
    if (parsed.version === '1.0') {
      nodes = parsed.nodes;
      edges = parsed.edges;
      bgSettings = parsed.bgSettings;
      if (parsed.snapSettings) snapSettings = parsed.snapSettings;
      if (parsed.stealthActive !== undefined) {
        stealthActive = parsed.stealthActive;
        document.body.classList.toggle('stealth-active', stealthActive);
        const sw = document.getElementById('stealth-switch');
        if (sw) sw.checked = stealthActive;
      }
      if (parsed.glDefaults) {
        glDefaults = {...glDefaults, ...parsed.glDefaults};
        // Migrate old text format properties from root to style sub-object
        if (!glDefaults.style) glDefaults.style = { fontFamily: 'Inter, sans-serif', fontWeight: 'normal', fontStyle: 'normal', fontSize: 13, textAlign: 'center', color: null };
        ['fontFamily', 'fontWeight', 'fontStyle', 'fontSize', 'textAlign'].forEach(key => {
          if (parsed.glDefaults[key] !== undefined) {
            glDefaults.style[key] = parsed.glDefaults[key];
            delete glDefaults[key];
          }
        });
        if (parsed.glDefaults.defaultFlags) glDefaults.defaultFlags = {...glDefaults.defaultFlags, ...parsed.glDefaults.defaultFlags};
        else glDefaults.defaultFlags = { variant: false, size: false, align: false, color: false };
      }
      if (parsed.linkDefaults) {
        linkDefaults = {...linkDefaults, ...parsed.linkDefaults};
        // Migrate old text format properties from root to style sub-object
        if (!linkDefaults.style) linkDefaults.style = { fontFamily: 'Inter, sans-serif', fontWeight: 'normal', fontStyle: 'normal', fontSize: 13, textAlign: 'center', color: null };
        ['fontFamily', 'fontWeight', 'fontStyle', 'fontSize', 'textAlign'].forEach(key => {
          if (parsed.linkDefaults[key] !== undefined) {
            linkDefaults.style[key] = parsed.linkDefaults[key];
            delete linkDefaults[key];
          }
        });
        if (parsed.linkDefaults.defaultFlags) linkDefaults.defaultFlags = {...linkDefaults.defaultFlags, ...parsed.linkDefaults.defaultFlags};
        else linkDefaults.defaultFlags = { variant: false, size: false, align: false, color: false };
      }
      if (parsed.nodeDefaults) {
        nodeDefaults.style = {...nodeDefaults.style, ...parsed.nodeDefaults.style};
        if (parsed.nodeDefaults.recentColors) nodeDefaults.recentColors = parsed.nodeDefaults.recentColors;
        if (parsed.nodeDefaults.defaultFlags) nodeDefaults.defaultFlags = {...nodeDefaults.defaultFlags, ...parsed.nodeDefaults.defaultFlags};
      }
      if (parsed.noteDefaults) {
        noteDefaults.title = {...noteDefaults.title, ...parsed.noteDefaults.title};
        noteDefaults.text = {...noteDefaults.text, ...parsed.noteDefaults.text};
        if (parsed.noteDefaults.defaultFlags) {
          if (parsed.noteDefaults.defaultFlags.title) noteDefaults.defaultFlags.title = {...noteDefaults.defaultFlags.title, ...parsed.noteDefaults.defaultFlags.title};
          if (parsed.noteDefaults.defaultFlags.text) noteDefaults.defaultFlags.text = {...noteDefaults.defaultFlags.text, ...parsed.noteDefaults.defaultFlags.text};
        }
      }
      if (parsed.groupDefaults) {
        groupDefaults.bg = {...groupDefaults.bg, ...parsed.groupDefaults.bg};
      }
      if (parsed.lastUsedMapRootId) lastUsedMapRootId = parsed.lastUsedMapRootId;
      if (parsed.parentMapStack) {
        parentMapStack = parsed.parentMapStack;
        updateSubmapUi();
      } else {
        parentMapStack = [];
        updateSubmapUi();
      }
      idC = parsed.idC;
      hasUnsavedChanges = false;
      render();
      applyBg();
      if (typeof renderAllMapBgs === 'function') renderAllMapBgs();
      
      // Mirror to session storage so this tab 'owns' this data and stays independent on refresh
      const dataToSave = {
        version: '1.0', nodes, edges, bgSettings, snapSettings,
        glDefaults, linkDefaults, nodeDefaults, noteDefaults, groupDefaults,
        lastUsedMapRootId, idC,
        filename: window.storageAPI?._currentFilename || 'map.json',
        hasUnsavedChanges: false
      };
      try { sessionStorage.setItem('integreco-tab-data', JSON.stringify(dataToSave)); } catch(e){}

      requestAnimationFrame(()=>{
        const root = (typeof gN !== 'undefined' ? gN(lastUsedMapRootId) : null) || nodes.find(n => n.type === 'root');
        if (root && typeof applyT !== 'undefined') {
          zoom = 1;
          panX = window.innerWidth / 2 - root.x;
          panY = window.innerHeight / 2 - root.y;
          applyT();
        }
      });
      return true;
    } else {
      alert("Unsupported map format version.");
    }
  } catch (err) {
    console.error('Failed to process data', err);
    alert('Invalid map file data.');
  }
  return false;
}

/* ================================================================
   GENERIC CONTEXT MENU (for buttons/catalog)
   ================================================================ */
function showGenericContext(ev, data) {
  ev.preventDefault();
  ev.stopPropagation();
  const menu = document.getElementById('generic-ctx');
  if (!menu) return;

  menu.style.display = 'block';
  menu._data = data;

  // Toggle catalog-specific items
  const isCatalog = data && data.type === 'catalog';
  const sep = document.getElementById('gc-sep-catalog');
  const share = document.getElementById('gc-share');
  const dl = document.getElementById('gc-download');
  const tr = document.getElementById('gc-trash');
  if (sep) sep.style.display = isCatalog ? 'block' : 'none';
  if (share) share.style.display = isCatalog ? 'flex' : 'none';
  if (dl) dl.style.display = isCatalog ? 'flex' : 'none';
  if (tr) tr.style.display = isCatalog ? 'flex' : 'none';

  // Prevent overflow
  const padding = 10;
  let x = ev.clientX;
  let y = ev.clientY;
  if (x + menu.offsetWidth > window.innerWidth - padding) x = window.innerWidth - menu.offsetWidth - padding;
  if (y + menu.offsetHeight > window.innerHeight - padding) y = window.innerHeight - menu.offsetHeight - padding;

  menu.style.left = x + 'px';
  menu.style.top = y + 'px';
}

// Global initialization for generic context
window.addEventListener('load', () => {
  const menu = document.getElementById('generic-ctx');
  if (!menu) return;
  
  const closeMenu = () => {
    menu.style.display = 'none';
    // Clean up any temporary highlights in catalog
    document.querySelectorAll('.cat-tree-row-ctx').forEach(r => r.classList.remove('cat-tree-row-ctx'));
  };

  document.addEventListener('click', closeMenu);
  document.addEventListener('contextmenu', (ev) => {
    if (ev.target.closest('#generic-ctx')) return;
    if (menu.style.display === 'block') closeMenu();
  });

  // ── Event delegation on the menu container for all catalog actions ──
  menu.addEventListener('click', (ev) => {
    const target = ev.target.closest('.gc-item');
    if (!target) return;
    ev.stopPropagation();

    const data = menu._data;
    const id = target.id;

    if (id === 'gc-open-new-tab') {
      if (!data) return;
      if (data.type === 'catalog' && typeof catOpenMap === 'function') {
        catOpenMap(data.filename, true);
      } else if (data.type === 'newmap' && typeof newTab === 'function') {
        newTab(true);
      }
      closeMenu();
      return;
    }

    if (!data || data.type !== 'catalog') return;
    const fn = data.filename;

    if (id === 'gc-share') {
      catShare(ev, fn);
      closeMenu();
    } else if (id === 'gc-download') {
      catDownload(ev, fn, 'jsonld');
      closeMenu();
    } else if (id === 'gc-trash') {
      closeMenu();
      // skipConfirm=true: user already chose "Move to Trash" from menu
      catTrashMap({ stopPropagation: () => {} }, fn, true);
    }
  });

  const miNew = document.getElementById('mi-newtab');
  if (miNew) {
    miNew.addEventListener('contextmenu', (ev) => showGenericContext(ev, { type: 'newmap' }));
  }
});
