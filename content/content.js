/**
 * Real Filler - Universal Content Script
 * Dual-mode engine:
 * 1. Google Forms mode — auto-fills on page load using Google's custom ARIA DOM
 * 2. Universal mode — fills any webpage's input fields via manual trigger
 *
 * Features:
 * - Fuzzy matching for labels
 * - Multi-profile support
 * - Radio/Checkbox support (Google Forms)
 * - Standard HTML input/textarea/select support (Universal)
 * - Retry logic for slow loads
 * - Smart learning from user input
 */

const CONFIG = {
  RETRY_DELAY: 1000,
  MAX_RETRIES: 3,
  FUZZY_THRESHOLD: 0.8,
};

// Bail out on restricted pages where chrome.storage is unavailable
if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) {
  // Do nothing — extension context not available on this page
} else {

// ---------- Helpers ----------

function normalize(text) {
  if (!text) return '';
  return text.toLowerCase()
    .trim()
    .replace(/[:*?]/g, '')
    .replace(/\s+/g, ' ');
}

function isSearchInput(input) {
  if (!input) return false;
  if (input.type === 'search') return true;
  const role = input.getAttribute('role');
  if (role === 'searchbox' || role === 'search') return true;
  const needle = (input.getAttribute('placeholder') || input.getAttribute('name') || input.id || '').toLowerCase();
  if (/\bsearch\b/.test(needle)) return true;
  const form = input.closest('form');
  if (form && /search/i.test((form.className || '') + ' ' + (form.id || ''))) return true;
  return false;
}

function isGoogleForms() {
  return window.location.hostname === 'docs.google.com'
    && window.location.pathname.startsWith('/forms/');
}

/**
 * Generate a stable, human-readable label for an input element on a generic page.
 * Priority: aria-label → label[for] → placeholder → name → id → parent text
 */
function findInputLabel(input) {
  // 1. aria-label
  const ariaLabel = input.getAttribute('aria-label');
  if (ariaLabel) return normalize(ariaLabel);

  // 2. Explicit <label for="id">
  if (input.id) {
    const labelEl = document.querySelector(`label[for="${CSS.escape(input.id)}"]`);
    if (labelEl) return normalize(labelEl.textContent);
  }

  // 3. Parent <label>
  const parentLabel = input.closest('label');
  if (parentLabel) {
    // Get text nodes only (exclude child input text)
    const clone = parentLabel.cloneNode(true);
    clone.querySelectorAll('input, textarea, select, button').forEach(el => el.remove());
    const text = normalize(clone.textContent);
    if (text) return text;
  }

  // 4. placeholder
  const placeholder = input.getAttribute('placeholder');
  if (placeholder) return normalize(placeholder);

  // 5. name attribute (humanize: "first_name" → "first name")
  const name = input.getAttribute('name');
  if (name) return normalize(name.replace(/[_-]+/g, ' '));

  // 6. aria-labelledby
  const labelledBy = input.getAttribute('aria-labelledby');
  if (labelledBy) {
    const ref = document.getElementById(labelledBy);
    if (ref) return normalize(ref.textContent);
  }

  // 7. title attribute
  const title = input.getAttribute('title');
  if (title) return normalize(title);

  // 8. Closest preceding text node / heading
  const container = input.closest('div, fieldset, section, td, li');
  if (container) {
    const headings = container.querySelectorAll('h1, h2, h3, h4, h5, h6, legend, .label, .field-label, [class*="label"]');
    for (const h of headings) {
      const t = normalize(h.textContent);
      if (t) return t;
    }
  }

  return '';
}

// ---------- Google Forms Field Detection ----------

function getGoogleFormFields() {
  const fields = [];
  const containers = document.querySelectorAll('[role="listitem"]');

  containers.forEach(container => {
    let labelEl = container.querySelector('[role="heading"]');
    if (!labelEl) labelEl = container.querySelector('.M7365, .exportItemTitle, [dir="auto"]');
    if (!labelEl) return;

    const labelText = normalize(labelEl.innerText);
    if (!labelText) return;

    const input = container.querySelector('input[type="text"], input[type="email"], input[type="password"], textarea');
    const options = container.querySelectorAll('[role="radio"], [role="checkbox"]');

    if (input) {
      fields.push({ type: 'text', label: labelText, element: input, source: 'google' });
    } else if (options.length > 0) {
      fields.push({ type: 'option', label: labelText, elements: Array.from(options), source: 'google' });
    }
  });

  return fields;
}

// ---------- Generic Web Page Field Detection ----------

function getGenericFormFields() {
  const fields = [];
  const seen = new Set();

  // Standard inputs and textareas
  const inputs = document.querySelectorAll(
    'input[type="text"], input[type="email"], input[type="password"], input[type="url"], input[type="tel"], input[type="number"], input:not([type]), textarea'
  );

  inputs.forEach(input => {
    if (seen.has(input)) return;
    // Skip hidden inputs
    if (input.type === 'hidden' || input.offsetParent === null) return;
    // Skip search inputs — don't learn/fill search terms
    if (isSearchInput(input)) return;

    const label = findInputLabel(input);
    if (!label) return;

    seen.add(input);
    fields.push({ type: 'text', label, element: input, source: 'generic' });
  });

  // Select elements
  const selects = document.querySelectorAll('select');
  selects.forEach(select => {
    if (seen.has(select)) return;
    if (select.offsetParent === null) return;

    const label = findInputLabel(select);
    if (!label) return;

    seen.add(select);
    fields.push({ type: 'select', label, element: select, source: 'generic' });
  });

  // Radio button groups (by name attribute)
  const radioGroups = {};
  document.querySelectorAll('input[type="radio"]').forEach(radio => {
    if (radio.offsetParent === null) return;
    const name = radio.getAttribute('name') || '_ungrouped_' + Math.random();
    if (!radioGroups[name]) radioGroups[name] = [];
    radioGroups[name].push(radio);
  });

  Object.values(radioGroups).forEach(group => {
    if (group.length === 0) return;
    // Try to find a shared label
    const firstRadio = group[0];
    const label = findInputLabel(firstRadio);
    if (!label) return;

    group.forEach(r => seen.add(r));
    fields.push({
      type: 'radio',
      label,
      elements: group,
      source: 'generic',
    });
  });

  // Checkboxes (standalone, not part of radio groups)
  document.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (seen.has(cb)) return;
    if (cb.offsetParent === null) return;

    const label = findInputLabel(cb);
    if (!label) return;

    seen.add(cb);
    fields.push({
      type: 'checkbox',
      label,
      elements: [cb],
      source: 'generic',
    });
  });

  return fields;
}

// ---------- Unified Field Detection ----------

function getFormFields() {
  return isGoogleForms() ? getGoogleFormFields() : getGenericFormFields();
}

// ---------- Auto-Fill ----------

// Tracks fields already filled this session so we never overwrite a user's edit.
const filledElements = new Set();

// Apply a single value to a field. Shared by learned-fill and template-fill so the
// text / select / radio / checkbox branching lives in exactly one place.
function setFieldValue(field, value, force) {
  if (value === undefined || value === null || value === '') return;

  if (field.type === 'text') {
    // Only fill once; never clobber a value the user has typed.
    if (filledElements.has(field.element)) return;
    if (!force && field.element.value.trim() !== '') return;
    if (field.element.value !== value) {
      field.element.value = value;
      triggerEvents(field.element);
    }
    filledElements.add(field.element);
  } else if (field.type === 'select') {
    if (filledElements.has(field.element)) return;
    const options = Array.from(field.element.options);
    const match = options.find(opt => normalize(opt.text) === normalize(value) || opt.value === value);
    if (match && field.element.value !== match.value) {
      field.element.value = match.value;
      triggerEvents(field.element);
    }
    filledElements.add(field.element);
  } else if (field.type === 'option' || field.type === 'radio') {
    if (field.elements.some(opt => filledElements.has(opt))) return;
    field.elements.forEach(opt => {
      const optValue = opt.getAttribute('data-value') || opt.innerText?.trim() || opt.value || '';
      if (normalize(optValue) === normalize(value)) {
        if (opt.getAttribute('aria-checked') !== 'true' && !opt.checked) {
          opt.click();
        }
      }
    });
    field.elements.forEach(opt => filledElements.add(opt));
  } else if (field.type === 'checkbox') {
    if (filledElements.has(field.element)) return;
    const shouldCheck = normalize(value) === 'true' || normalize(value) === 'yes' || normalize(value) === 'checked';
    if (field.element.checked !== shouldCheck) {
      field.element.click();
    }
    filledElements.add(field.element);
  }
}

async function autoFill(force = false) {
  if (force) filledElements.clear();

  const { currentProfile = 'default', profiles = {} } = await chrome.storage.local.get(['currentProfile', 'profiles']);
  const learnedData = profiles[currentProfile] || {};
  const fields = getFormFields();

  fields.forEach(field => setFieldValue(field, learnedData[field.label], force));
}

function triggerEvents(el) {
  ['input', 'change', 'blur'].forEach(name => {
    el.dispatchEvent(new Event(name, { bubbles: true }));
  });
}

// ---------- Template (Paste-to-Fill) Engine ----------
// Hybrid: a local regex/key-value extractor runs offline by default; when the user
// has enabled the LLM in settings, an optional mapping pass improves coverage for
// non-standard labels. Template facts take precedence over learned values, and
// learned label→value still fills any field the template didn't cover.

const TMPL_TEXT_CAP = 3000;

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  let curr = new Array(n + 1);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
}

function similarity(a, b) {
  a = a || ''; b = b || '';
  if (!a && !b) return 1;
  const longer = a.length >= b.length ? a : b;
  const shorter = a.length >= b.length ? b : a;
  if (longer.length === 0) return 1;
  return (longer.length - levenshtein(a, b)) / longer.length;
}

// Pull structured facts out of free-form pasted text.
function extractFacts(text) {
  const facts = {
    email: null, phone: null, url: null, name: null,
    firstName: null, lastName: null, address: null, city: null,
    zip: null, company: null, keyValues: {},
  };
  if (!text) return facts;

  const emailMatch = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (emailMatch) facts.email = emailMatch[0];

  const urlMatch = text.match(/\bhttps?:\/\/[^\s]+|www\.[^\s]+/i);
  if (urlMatch) facts.url = urlMatch[0];

  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?\(?\d{2,4}\)?[\s.-]?\d{2,4}[\s.-]?\d{2,4}(?:[\s.-]?\d{1,4})?/);
  if (phoneMatch) facts.phone = phoneMatch[0].trim();

  const lines = text.split(/\r?\n/);
  for (const line of lines) {
    const kv = line.match(/^\s*([A-Za-z][\w\s'&.\-/]{0,40}?)\s*[:=\-]\s*(.+?)\s*$/);
    if (kv) {
      const key = normalize(kv[1]);
      const val = kv[2].trim();
      if (key && val) facts.keyValues[key] = val;
    }
  }

  // Derive name / address / etc. from keyValues when present.
  facts.name = facts.keyValues['name'] || facts.keyValues['full name'] || null;
  facts.address = facts.keyValues['address'] || facts.keyValues['street'] || facts.keyValues['street address'] || null;
  facts.city = facts.keyValues['city'] || facts.keyValues['town'] || null;
  facts.zip = facts.keyValues['zip'] || facts.keyValues['zip code'] || facts.keyValues['postal'] || facts.keyValues['postal code'] || null;
  facts.company = facts.keyValues['company'] || facts.keyValues['organization'] || facts.keyValues['employer'] || null;

  if (facts.name) {
    const parts = facts.name.trim().split(/\s+/);
    facts.firstName = parts[0] || null;
    facts.lastName = parts.slice(1).join(' ') || null;
  }

  // Name heuristic: first non-empty line that isn't a key/value pair, email, or url.
  if (!facts.name) {
    for (const line of lines) {
      const t = line.trim();
      if (!t) continue;
      if (/[:=\-]\s*\S/.test(t)) continue;
      if (facts.email && t.includes(facts.email)) continue;
      if (facts.url && t.includes(facts.url)) continue;
      const words = t.split(/\s+/);
      if (words.length >= 2 && !/^\d+$/.test(t)) {
        facts.name = t;
        facts.firstName = words[0];
        facts.lastName = words.slice(1).join(' ');
        break;
      }
    }
  }

  // Address heuristic: a line that starts with a number followed by words.
  if (!facts.address) {
    for (const line of lines) {
      const t = line.trim();
      if (/^\d{1,6}\s+[A-Za-z]/.test(t) && t.length > 5) {
        facts.address = t;
        break;
      }
    }
  }

  return facts;
}

// Resolve a fact for a given field using local matching; falls back to the LLM map.
function matchFieldToFact(label, type, facts, llmMap) {
  const norm = normalize(label);
  if (!norm) return null;

  // (a) exact/normalized keyValues match
  if (facts.keyValues[norm]) return facts.keyValues[norm];

  // (b) type-based matching
  if (norm.includes('email')) return facts.email || null;
  if (norm.includes('phone') || norm.includes('tel') || norm.includes('mobile') || norm.includes('cell')) return facts.phone || null;
  if (norm.includes('website') || norm.includes('web') || norm.includes('url') || norm.includes('link') || norm.includes('homepage')) return facts.url || null;
  if (norm.includes('first') && norm.includes('name')) return facts.firstName || facts.name || null;
  if (norm.includes('last') && norm.includes('name')) return facts.lastName || null;
  if (norm === 'name' || norm.includes('full name') || (norm.endsWith('name') && !norm.includes('user'))) return facts.name || null;
  if (norm.includes('address') || norm.includes('street')) return facts.address || null;
  if (norm.includes('city') || norm.includes('town')) return facts.city || null;
  if (norm.includes('zip') || norm.includes('postal')) return facts.zip || null;
  if (norm.includes('company') || norm.includes('organization') || norm.includes('employer')) return facts.company || null;

  // (c) fuzzy similarity to known keys
  let bestKey = null, bestScore = 0;
  for (const k of Object.keys(facts.keyValues)) {
    const score = similarity(norm, k);
    if (score > bestScore) { bestScore = score; bestKey = k; }
  }
  if (bestKey && bestScore >= CONFIG.FUZZY_THRESHOLD) return facts.keyValues[bestKey];

  // (d) LLM-provided mapping (only when local has no match)
  if (llmMap && llmMap[norm]) return llmMap[norm];

  return null;
}

async function requestLlmMapFields(labels, text, llm) {
  const provider = (llm.provider || 'openai').toLowerCase();
  if (!llm.apiKey) return null;
  if (provider === 'openai' && !llm.endpoint) return null;
  try {
    const resp = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'mapFields', labels, text: text.slice(0, TMPL_TEXT_CAP), settings: llm },
        (res) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res);
        }
      );
    });
    return (resp && resp.map) ? resp.map : null;
  } catch (e) {
    return null;
  }
}

async function autoFillFromTemplate(force = false) {
  if (force) filledElements.clear();

  const { currentProfile = 'default', profiles = {}, templates = {} } =
    await chrome.storage.local.get(['currentProfile', 'profiles', 'templates']);
  const learnedData = profiles[currentProfile] || {};
  const fields = getFormFields();

  const templateText = (templates[currentProfile] || '').trim();
  // No template for this profile → behave exactly like the learned-only autoFill.
  if (!templateText) {
    fields.forEach(field => setFieldValue(field, learnedData[field.label], force));
    return;
  }

  const facts = extractFacts(templateText);
  let llmMap = null;
  const settings = (await chrome.storage.local.get('settings')).settings || {};
  if (settings.llm && settings.llm.enabled) {
    try {
      const labels = fields.map(f => ({ label: f.label, type: f.type }));
      llmMap = await requestLlmMapFields(labels, templateText, settings.llm);
    } catch (e) {
      llmMap = null;
    }
  }

  fields.forEach(field => {
    // Template facts take precedence over learned values where both exist.
    let value = matchFieldToFact(field.label, field.type, facts, llmMap);
    if (value === null || value === undefined || value === '') {
      value = learnedData[field.label];
    }
    setFieldValue(field, value, force);
  });
}

// ---------- Smart Learning ----------

async function learnField(label, value) {
  if (!value || (typeof value === 'string' && !value.trim())) return;

  const { currentProfile = 'default', profiles = {} } = await chrome.storage.local.get(['currentProfile', 'profiles']);
  if (!profiles[currentProfile]) profiles[currentProfile] = {};

  const normalizedValue = typeof value === 'string' ? value.trim() : value;
  if (profiles[currentProfile][label] !== normalizedValue) {
    profiles[currentProfile][label] = normalizedValue;
    await chrome.storage.local.set({ profiles });
  }
}

// ---------- Event Listeners for Learning ----------

// Text inputs / textareas — learn on blur
document.addEventListener('blur', (e) => {
  const tag = e.target.tagName;
  const type = e.target.type;
  if (tag === 'INPUT' && !['text', 'email', 'password', 'url', 'tel', 'number'].includes(type) && type !== undefined) return;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return;

  const fields = getFormFields();
  const field = fields.find(f => f.element === e.target);
  if (field) {
    learnField(field.label, e.target.value);
  }
}, true);

// Google Forms radios/checkboxes — learn on click
document.addEventListener('click', (e) => {
  if (isGoogleForms()) {
    const opt = e.target.closest('[role="radio"], [role="checkbox"]');
    if (opt) {
      const containers = document.querySelectorAll('[role="listitem"]');
      containers.forEach(container => {
        if (container.contains(opt)) {
          const labelEl = container.querySelector('[role="heading"], .M7365, [dir="auto"]');
          if (labelEl) {
            const val = opt.getAttribute('data-value') || opt.innerText?.trim() || '';
            learnField(normalize(labelEl.innerText), val);
          }
        }
      });
    }
  } else {
    // Generic radios/checkboxes
    const input = e.target.closest('input[type="radio"], input[type="checkbox"]');
    if (input) {
      const fields = getFormFields();
      const field = fields.find(f => f.elements && f.elements.includes(input));
      if (field) {
        if (input.type === 'radio') {
          learnField(field.label, input.value || input.nextSibling?.textContent?.trim() || '');
        } else {
          learnField(field.label, input.checked ? 'true' : 'false');
        }
      }
    }
  }
}, true);

// Generic selects — learn on change
document.addEventListener('change', (e) => {
  if (e.target.tagName === 'SELECT') {
    const fields = getFormFields();
    const field = fields.find(f => f.element === e.target);
    if (field) {
      const selectedText = e.target.options[e.target.selectedIndex]?.text || e.target.value;
      learnField(field.label, selectedText);
    }
  }
}, true);

// ---------- Message Handling ----------

const RF_CROSS_FRAME_MSG = 'realFiller::manualFill';

function forwardToChildFrames() {
  try {
    document.querySelectorAll('iframe').forEach(f => {
      try { f.contentWindow.postMessage({ __rf: RF_CROSS_FRAME_MSG }, '*'); } catch (e) {}
    });
  } catch (e) {}
}

window.addEventListener('message', (e) => {
  if (e.data && e.data.__rf === RF_CROSS_FRAME_MSG) {
    autoFillFromTemplate(true);
  }
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'manualFill') {
    // Uses the active template when present; otherwise falls back to learned-only fill.
    // Forward to direct child frames so embedded iframe forms also get filled.
    autoFillFromTemplate(true);
    forwardToChildFrames();
  }
});

// ---------- Initialization ----------

let autoFillOnLoadEnabled = false;
let settingLoaded = false;

async function loadAutoFillSetting() {
  try {
    const data = await chrome.storage.local.get('settings');
    autoFillOnLoadEnabled = (data.settings || {}).autoFillOnLoad === true;
  } catch {
    autoFillOnLoadEnabled = false;
  }
  settingLoaded = true;
}

// Only auto-fill on load if the user has explicitly enabled it
loadAutoFillSetting().then(() => {
  if (autoFillOnLoadEnabled) {
    autoFill();
  }
});

// MutationObserver: only fills when user has enabled auto-fill on load
const observer = new MutationObserver(() => {
  if (autoFillOnLoadEnabled) autoFill();
});
observer.observe(document.body, { childList: true, subtree: true });

// Listen for setting changes in real time
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.settings) {
    autoFillOnLoadEnabled = (changes.settings.newValue || {}).autoFillOnLoad === true;
  }
});

// ---------- Sentence Autocomplete ----------
// Off by default; enabled via the "Sentence autocomplete" toggle in the popup.
// Suggestions come from a per-profile corpus of the user's past text submissions
// (local n-gram model). An optional LLM toggle can be enabled in settings.

const SA_CONFIG = {
  LOCAL_DEBOUNCE: 150,
  LLM_DEBOUNCE: 450,
  CORPUS_CAP: 2000,
  GHOST_CLASS: 'rf-ghost-overlay',
  MAX_SUGGEST_WORDS: 8,
  EXCLUDED_TYPES: ['password', 'email', 'url', 'tel', 'number', 'search', 'date', 'time', 'color', 'range', 'file', 'hidden'],
};

let saSettings = { sentenceAutocomplete: false, llm: {} };
let saProfile = 'default';
let saCorpus = [];
let saIndex = null;
let saActiveField = null;
let saGhost = null;
let saGhostContinuation = '';
let saDebounceTimer = null;
let saRequestId = 0;

function isAutocompleteEligible(input) {
  if (!input) return false;
  const tag = input.tagName;
  if (tag !== 'INPUT' && tag !== 'TEXTAREA') return false;
  if (isSearchInput(input)) return false;
  if (tag === 'INPUT') {
    const t = (input.getAttribute('type') || 'text').toLowerCase();
    if (SA_CONFIG.EXCLUDED_TYPES.includes(t)) return false;
  }
  if (input.offsetParent === null) return false;
  return true;
}

function caretAtEnd(field) {
  try {
    return field.selectionStart === field.value.length && field.selectionEnd === field.value.length;
  } catch (e) {
    return false;
  }
}

function tokenize(text) {
  return (text || '').toLowerCase().match(/[a-z0-9']+/g) || [];
}

function buildIndex() {
  const unigram = new Map();
  const bigram = new Map();
  const startWords = new Map();

  for (const snippet of saCorpus) {
    const sentences = snippet.split(/[.!?\n]+/).map(s => s.trim()).filter(Boolean);
    for (const s of sentences) {
      const words = tokenize(s);
      if (words.length === 0) continue;
      startWords.set(words[0], (startWords.get(words[0]) || 0) + 1);
      for (let i = 0; i < words.length; i++) {
        unigram.set(words[i], (unigram.get(words[i]) || 0) + 1);
        if (i < words.length - 1) {
          if (!bigram.has(words[i])) bigram.set(words[i], new Map());
          const m = bigram.get(words[i]);
          m.set(words[i + 1], (m.get(words[i + 1]) || 0) + 1);
        }
      }
    }
  }
  saIndex = { unigram, bigram, startWords };
}

function bestByCount(pool) {
  let best = null, bestCount = -1;
  for (const [w, c] of pool) {
    if (c > bestCount) { bestCount = c; best = w; }
  }
  return best;
}

function bestByPrefix(pool, prefix) {
  let best = null, bestCount = -1;
  for (const [w, c] of pool) {
    if (w === prefix) continue;
    if (w.startsWith(prefix) && c > bestCount) { bestCount = c; best = w; }
  }
  return best;
}

function currentSentenceFragment(text) {
  const idx = Math.max(
    text.lastIndexOf('.'),
    text.lastIndexOf('!'),
    text.lastIndexOf('?'),
    text.lastIndexOf('\n')
  );
  return idx >= 0 ? text.slice(idx + 1) : text;
}

function generateLocalContinuation(fragment) {
  if (!saIndex) return '';
  const trimmed = fragment.replace(/\s+$/, '');
  if (!trimmed.trim()) return '';
  const endsWithSpace = fragment.length > 0 && /\s$/.test(fragment);
  const tokens = tokenize(trimmed);
  const prefix = (endsWithSpace || tokens.length === 0) ? '' : tokens[tokens.length - 1];

  let nextWord = null;
  if (prefix) {
    const pool = tokens.length > 1 ? (saIndex.bigram.get(tokens[tokens.length - 2]) || saIndex.unigram) : saIndex.unigram;
    nextWord = bestByPrefix(pool, prefix);
  } else {
    const lastFull = tokens.length ? tokens[tokens.length - 1] : null;
    const pool = lastFull ? (saIndex.bigram.get(lastFull) || saIndex.unigram) : saIndex.startWords;
    nextWord = bestByCount(pool);
  }
  if (!nextWord) return '';

  const words = [nextWord];
  let cur = nextWord;
  for (let i = 1; i < SA_CONFIG.MAX_SUGGEST_WORDS; i++) {
    const m = saIndex.bigram.get(cur);
    if (!m || m.size === 0) break;
    const nw = bestByCount(m);
    if (!nw || nw === cur) break;
    words.push(nw);
    cur = nw;
  }

  let cont;
  if (prefix) {
    const rest = words.slice(1).join(' ');
    cont = nextWord.slice(prefix.length) + (rest ? ' ' + rest : '');
  } else {
    cont = words.join(' ');
  }
  return cont ? cont + ' ' : '';
}

async function requestLlmSuggestion(fragment) {
  const llm = saSettings.llm || {};
  const provider = (llm.provider || 'openai').toLowerCase();
  if (!llm.apiKey) return '';
  if (provider === 'openai' && !llm.endpoint) return '';
  const reqId = ++saRequestId;
  try {
    const resp = await new Promise((resolve, reject) => {
      chrome.runtime.sendMessage(
        { action: 'getSuggestion', fragment, settings: llm },
        (res) => {
          if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
          else resolve(res);
        }
      );
    });
    if (reqId !== saRequestId) return '';
    return (resp && resp.text) ? resp.text.trim() : '';
  } catch (e) {
    return '';
  }
}

function clearGhost() {
  if (saGhost && saGhost.parentNode) saGhost.parentNode.removeChild(saGhost);
  saGhost = null;
  saGhostContinuation = '';
}

function showGhost(field, continuation) {
  saGhostContinuation = continuation || '';
  if (!saGhostContinuation) { clearGhost(); return; }

  if (!saGhost) {
    saGhost = document.createElement('div');
    saGhost.className = SA_CONFIG.GHOST_CLASS;
    saGhost.style.position = 'fixed';
    saGhost.style.pointerEvents = 'none';
    saGhost.style.whiteSpace = 'pre-wrap';
    saGhost.style.wordWrap = 'break-word';
    saGhost.style.overflow = 'hidden';
    saGhost.style.margin = '0';
    saGhost.style.background = 'transparent';
    saGhost.style.zIndex = '2147483647';
    document.body.appendChild(saGhost);
  }

  const cs = getComputedStyle(field);
  const rect = field.getBoundingClientRect();

  saGhost.style.left = rect.left + 'px';
  saGhost.style.top = rect.top + 'px';
  saGhost.style.width = rect.width + 'px';
  saGhost.style.height = rect.height + 'px';
  saGhost.style.fontFamily = cs.fontFamily;
  saGhost.style.fontSize = cs.fontSize;
  saGhost.style.fontWeight = cs.fontWeight;
  saGhost.style.lineHeight = cs.lineHeight;
  saGhost.style.letterSpacing = cs.letterSpacing;
  saGhost.style.textTransform = cs.textTransform;
  saGhost.style.textAlign = cs.textAlign;
  saGhost.style.padding = cs.padding;
  saGhost.style.boxSizing = cs.boxSizing;
  saGhost.style.border = cs.border;
  saGhost.style.borderColor = 'transparent';

  const realSpan = document.createElement('span');
  realSpan.style.color = 'transparent';
  realSpan.textContent = field.value;

  const ghostSpan = document.createElement('span');
  ghostSpan.style.color = '#9aa0a6';
  ghostSpan.textContent = saGhostContinuation;

  saGhost.innerHTML = '';
  saGhost.appendChild(realSpan);
  saGhost.appendChild(ghostSpan);

  saGhost.scrollTop = field.scrollTop || 0;
  saGhost.scrollLeft = field.scrollLeft || 0;
}

function positionGhost() {
  if (saActiveField && saGhost) showGhost(saActiveField, saGhostContinuation);
}

function onSaInput(e) {
  const field = e.target;
  if (!isAutocompleteEligible(field)) {
    if (saActiveField === field) { clearGhost(); saActiveField = null; }
    return;
  }
  if (document.activeElement !== field) return;
  saActiveField = field;
  if (!caretAtEnd(field)) { clearGhost(); return; }
  if (!saSettings.sentenceAutocomplete) { clearGhost(); return; }

  const delay = (saSettings.llm && saSettings.llm.enabled) ? SA_CONFIG.LLM_DEBOUNCE : SA_CONFIG.LOCAL_DEBOUNCE;
  clearTimeout(saDebounceTimer);
  saDebounceTimer = setTimeout(() => generateSuggestion(field), delay);
}

async function generateSuggestion(field) {
  if (!saSettings.sentenceAutocomplete || document.activeElement !== field || !caretAtEnd(field)) {
    clearGhost();
    return;
  }
  const fragment = currentSentenceFragment(field.value);
  if (!fragment.trim()) { clearGhost(); return; }

  let continuation = '';
  const useLlm = saSettings.llm && saSettings.llm.enabled;
  if (useLlm) {
    continuation = await requestLlmSuggestion(fragment);
    if (!continuation) continuation = generateLocalContinuation(fragment);
  } else {
    continuation = generateLocalContinuation(fragment);
  }

  if (document.activeElement === field && caretAtEnd(field)) {
    showGhost(field, continuation || '');
  }
}

function onSaKeydown(e) {
  if (!saSettings.sentenceAutocomplete) return;
  if (!saActiveField || !saGhost || !saGhostContinuation) return;
  if (e.key === 'Tab') {
    e.preventDefault();
    acceptGhost();
  } else if (e.key === 'Escape') {
    e.preventDefault();
    clearGhost();
  } else if (e.key === 'ArrowRight' && caretAtEnd(saActiveField)) {
    e.preventDefault();
    acceptGhost();
  }
}

function acceptGhost() {
  const field = saActiveField;
  if (!field || !saGhostContinuation) return;
  field.value = field.value + saGhostContinuation;
  try { field.setSelectionRange(field.value.length, field.value.length); } catch (e) {}
  clearGhost();
  triggerEvents(field);
}

function onSaFocusIn(e) {
  if (isAutocompleteEligible(e.target)) saActiveField = e.target;
}

function onSaFocusOut(e) {
  if (saActiveField === e.target) { clearGhost(); saActiveField = null; }
}

async function appendToCorpus(text) {
  const data = await chrome.storage.local.get(['currentProfile', 'corpus']);
  const profile = data.currentProfile || 'default';
  const corpusMap = data.corpus || {};
  const list = corpusMap[profile] || [];
  if (list[list.length - 1] === text) return;
  list.push(text);
  if (list.length > SA_CONFIG.CORPUS_CAP) list.splice(0, list.length - SA_CONFIG.CORPUS_CAP);
  corpusMap[profile] = list;
  await chrome.storage.local.set({ corpus: corpusMap });
  if (profile === saProfile) { saCorpus = list; buildIndex(); }
}

async function seedCorpusIfEmpty() {
  const data = await chrome.storage.local.get(['corpus', 'profiles', 'currentProfile']);
  const profile = data.currentProfile || 'default';
  const corpusMap = data.corpus || {};
  if (corpusMap[profile] && corpusMap[profile].length) return;
  const learned = data.profiles?.[profile] || {};
  const snippets = Object.values(learned)
    .filter(v => typeof v === 'string' && v.trim().length >= 3 && /\s/.test(v))
    .map(v => v.trim());
  if (!snippets.length) return;
  corpusMap[profile] = snippets.slice(-SA_CONFIG.CORPUS_CAP);
  await chrome.storage.local.set({ corpus: corpusMap });
  if (profile === saProfile) { saCorpus = corpusMap[profile]; buildIndex(); }
}

async function loadSaSettings() {
  const data = await chrome.storage.local.get(['settings', 'currentProfile', 'corpus']);
  const settings = data.settings || {};
  saSettings = { sentenceAutocomplete: !!settings.sentenceAutocomplete, llm: settings.llm || {} };
  saProfile = data.currentProfile || 'default';
  const corpusMap = data.corpus || {};
  saCorpus = corpusMap[saProfile] || [];
  buildIndex();
  if (saSettings.sentenceAutocomplete) seedCorpusIfEmpty();
}

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local') return;
  if (changes.settings) {
    const s = changes.settings.newValue || {};
    const wasEnabled = saSettings.sentenceAutocomplete;
    saSettings = { sentenceAutocomplete: !!s.sentenceAutocomplete, llm: s.llm || {} };
    if (!saSettings.sentenceAutocomplete) clearGhost();
    else if (!wasEnabled) seedCorpusIfEmpty();
  }
  if (changes.currentProfile) {
    saProfile = changes.currentProfile.newValue || 'default';
    const data = changes.corpus ? (changes.corpus.newValue || {}) : null;
    saCorpus = (data && data[saProfile]) || [];
    buildIndex();
  }
  if (changes.corpus && !changes.currentProfile) {
    const map = changes.corpus.newValue || {};
    saCorpus = map[saProfile] || [];
    buildIndex();
  }
});

document.addEventListener('input', onSaInput, true);
document.addEventListener('keydown', onSaKeydown, true);
document.addEventListener('focusin', onSaFocusIn, true);
document.addEventListener('focusout', onSaFocusOut, true);
document.addEventListener('blur', (e) => {
  if (!saSettings.sentenceAutocomplete) return;
  const field = e.target;
  if (!isAutocompleteEligible(field)) return;
  const text = field.value.trim();
  if (text.length >= 3) appendToCorpus(text);
}, true);
window.addEventListener('scroll', positionGhost, true);
window.addEventListener('resize', positionGhost);

loadSaSettings();

} // end else (chrome.storage available)
