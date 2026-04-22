// @ts-nocheck
/* ================================================================
   EXPOSE GLOBALS — bridge module-scoped functions to window
   for HTML inline event handlers (onclick, onchange, oninput).
   This file MUST be concatenated LAST.
================================================================ */
Object.assign(window, {
  // ── UI buttons (top bar) ──
  undo, redo, zoomIn, zoomOut,
  handleCenterClick, toggleMini, openCatalog,
  toggleFS, toggleMenu, toggleStealth, toggleSettings,

  // ── Canvas double-click menu ──
  addFromDbl, hideCanvDblMenu,

  // ── Node context menu ──
  ctxExec, ctxExecMulti,
  setNsColorTarget, toggleNodePin,
  applyNodeStyleToSelection, updateNodeStyle,
  
  // ── Text Formatting ──
  updateTextStyle, showTextFmtCtx,
  openNoteTitleFmt, openNoteTextFmt,
  toggleWeight, toggleFontStyle, toggleStrike,
  toggleTextDefault, applyTextStyleToSelected,
  applyDefaultsToSelection,
  mdWrap,

  // ── Background / Canvas context menu ──
  updateBg, updateBgColorManual, setBgColorTarget,
  toggleBgPin, applyBgStyleToSelection,
  toggleImg, handleBgFile,

  // ── Line panel (desktop) ──
  setEP, setDefault, deleteSelectedEdge,
  toggleFixedEndpoint, insertObjectOnEdge,
  applyColorToBranch, togglePlusSub, closeLp,
  toggleHierLock,

  // ── Line panel (mobile) ──
  setGLSM, setGLDM, setEPM, closeLSheet, showLSheet,

  // ── Branch view ──
  enterBranchView, exitBranchView,
  toggleBranchSettings, toggleBranchGroups,

  // ── Mobile rename ──
  mobRnOk, mobRnCancel,

  // ── Notes ──
  openNote, closeNote, closeNoteAndOpenTrash,
  trashNote, deleteNote,
  cutNote, copyNote, pasteNote,
  shareNote, downloadNote,
  toggleNBurger, toggleNDlSub, noteTab,

  // ── Trash ──
  openTrash, closeTrash, tAction,
  toggleTrashItem, toggleAllTrash,
  toggleTShareMenu, toggleTDlMenu,

  // ── Catalog ──
  closeCatalog, newTab,
  setCatalogSort, setCatalogView,
  selectWorkspaceFolder,
  openObjectAsMap, goBackToParentMap, goToRootMap,

  // ── Menu / Settings / Export ──
  toggleExportSub, exportData, exportFmt,
  importData, updateUiOpa,
  updateSnap, updateSnapAdaptive,

  // ── Map background ──
  setCanvasBgMode,
  openMapBgPositioning, closeMapBgPositioning,
  mapBgPosReset, mapBgPosZoom,
  openMapBgRootSelector, closeMapBgRootSelector,
  toggleMapBgSwitch, updateMapBg,

  // ── Image catalog ──
  openImgCatalog, closeImgCatalog,
  handleImgCatFileInput, deleteSelectedImgCat,
  toggleAllImgCat,
});
