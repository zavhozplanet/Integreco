/* ================================================================
   MENU
================================================================ */
function toggleMenu(ev){
  if(ev) ev.stopPropagation();
  const isOpening = !mmenu.classList.contains('show');
  if(isOpening) hideAllMenus();
  mmenu.classList.toggle('show');
}
function toggleExportSub(ev){if(ev)ev.stopPropagation();document.getElementById('export-sub').classList.toggle('open')}

document.getElementById('mi-share').onclick=()=>{
  const url=window.location.href;
  if(navigator.clipboard)navigator.clipboard.writeText(url).then(()=>{
    document.getElementById('mi-share').innerHTML='<span class="mic check-anim">✅</span>Ссылка скопирована';
    setTimeout(()=>{document.getElementById('mi-share').innerHTML='<span class="mic">🔗</span>'},2000);
  });
  else{toast('Скопируйте адрес из строки браузера')}
};

function exportFmt(fmt, customNodes, customEdges){
  mmenu.classList.remove('show');
  const expNodes = customNodes || nodes;
  const expEdges = customEdges || edges;
  
  if(fmt==='jsonld'){
    const data={
      "@context":"https://schema.org","@type":"MindMap","name":expNodes[0]?.label||"",
      "nodes":expNodes.map(n=>({id:n.id,label:n.label,note:n.note,x:n.x,y:n.y})),
      "edges":expEdges.map(e=>({from:e.from,to:e.to,type:e.dash==='link'?'link':'hierarchy',shape:e.shape}))
    };
    dl(JSON.stringify(data,null,2),'mindmap.jsonld','application/ld+json');
  } else if(fmt==='md'){
    const nodeIds = new Set(expNodes.map(n=>n.id));
    const roots = expNodes.filter(n => {
      const p = expEdges.find(e => e.to === n.id && e.dash !== 'link');
      return !p || !nodeIds.has(p.from);
    });
    
    function nodeToMd(id,depth){
      const n=expNodes.find(x=>x.id===id);if(!n)return'';const indent='  '.repeat(depth);
      let s=indent+'- **'+n.label+'**\n';
      if(n.note)s+=indent+'  > '+n.note.replace(/\n/g,'\n'+indent+'  > ')+'\n';
      expEdges.filter(e=>e.from===id && e.dash!=='link').forEach(e=>{s+=nodeToMd(e.to,depth+1)});return s;
    }
    const links=expEdges.filter(e=>e.dash==='link').map(e=>`- ${expNodes.find(x=>x.id===e.from)?.label||e.from} ↔ ${expNodes.find(x=>x.id===e.to)?.label||e.to}`).join('\n');
    let md=`# ${expNodes[0]?.label||'MindMap'}\n\n`;
    roots.forEach(r => { md+=nodeToMd(r.id,0); });
    if(links)md+=`\n## Связи\n${links}\n`;
    dl(md,'mindmap.md','text/markdown');
  } else if(fmt==='png'){
    toast('Подготовка PNG...',3000);
    const scale=2;const allN=customNodes ? expNodes : expNodes.filter(n=>isVisible(n.id));
    if(!allN.length) return;
    const xs=allN.map(n=>n.x),ys=allN.map(n=>n.y);
    const minX=Math.min(...xs)-100,minY=Math.min(...ys)-60,maxX=Math.max(...xs)+100,maxY=Math.max(...ys)+60;
    const w=(maxX-minX)*scale,h=(maxY-minY)*scale;
    const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');
    ctx.fillStyle='#f0ede8';ctx.fillRect(0,0,w,h);
    const tx=x=>(x-minX)*scale,ty=y=>(y-minY)*scale;
    expEdges.forEach(e=>{const f=expNodes.find(x=>x.id===e.from),t=expNodes.find(x=>x.id===e.to);if(!f||!t)return;ctx.strokeStyle=e.color||'#b0aba4';ctx.lineWidth=e.width*scale||1.5*scale;ctx.beginPath();ctx.moveTo(tx(f.x),ty(f.y));ctx.lineTo(tx(t.x),ty(t.y));ctx.stroke()});
    allN.forEach(n=>{
      const isRoot=gPar(n.id)==null;ctx.fillStyle=isRoot?'#3d3b38':'#fff';ctx.strokeStyle='#d8d4ce';ctx.lineWidth=scale;
      const tw=ctx.measureText(n.label).width+24*scale,th=28*scale,rx=tx(n.x)-tw/2,ry=ty(n.y)-th/2;
      ctx.beginPath();ctx.roundRect(rx,ry,tw,th,12*scale);ctx.fill();ctx.stroke();
      ctx.fillStyle=isRoot?'#fff':'#2c2a27';ctx.font=`${13*scale}px Inter,sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(n.label,tx(n.x),ty(n.y));
    });
    c.toBlob(blob=>{const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mindmap.png';a.click();URL.revokeObjectURL(url)});
  }
}

function dl(content,name,type){const b=new Blob([content],{type});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download=name;a.click();URL.revokeObjectURL(u)}

function newTab(){
  mmenu.classList.remove('show');
  
  const isEmptyTab = nodes.length <= 1 && (!nodes[0] || !nodes[0].label || nodes[0].label === 'Новая карта' || nodes[0].label === 'Главная тема');
  if (isEmptyTab) {
    if (typeof _initBlankMap === 'function') {
      _initBlankMap();
      return;
    }
  }

  // Generate a safe blank-map filename in the workspace folder
  const baseFilename = _resolveNewMapFilename();
  // Open the app in a new browser tab, passing the target filename via sessionStorage
  const key = 'newtab_' + Date.now();
  sessionStorage.setItem(key, JSON.stringify({ newFile: baseFilename }));
  window.open(location.pathname + '?newtabkey=' + encodeURIComponent(key), '_blank');
}

// Pick a filename that doesn't collide with existing files in the folder
function _resolveNewMapFilename() {
  if (!window.storageAPI || !window.storageAPI.dirHandle) return 'map.json';
  // We can't do async here so we'll use a timestamp-based unique name
  // The actual dedup check happens asynchronously in the new tab's boot
  return 'map_' + Date.now() + '.json';
}

