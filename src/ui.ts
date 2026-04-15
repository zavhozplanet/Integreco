// @ts-nocheck
/* ================================================================
   ZOOM
================================================================ */
function setZ(nz,cx,cy){nz=Math.min(Math.max(nz,.08),6);panX=cx-(cx-panX)*(nz/zoom);panY=cy-(cy-panY)*(nz/zoom);zoom=nz;applyT();renderMinimap()}
function zoomIn(){setZ(zoom*1.2,wrap.clientWidth/2,wrap.clientHeight/2)}
function zoomOut(){setZ(zoom/1.2,wrap.clientWidth/2,wrap.clientHeight/2)}
document.getElementById('btn-zin').addEventListener('touchend',ev=>{ev.preventDefault();zoomIn()},{passive:false});
document.getElementById('btn-zout').addEventListener('touchend',ev=>{ev.preventDefault();zoomOut()},{passive:false});

/* ================================================================
   FULLSCREEN
================================================================ */
function toggleFS(){
  if(!document.fullscreenElement){
    document.documentElement.requestFullscreen && document.documentElement.requestFullscreen().catch(()=>{});
  } else {
    document.exitFullscreen && document.exitFullscreen().catch(()=>{});
  }
}

/* ================================================================
   MINIMAP
================================================================ */
let miniVisible=false;
function toggleMini(){miniVisible=!miniVisible;document.getElementById('minimap').style.display=miniVisible?'block':'none';if(miniVisible)renderMinimap()}

function renderMinimap(){
  if(!miniVisible)return;
  const mc=document.getElementById('mm-canvas');const ctx=mc.getContext('2d');
  const W=360,H=240;mc.width=W;mc.height=H;
  ctx.fillStyle='#f5f2ed';ctx.fillRect(0,0,W,H);
  if(!nodes.length)return;
  const visNs=nodes.filter(n=>isVisible(n.id));
  const xs=visNs.map(n=>n.x),ys=visNs.map(n=>n.y);
  const minX=Math.min(...xs)-120,maxX=Math.max(...xs)+120,minY=Math.min(...ys)-80,maxY=Math.max(...ys)+80;
  const rw=maxX-minX||1,rh=maxY-minY||1;
  const sc=Math.min((W-20)/rw,(H-20)/rh);
  const ox=(W-rw*sc)/2-minX*sc,oy=(H-rh*sc)/2-minY*sc;
  const tx=x=>x*sc+ox,ty=y=>y*sc+oy;

  // edges
  edges.forEach(e=>{
    const f=gN(e.from),t=gN(e.to);if(!f||!t||!isVisible(e.from)||!isVisible(e.to))return;
    ctx.strokeStyle=e.color||'#b0aba4';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(tx(f.x),ty(f.y));ctx.lineTo(tx(t.x),ty(t.y));ctx.stroke();
  });
  // nodes
  visNs.forEach(n=>{
    ctx.fillStyle=gPar(n.id)==null?'#3d3b38':'#fff';ctx.strokeStyle='#d8d4ce';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(tx(n.x)-18,ty(n.y)-7,36,14,7);ctx.fill();ctx.stroke();
  });
  // viewport rect — vpEl is positioned in minimap div (180x120 CSS px); internal canvas is 360x240
  const vpEl=document.getElementById('minimap-vp');
  const mmDiv=document.getElementById('minimap');
  const ww=wrap.clientWidth,wh=wrap.clientHeight;
  const mmScale=mmDiv.clientWidth/360; // usually 0.5
  const vl=((-panX/zoom)*sc+ox)*mmScale;
  const vt=((-panY/zoom)*sc+oy)*mmScale;
  const vw=(ww/zoom)*sc*mmScale;
  const vh=(wh/zoom)*sc*mmScale;
  vpEl.style.left=vl+'px';vpEl.style.top=vt+'px';vpEl.style.width=vw+'px';vpEl.style.height=vh+'px';
}

/* minimap drag/click */
let mmDrag={active:false};
function mmGetMapParams(){
  const W=360,H=240;
  const visNs=nodes.filter(n=>isVisible(n.id));if(!visNs.length)return null;
  const xs=visNs.map(n=>n.x),ys=visNs.map(n=>n.y);
  const minX=Math.min(...xs)-120,maxX=Math.max(...xs)+120,minY=Math.min(...ys)-80,maxY=Math.max(...ys)+80;
  const rw=maxX-minX||1,rh=maxY-minY||1;
  const sc=Math.min((W-20)/rw,(H-20)/rh);
  const ox=(W-rw*sc)/2-minX*sc,oy=(H-rh*sc)/2-minY*sc;
  return{W,H,sc,ox,oy};
}
function mmMoveTo(clientX,clientY){
  const mc=document.getElementById('mm-canvas');const p=mmGetMapParams();if(!p)return;
  const rect=mc.getBoundingClientRect();
  const mx=(clientX-rect.left)/rect.width*p.W,my=(clientY-rect.top)/rect.height*p.H;
  const cx=(mx-p.ox)/p.sc,cy=(my-p.oy)/p.sc;
  panX=wrap.clientWidth/2-cx*zoom;panY=wrap.clientHeight/2-cy*zoom;applyT();renderMinimap();
}
const mmEl=document.getElementById('minimap');
mmEl.addEventListener('mousedown',ev=>{
  ev.stopPropagation();mmDrag={active:true};mmMoveTo(ev.clientX,ev.clientY);
});
mmEl.addEventListener('touchstart',ev=>{
  ev.stopPropagation();ev.preventDefault();mmDrag={active:true};mmMoveTo(ev.touches[0].clientX,ev.touches[0].clientY);
},{passive:false});
window.addEventListener('mousemove',ev2=>{if(mmDrag.active)mmMoveTo(ev2.clientX,ev2.clientY)});
window.addEventListener('mouseup',()=>{mmDrag.active=false});
window.addEventListener('touchmove',ev2=>{if(mmDrag.active&&ev2.touches.length)mmMoveTo(ev2.touches[0].clientX,ev2.touches[0].clientY)},{passive:true});
window.addEventListener('touchend',()=>{mmDrag.active=false},{passive:true});

