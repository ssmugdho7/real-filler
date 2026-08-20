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

async function autoFill() {
  const { currentProfile = 'default', profiles = {} } = await chrome.storage.local.get(['currentProfile', 'profiles']);
  const learnedData = profiles[currentProfile] || {};
  const fields = getFormFields();

  fields.forEach(field => {
    const savedValue = learnedData[field.label];
    if (!savedValue) return;

    if (field.type === 'text') {
      if (field.element.value !== savedValue) {
        field.element.value = savedValue;
        triggerEvents(field.element);
      }
    } else if (field.type === 'select') {
      const options = Array.from(field.element.options);
      const match = options.find(opt => normalize(opt.text) === normalize(savedValue) || opt.value === savedValue);
      if (match && field.element.value !== match.value) {
        field.element.value = match.value;
        triggerEvents(field.element);
      }
    } else if (field.type === 'option' || field.type === 'radio') {
      field.elements.forEach(opt => {
        const optValue = opt.getAttribute('data-value') || opt.innerText?.trim() || opt.value || '';
        if (normalize(optValue) === normalize(savedValue)) {
          if (opt.getAttribute('aria-checked') !== 'true' && !opt.checked) {
            opt.click();
          }
        }
      });
    } else if (field.type === 'checkbox') {
      const shouldCheck = normalize(savedValue) === 'true' || normalize(savedValue) === 'yes' || normalize(savedValue) === 'checked';
      if (field.element.checked !== shouldCheck) {
        field.element.click();
      }
    }
  });
}

function triggerEvents(el) {
  ['input', 'change', 'blur'].forEach(name => {
    el.dispatchEvent(new Event(name, { bubbles: true }));
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

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.action === 'manualFill') {
    autoFill();
  }
});

// ---------- Initialization ----------

let attempts = 0;

function init() {
  autoFill();
  if (attempts < CONFIG.MAX_RETRIES) {
    attempts++;
    setTimeout(init, CONFIG.RETRY_DELAY);
  }
}

init();

// Observe for dynamic section loading (works for both modes)
const observer = new MutationObserver(() => autoFill());
observer.observe(document.body, { childList: true, subtree: true });

} // end else (chrome.storage available)
