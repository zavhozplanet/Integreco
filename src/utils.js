/* ================================================================
   UTILS
================================================================ */
function nid(){return++idC}
function gN(id){return nodes.find(n=>n.id===id)}
function gE(id){return edges.find(e=>e.id===id)}
function gCh(id){return edges.filter(e=>e.from===id).map(e=>e.to)}
function gPar(id) {
  const n = gN(id);
  if (n && n.type === 'root') return null;
  const e = edges.find(e => e.to === id && e.dash !== 'link');
  return e ? e.from : null;
}
function isMob(){return window.innerWidth<768||('ontouchstart' in window)}
function s2c(sx,sy){return{x:(sx-panX)/zoom,y:(sy-panY)/zoom}}
function c2s(cx,cy){return{x:cx*zoom+panX,y:cy*zoom+panY}}
function isVisible(id){
  const n = gN(id);
  if(n && n.type === 'group') {
    const inGroup = nodes.filter(x => 
      x.type !== 'group' && 
      x.x >= n.x - n.width/2 && x.x <= n.x + n.width/2 && 
      x.y >= n.y - n.height/2 && x.y <= n.y + n.height/2
    );
    if(inGroup.length > 0) {
      const anyVisible = inGroup.some(x => isBaseVisible(x.id));
      if(!anyVisible) return false;
    }
  }
  return isBaseVisible(id);
}

function isBaseVisible(id){
  if(branchViewId){
    let c=id;for(let i=0;i<200;i++){if(c===branchViewId)return true;const p=gPar(c);if(p==null)return false;c=p}
    return false;
  }
  
  // Iterative check for any open path to a root
  let q = [id];
  let visited = new Set();
  while(q.length > 0) {
    let cur = q.shift();
    const n = gN(cur);
    if(!n || n.type === 'root') return true;
    if(visited.has(cur)) continue;
    visited.add(cur);
    if(visited.size > 200) break; // cycle/depth limit

    // Consider ALL incoming edges so that secondary lines ("связки") keep the node visible
    const parents = edges.filter(e => e.to === cur);
    if(parents.length === 0) return true; // floating node is visible
    
    for(const e of parents) {
      if(!e.collapsed) {
        q.push(e.from);
      }
    }
  }
  return false;
}

function sh(){hasUnsavedChanges=true;hist.push(JSON.stringify({nodes,edges,bgSettings}));if(hist.length>100)hist.shift();fut=[]}
function undo(){if(!hist.length)return;fut.push(JSON.stringify({nodes,edges,bgSettings}));loadSt(JSON.parse(hist.pop()))}
function redo(){if(!fut.length)return;hist.push(JSON.stringify({nodes,edges,bgSettings}));loadSt(JSON.parse(fut.pop()))}
function loadSt(s){nodes=s.nodes;edges=s.edges;bgSettings=s.bgSettings||bgSettings;applyBg();idC=Math.max(0,...nodes.map(n=>n.id),...edges.map(e=>e.id));selN=null;selE=null;selEHandles=true;selNSet.clear();render()}

function toast(msg,duration=2000){
  const t=document.getElementById('toast');t.textContent=msg;t.style.display='block';
  clearTimeout(t._t);t._t=setTimeout(()=>{t.style.display='none'},duration);
}

function pruneGroupEdges() {
  let toRemove = [];
  edges.forEach(e => {
    const fn = gN(e.from), tn = gN(e.to);
    if (!fn || !tn) return;
    if (fn.type === 'group' && tn.type !== 'group') {
      const hw = (fn.width || 300)/2, hh = (fn.height || 200)/2;
      if (tn.x >= fn.x - hw && tn.x <= fn.x + hw && tn.y >= fn.y - hh && tn.y <= fn.y + hh)
        toRemove.push(e.id);
    } else if (tn.type === 'group' && fn.type !== 'group') {
      const hw = (tn.width || 300)/2, hh = (tn.height || 200)/2;
      if (fn.x >= tn.x - hw && fn.x <= tn.x + hw && fn.y >= tn.y - hh && fn.y <= tn.y + hh)
        toRemove.push(e.id);
    }
  });
  if (toRemove.length > 0) {
    edges = edges.filter(e => !toRemove.includes(e.id));
    if (selE && toRemove.includes(selE)) selE = null;
  }
}
function getContrastColor(hex) {
  if (!hex || !hex.startsWith('#')) return '#2c2a27';
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
  return lum < 0.5 ? '#ffffff' : '#2c2a27';
}
function hexToRgba(hex, alpha) {
  if (!hex || !hex.startsWith('#')) return `rgba(255,255,255,${alpha})`;
  const r = parseInt(hex.slice(1, 3), 16) || 0;
  const g = parseInt(hex.slice(3, 5), 16) || 0;
  const b = parseInt(hex.slice(5, 7), 16) || 0;
  return `rgba(${r},${g},${b},${alpha})`;
}

function hexToRgb(hex) {
  if (!hex || !hex.startsWith('#')) return {r:255, g:255, b:255};
  return {
    r: parseInt(hex.slice(1, 3), 16) || 0,
    g: parseInt(hex.slice(3, 5), 16) || 0,
    b: parseInt(hex.slice(5, 7), 16) || 0
  };
}

function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function getLuminance(hex) {
  const {r, g, b} = hexToRgb(hex);
  const linearize = (c) => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

function blendColors(c1, c2, alpha) {
  const r1 = hexToRgb(c1), r2 = hexToRgb(c2);
  const r = Math.round(r1.r * (1 - alpha) + r2.r * alpha);
  const g = Math.round(r1.g * (1 - alpha) + r2.g * alpha);
  const b = Math.round(r1.b * (1 - alpha) + r2.b * alpha);
  return rgbToHex(r, g, b);
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}

function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function adjustColorForContrast(colorHex, bgHex) {
  const lumB = getLuminance(bgHex);
  const rgbC = hexToRgb(colorHex);
  const lumC = getLuminance(colorHex);
  
  const getContrastRatio = (l1, l2) => {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  };

  const currentCR = getContrastRatio(lumC, lumB);
  const MIN_CONTRAST = 6.0; // Higher Target WCAG ratio for thin UI lines (4.0 is too faint visually)
  
  if (currentCR < MIN_CONTRAST) {
    let toLight;
    // WCAG recommends lighter text if background is very dark, else pick direction that affords more contrast range
    if (lumB < 0.175) toLight = true;
    else if (lumB > 0.5) toLight = false;
    else toLight = lumC >= 0.175;

    const { h, s, l } = rgbToHsl(rgbC.r, rgbC.g, rgbC.b);
    
    for (let factor = 0.05; factor <= 1.0; factor += 0.05) {
      // faster lightness shift curve to ensure we reach solid white/black if needed
      const newL = toLight ? Math.min(1, l + factor * 1.5 * (1.0 - l)) : Math.max(0, l - factor * 1.5 * l);
      const newRgb = hslToRgb(h, s, newL);
      const newHex = rgbToHex(newRgb.r, newRgb.g, newRgb.b);
      const newLum = getLuminance(newHex);
      
      if (getContrastRatio(newLum, lumB) >= MIN_CONTRAST) {
        return newHex;
      }
    }
    // Fallback if mathematically unreachable without blowing up HSL (rare for 4.0)
    return toLight ? "#ffffff" : "#2c2a27";
  }
  return colorHex;
}

function getEdgeGroupBg(e) {
  const f = gN(e.from), t = gN(e.to);
  if(!f || !t) return null;
  
  const group = nodes.find(n => {
    if(n.type !== 'group' || !isVisible(n.id)) return false;
    const bg = n.bg || groupDefaults.bg;
    if((bg.opacity ?? 0.1) < 0.01 && !bg.imgEnabled) return false;
    
    const hw = (n.width || 300) / 2, hh = (n.height || 200) / 2;
    // Check BOTH endpoints for strict containment
    const fIn = (f.x >= n.x - hw && f.x <= n.x + hw && f.y >= n.y - hh && f.y <= n.y + hh);
    const tIn = (t.x >= n.x - hw && t.x <= n.x + hw && t.y >= n.y - hh && t.y <= n.y + hh);
    return fIn && tIn;
  });
  return group ? group.bg : null;
}
