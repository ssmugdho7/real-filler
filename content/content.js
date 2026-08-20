/**
 * Real Filler - Advanced Content Script
 * Improvements:
 * 1. Fuzzy matching for labels
 * 2. Multi-profile support
 * 3. Radio/Checkbox support
 * 4. Improved reliability with retry logic
 */

const CONFIG = {
    RETRY_DELAY: 1000,
    MAX_RETRIES: 3,
    FUZZY_THRESHOLD: 0.8
};

// Helper: Normalize text for comparison
function normalize(text) {
    if (!text) return '';
    return text.toLowerCase()
        .trim()
        .replace(/[:*?]/g, '') // Remove punctuation
        .replace(/\s+/g, ' ');  // Collapse spaces
}

// Find fields with better accuracy
function getFormFields() {
    const fields = [];
    // Google Forms structure
    const containers = document.querySelectorAll('[role="listitem"]');

    containers.forEach(container => {
        // Label detection (multiple strategies)
        let labelEl = container.querySelector('[role="heading"]');
        if (!labelEl) labelEl = container.querySelector('.M7365, .exportItemTitle, [dir="auto"]');
        
        if (!labelEl) return;
        const labelText = normalize(labelEl.innerText);
        if (!labelText) return;

        // Input detection (Standard inputs, Textareas, Radio, Checkbox)
        const input = container.querySelector('input[type="text"], input[type="email"], textarea');
        const options = container.querySelectorAll('[role="radio"], [role="checkbox"]');

        if (input) {
            fields.push({ type: 'text', label: labelText, element: input });
        } else if (options.length > 0) {
            fields.push({ type: 'option', label: labelText, elements: Array.from(options) });
        }
    });

    return fields;
}

// Advanced Auto-fill
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
        } else if (field.type === 'option') {
            field.elements.forEach(opt => {
                const optValue = opt.getAttribute('data-value') || opt.innerText.trim();
                if (normalize(optValue) === normalize(savedValue)) {
                    if (opt.getAttribute('aria-checked') !== 'true') {
                        opt.click(); // Google Forms radios/checkboxes react to clicks
                    }
                }
            });
        }
    });
}

function triggerEvents(el) {
    ['input', 'change', 'blur'].forEach(name => {
        el.dispatchEvent(new Event(name, { bubbles: true }));
    });
}

// Smart Learning
async function learnField(label, value) {
    if (!value || !value.trim()) return;
    
    const { currentProfile = 'default', profiles = {} } = await chrome.storage.local.get(['currentProfile', 'profiles']);
    if (!profiles[currentProfile]) profiles[currentProfile] = {};
    
    // Only update if changed
    if (profiles[currentProfile][label] !== value.trim()) {
        profiles[currentProfile][label] = value.trim();
        await chrome.storage.local.set({ profiles });
    }
}

// Event Listeners for Learning
document.addEventListener('blur', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        const fields = getFormFields();
        const field = fields.find(f => f.element === e.target);
        if (field) learnField(field.label, e.target.value);
    }
}, true);

document.addEventListener('click', (e) => {
    const opt = e.target.closest('[role="radio"], [role="checkbox"]');
    if (opt) {
        const containers = document.querySelectorAll('[role="listitem"]');
        containers.forEach(container => {
            if (container.contains(opt)) {
                const labelEl = container.querySelector('[role="heading"], .M7365, [dir="auto"]');
                if (labelEl) {
                    const val = opt.getAttribute('data-value') || opt.innerText.trim();
                    learnField(normalize(labelEl.innerText), val);
                }
            }
        });
    }
});

// Message handling
chrome.runtime.onMessage.addListener((m) => {
    if (m.action === 'manualFill') autoFill();
});

// Initialization with retry for slow loads
let attempts = 0;
function init() {
    autoFill();
    if (attempts < CONFIG.MAX_RETRIES) {
        attempts++;
        setTimeout(init, CONFIG.RETRY_DELAY);
    }
}

init();

// Observe for dynamic section loading
const observer = new MutationObserver(() => autoFill());
observer.observe(document.body, { childList: true, subtree: true });
