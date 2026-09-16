# Real Filler - Universal Form & Input Auto-Filler

**Real Filler** is a Chrome extension that automates filling forms and input fields on any website. It works on **Google Forms** and **any website** with standard HTML inputs. By leveraging context-aware matching and browser-native local storage, Real Filler learns from your submissions and pre-fills matching fields in future visits.

> **Version 1.5** — Side panel UI, Candidates management, References (read-only), Copy-to-clipboard, and auto-fill disabled by default.

---

## Features

### Side Panel UI
- Opens as a **side panel** (stays open when clicking outside)
- Click the extension icon again to close
- Templates tab opens first

### Candidates Management
- 14 pre-loaded candidates with full details (name, phone, email, address, compensation, visa, etc.)
- Dropdown selector to switch between candidates
- **Edit mode** — modify any candidate field and save
- **Copy button** on each field — copies just the value to clipboard

### References (Read-Only)
- 4 professional references pre-loaded
- Displayed as distinct cards with blue left border for visual separation
- Each line has a **Copy** button (copies value after `:`)
- Non-editable — no textarea, no save/clear buttons, `user-select: none`

### Auto-Learning
- Monitors fields across all websites
- When an input loses focus, the value is saved with the field's label
- Works on Google Forms and any standard HTML form

### Multi-Profile Support
- Create multiple isolated profiles (e.g., Work, Personal)
- Switch between profiles from the popup
- Each profile has its own learned data

### Sentence Autocomplete (Opt-in)
- Autocompletions as you type using your past submissions
- OFF by default — enable in Settings
- Local n-gram model (offline) or optional LLM mode

### Manual Fill
- **Fill Current Page** button on Learned Data tab
- Right-click context menu on any page
- Template facts + learned data combined

---

## How to Install

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Toggle **Developer mode** to ON
4. Click **Load unpacked**
5. Select the `real-filler` root directory
6. Pin the extension for easy access

---

## Usage

### Candidates Tab
1. Click the extension icon → opens side panel
2. Go to **Candidates** tab
3. Select a candidate from the dropdown
4. View their details — click **Copy** on any field to copy the value
5. Click **Edit** to modify fields → **Save** to store changes

### References Tab
1. Go to **References** tab
2. See all 4 reference contacts grouped in cards
3. Click **Copy** on any line to copy the value (after `:`)
4. References are read-only — cannot be edited

### Learned Data Tab
1. Visit any website with forms
2. Fill in fields normally — Real Filler learns on blur
3. Next time you visit, fields are pre-filled (if auto-fill is enabled)
4. Click **Fill Current Page** to manually trigger fill
5. Delete individual entries with the ✕ button

### Settings Tab
- **Auto-fill on load** — OFF by default, enable to auto-fill on page load
- **Sentence autocomplete** — OFF by default, enable for typing suggestions
- **LLM settings** — Optional OpenAI/Gemini integration for better suggestions

---

## Architecture

```text
real-filler/
├── manifest.json              # Extension config (v1.5, side panel)
├── background/
│   └── background.js          # Side panel toggle, context menu, LLM relays
├── content/
│   └── content.js             # Dual-mode DOM engine + auto-fill logic
├── popup/
│   ├── popup.html             # Side panel UI
│   ├── popup.css              # Layout styles
│   ├── popup.js               # Profile, candidate, reference logic
│   └── candidates.js          # Candidate data + default references
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## Permissions

- `storage` — Local data persistence
- `activeTab` — Access current tab for filling
- `scripting` — Inject content scripts
- `contextMenus` — Right-click fill option
- `sidePanel` — Side panel UI

---

## Privacy

- **100% local** — All data stored in `chrome.storage.local`
- **No telemetry** — Nothing leaves your browser
- **No servers** — Fully offline operation
- **Open source** — Transparent, auditable code
