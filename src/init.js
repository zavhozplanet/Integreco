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
  
  let loaded = false;
  
  if (window.storageAPI && window.storageAPI.dirHandle) {
    const permOpts = { mode: 'readwrite' };
    const perm = await window.storageAPI.dirHandle.queryPermission(permOpts);
    if (perm === 'granted') {
       const dataStr = await window.storageAPI.loadData();
       if (dataStr) loaded = applyData(dataStr);
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

function exportData() {
  const data = {
    version: '1.0',
    nodes,
    edges,
    bgSettings,
    idC
  };
  const blob = new Blob([JSON.stringify(data)], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'mindmap.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importData(input) {
  const file = input.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    applyData(e.target.result);
  };
  reader.readAsText(file);
}

function saveToLocalStorage() {
  const data = {
    version: '1.0',
    nodes,
    edges,
    bgSettings,
    snapSettings,
    glDefaults,
    linkDefaults,
    nodeDefaults,
    groupDefaults,
    lastUsedMapRootId,
    idC
  };
  const str = JSON.stringify(data);
  try {
    localStorage.setItem('mindmap-data', str);
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
  
  if (window.storageAPI && window.storageAPI.dirHandle) {
    window.storageAPI.saveData(str).catch(e => console.error("FS Save Error", e));
  }
}

function loadFromLocalStorage() {
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
      if (parsed.glDefaults) glDefaults = parsed.glDefaults;
      if (parsed.linkDefaults) linkDefaults = parsed.linkDefaults;
      if (parsed.nodeDefaults) {
        nodeDefaults.style = {...nodeDefaults.style, ...parsed.nodeDefaults.style};
        if (parsed.nodeDefaults.recentColors) nodeDefaults.recentColors = parsed.nodeDefaults.recentColors;
      }
      if (parsed.groupDefaults) {
        groupDefaults.bg = {...groupDefaults.bg, ...parsed.groupDefaults.bg};
      }
      if (parsed.lastUsedMapRootId) lastUsedMapRootId = parsed.lastUsedMapRootId;
      idC = parsed.idC;
      render();
      applyBg();
      
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
