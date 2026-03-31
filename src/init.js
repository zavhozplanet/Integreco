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

if (!loadFromLocalStorage()) {
  init();
}
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
    try {
      const data = JSON.parse(e.target.result);
      if (data.version !== '1.0') {
        alert('Unsupported version');
        return;
      }
      nodes = data.nodes;
      edges = data.edges;
      bgSettings = data.bgSettings;
      idC = data.idC;
      render();
      applyBg();
    } catch (err) {
      alert('Invalid file');
    }
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
    idC
  };
  try {
    localStorage.setItem('mindmap-data', JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to local storage', e);
  }
}

function loadFromLocalStorage() {
  const data = localStorage.getItem('mindmap-data');
  if (data) {
    try {
      const parsed = JSON.parse(data);
      if (parsed.version === '1.0') {
        nodes = parsed.nodes;
        edges = parsed.edges;
        bgSettings = parsed.bgSettings;
        if (parsed.snapSettings) snapSettings = parsed.snapSettings;
        idC = parsed.idC;
        render();
        applyBg();
        return true;
      }
    } catch (err) {
      console.error('Failed to load from local storage', err);
    }
  }
  return false;
}
