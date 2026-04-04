/* ================================================================
   CONSTANTS & STATE
================================================================ */
const LCOLS=['#b0aba4','#4a7cf7','#e05252','#43c37a','#f5a623','#9b59b6','#16a085','#e67e22'];
const BG_COLS=['#f0ede8','#ffffff','#e8f0f0','#f0e8f0','#e8e8f0','#f0f0e8','#2c2a27'];
const CS=8000; // canvas size

let nodes=[], edges=[];
let selN=null, selE=null;
let lastActiveNodeId=null, lastUsedMapRootId=null;
let lastCanvClick=0, lastCenterClick=0;
let canvDblMenu = document.getElementById('canv-dbl-menu');
let idC=0;
let zoom=1, panX=0, panY=0;
let gls='straight', gld='solid'; // kept for legacy mobile sheet
// Default settings for newly created edges
let glDefaults={shape:'straight',dash:'solid',width:1.5,dir:'forward',color:null};
let linkDefaults={shape:'straight',dash:'link',width:1,dir:'none',color:null};
let pendingInsert = null; // {nodeId, edgeId}
let bgSettings = {
  color: '#f0ede8',
  lastColor: '#f0ede8',
  pattern: 'none', // 'dots', 'grid', 'rough', 'paper'
  patOpacity: 0.15,
  patBlur: 0,
  patScale: 1,
  image: null,
  imgEnabled: false,
  imgOpacity: 1,
  imgBlur: 0,
  recentColors: [] // max 5
};
let hist=[], fut=[];
let autoMode=false; // manual by default
let preAutoSnapshot=null; // saved positions before entering auto
let clipboard=null; // {type:'node'|'branch', data}
let linkMode=false, linkFromId=null;
let branchViewId=null; // if set, only show this branch
let noteNodeId=null;
let trash=[];
let mobRnNodeId=null, mobRnIsNew=false;
let snapSettings = {
  node: false, nodeAdaptive: true,
  note: false, noteAdaptive: true,
  group: false, groupAdaptive: true
};
let nodeDefaults = {
  style: {
    shape: 'pill',
    borderType: 'solid',
    borderWidth: 1.5,
    padding: 10,
    opacity: 1,
    blur: 0,
    borderColor: null,
    backgroundColor: null
  },
  pins: { shape: false, params: false, line: false, color: false }
};
let selNSet=new Set(); // multi-selected nodes from area selection
let selEHandles=true;  // whether to show bezier handles for selected edge
let edgeTapState={eid:null,t:0}; // touch double-tap detection on edges
let selBoxState={active:false}; // area selection drag state
let stealthActive=false;
let stealthTimer=null;

const wrap=document.getElementById('wrap');
const canvas=document.getElementById('canvas');
const svgl=document.getElementById('svgl');
const lpPanel=document.getElementById('lp');
const ctxMenu=document.getElementById('ctxmenu');
const canvCtx=document.getElementById('canvctx');
const mmenu=document.getElementById('mmenu');
const glLink=document.getElementById('ghost-ln');
const ghHd=document.getElementById('ghost-hd');

