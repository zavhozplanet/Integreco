// @ts-nocheck
/* ================================================================
   INLINE MARKDOWN PARSER
   Parses lightweight Markdown into safe HTML for node labels.
   Supported: **bold**, *italic*, ~~strike~~, [label](url), \n → <br>
   Security: strips <script>, <iframe>, on* attrs, javascript: hrefs.
================================================================ */

/**
 * Parse inline Markdown to safe HTML.
 * Only used for rendering in view mode (innerHTML).
 */
function parseMd(raw) {
  if (!raw) return '';
  // Escape HTML entities first to prevent injection
  let s = raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold: **text** or __text__
  s = s.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  s = s.replace(/__(.+?)__/g, '<b>$1</b>');

  // Italic: *text* or _text_ (but not inside ** or __)
  s = s.replace(/\*(.+?)\*/g, '<i>$1</i>');
  s = s.replace(/_(.+?)_/g, '<i>$1</i>');

  // Strikethrough: ~~text~~
  s = s.replace(/~~(.+?)~~/g, '<s>$1</s>');

  // Links: [label](url) — sanitize href
  s = s.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, href) => {
    // Block javascript: and data: URIs
    if (/^\s*(javascript|data):/i.test(href)) return label;
    return `<a href="${href}" target="_blank" rel="noopener">${label}</a>`;
  });

  // Newlines to <br>
  s = s.replace(/\n/g, '<br>');

  return s;
}

/**
 * Strip Markdown markers, return visible text only.
 * Used for canvas.measureText() — ARCHITECTURE.md Dogma #1.
 */
function stripMd(raw) {
  if (!raw) return '';
  let s = raw;
  // Remove link syntax: [label](url) → label
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Remove bold markers
  s = s.replace(/\*\*(.+?)\*\*/g, '$1');
  s = s.replace(/__(.+?)__/g, '$1');
  // Remove italic markers
  s = s.replace(/\*(.+?)\*/g, '$1');
  s = s.replace(/_(.+?)_/g, '$1');
  // Remove strikethrough markers
  s = s.replace(/~~(.+?)~~/g, '$1');
  return s;
}

/**
 * Wrap selected text in a textarea with Markdown markers.
 * If nothing is selected, does nothing.
 * Returns true if text was wrapped, false otherwise.
 */
function wrapSelectionMd(textarea, prefix, suffix) {
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  if (start === end) return false; // nothing selected

  const val = textarea.value;
  const selected = val.substring(start, end);

  // Check if already wrapped — toggle off
  const before = val.substring(Math.max(0, start - prefix.length), start);
  const after = val.substring(end, end + suffix.length);
  if (before === prefix && after === suffix) {
    // Unwrap
    textarea.value = val.substring(0, start - prefix.length) + selected + val.substring(end + suffix.length);
    textarea.selectionStart = start - prefix.length;
    textarea.selectionEnd = end - prefix.length;
  } else {
    // Wrap
    textarea.value = val.substring(0, start) + prefix + selected + suffix + val.substring(end);
    textarea.selectionStart = start + prefix.length;
    textarea.selectionEnd = end + prefix.length;
  }
  textarea.focus();
  // Fire input event so auto-resize triggers
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
  return true;
}

/* ----------------------------------------------------------------
   TOOLBAR HELPERS
   ---------------------------------------------------------------- */
let _activeMdTextarea = null;

/** Position and show the Markdown toolbar above the given textarea */
function _showMdToolbar(ta) {
  const tb = document.getElementById('md-toolbar');
  if (!tb) return;
  // Make toolbar buttons focusable so relatedTarget works on blur
  tb.querySelectorAll('.md-tb-btn').forEach(b => b.setAttribute('tabindex', '-1'));

  const _positionToolbar = () => {
    const r = ta.getBoundingClientRect();
    const wrap = document.getElementById('wrap');
    const wrapR = wrap ? wrap.getBoundingClientRect() : { left: 0, top: 0 };
    // Place above the textarea, centered
    tb.style.left = (r.left - wrapR.left + r.width / 2 - 50) + 'px';
    tb.style.top = (r.top - wrapR.top - 36) + 'px';
  };
  _positionToolbar();
  tb.style.display = 'flex';
  // Reposition if textarea resizes (multi-line input)
  ta._mdRepos = () => _positionToolbar();
  ta.addEventListener('input', ta._mdRepos);
}

function _hideMdToolbar() {
  const tb = document.getElementById('md-toolbar');
  if (tb) tb.style.display = 'none';
  if (_activeMdTextarea && _activeMdTextarea._mdRepos) {
    _activeMdTextarea.removeEventListener('input', _activeMdTextarea._mdRepos);
  }
}

/** Called from HTML onclick on toolbar buttons */
function mdWrap(marker) {
  if (!_activeMdTextarea) return;
  wrapSelectionMd(_activeMdTextarea, marker, marker);
}
