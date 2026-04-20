# Integreco — Architectural Decisions

| Decision | Reason |
|---|---|
| Inline Markdown in labels (`parseMd`/`stripMd`) added as global-scope file in SRC_ORDER, not as ES module | Consistent with existing concatenation architecture; zero regression risk; ES module migration deferred to full migration phase |
| `node.label` remains a plain string with Markdown syntax; no schema change | Backward-compatible; no save/load changes needed; Markdown markers are stripped for measureText (Dogma #1) |
| Markdown toolbar appears only during textarea editing, separate from whole-node formatting in `showTextFmtCtx` | Two orthogonal systems: whole-node style (CSS properties) vs inline fragments (Markdown markers in text) |
| Text styles moved from `textVariant` to separate `fontWeight` and `fontStyle` | Allows bold+italic simultaneously; simpler CSS mapping |
