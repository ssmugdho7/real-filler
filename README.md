# Real Filler - Universal Form & Input Auto-Filler

**Real Filler** is a modern, high-performance Chrome extension that automates the tedious process of filling out repetitive forms and input fields. It works on **Google Forms** and **any website** with standard HTML inputs. By leveraging context-aware matching algorithms and browser-native local storage, Real Filler learns from your submissions and instantly pre-fills matching fields in future visits.

> **Version 1.2** — This release adds **Templates (Paste-to-Fill)** and **iframe support**, closing the gap with commercial fillers that market "paste free-form text → auto-map fields." See [What's New in v1.2](#whats-new-in-v12) and the [version comparison](#previous-version-vs-current-version) below.

---

## What's New in v1.2

- **Templates (Paste-to-Fill):** Paste a resume, bio, or notes into the new **Templates** tab and Real Filler maps it onto a form's fields with one click. A local extractor pulls out emails, phones, URLs, names, addresses, and `Key: Value` pairs offline; an optional LLM pass (reusing the existing Gemini/OpenAI settings) covers non-standard labels.
- **Per-profile Templates:** Each profile stores its own raw pasted snippet. Facts are extracted at fill time, so improving the extractor needs no re-saving.
- **iframe Support:** The content script now runs in every frame (`all_frames: true`), and **Fill Current Page** forwards the fill into embedded iframes so nested forms get filled too.
- **Template + Learned Fusion:** On fill, template facts take precedence, and any field the template doesn't cover still falls back to your learned `label → value` data — nothing is lost.

## Previous Version vs Current Version

| Capability | v1.1 (previous) | v1.2 (current) |
| --- | --- | --- |
| Google Forms auto-fill | ✅ | ✅ |
| Universal website auto-fill | ✅ | ✅ |
| Multi-profile personas | ✅ | ✅ |
| Continuous auto-learning (`label → value`) | ✅ | ✅ |
| 8+ label-detection strategies | ✅ | ✅ |
| `MutationObserver` retry for lazy loads | ✅ | ✅ |
| Native event dispatching (`input`/`change`/`blur`) | ✅ | ✅ |
| Sentence autocomplete (local n-gram + opt-in LLM) | ✅ | ✅ |
| **Paste free-form text → auto-map fields (Templates)** | ❌ | ✅ *(new)* |
| **iframe / embedded-form filling** | ❌ (top frame only) | ✅ *(new)* |
| **Per-profile paste templates** | ❌ | ✅ *(new)* |
| **Offline-first + optional LLM mapping for paste text** | ❌ | ✅ *(new)* |

In short: v1.1 was a strong *learned* filler — it remembered exactly what you typed into each labeled field and replayed it. v1.2 keeps all of that and **adds the ability to fill arbitrary forms from unstructured text you paste once**, plus it now reaches forms inside iframes.

---

## Why Real Filler Stands Out

### 1. Dual-Mode Engine — Google Forms + Universal Web

Most form-fillers only work with standard HTML `<input>` tags and fail on Google Forms' custom ARIA structures. Real Filler has **two specialized engines**:

- **Google Forms Mode:** Auto-detects `docs.google.com/forms/*` and uses a specialized DOM-traversal engine that maps Google's custom `role="radio"`, `role="checkbox"`, and nested `div` structures. Auto-fills on page load.
- **Universal Mode:** Works on **any website**. Detects `<input>`, `<textarea>`, `<select>`, radio buttons, and checkboxes. Intelligently associates each field with its label using `aria-label`, `<label for>`, `placeholder`, `name` attributes, and parent text. Triggered via the popup button or context menu.

### 2. Multi-Profile Persona Isolation

Need to fill out a form for work? Then another for your personal life? Real Filler allows you to create **multiple isolated profiles** (e.g., *Work*, *Personal*, *School*, *Gaming*). Switch between profiles instantly from the popup, ensuring your professional data never leaks into your personal forms.

### 3. Dynamic Multi-Page & Lazy-Load Resilience

Many Google Forms split questionnaires across multiple pages or lazy-load sections. Real Filler features a robust **`MutationObserver` lifecycle manager** and configurable **retry logic** that automatically fills new fields as they appear, completely eliminating the need to manually trigger the filler on every page.

### 4. 100% Privacy-First & Zero Telemetry

Your data is yours alone. Real Filler operates **entirely offline**. All learned data is stored directly on your computer's browser cache using `chrome.storage.local`. No trackers, no servers, no cloud leak risks.

---

## Core Features

*   **Continuous Auto-Learning:** Monitors fields across all websites. When an input loses focus (`blur` event) or you select an option, the value is associated with the field's label and saved instantly.
*   **Google Forms Auto-Fill:** Automatically pre-fills Google Forms on page load, including text fields, email, radio buttons, and checkboxes.
*   **Universal Auto-Fill:** Works on **any website**. Detects `<input>`, `<textarea>`, `<select>`, radio buttons, and checkboxes. Intelligently associates each field with its label using `aria-label`, `<label for>`, `placeholder`, `name` attributes, and parent text. Auto-fills on page load everywhere.
*   **Intelligent Label Detection:** Uses 8+ strategies to identify field labels: `aria-label`, `<label for>`, `placeholder`, `name` attribute, parent elements, headings, and more.
*   **Multi-Profile Panel:** Create, rename, and select profiles on the fly.
*   **Granular Data Management:** View all learned data categorized by label. Delete individual entries, clear a profile, or wipe everything.
*   **Native Event Dispatching:** Dispatches `input`, `change`, and `blur` events so websites register the inputs as valid user entries.

---

## Sentence Autocomplete (Opt-in)

Real Filler can **autocomplete sentences** as you type in text inputs and textareas, using a model built entirely from **your own past submissions and word choices**. This feature is **OFF by default** — you must enable it manually.

### How to enable
1. Open the popup and go to the **Settings** tab.
2. Check **Sentence autocomplete**. (A warning note appears.)
3. Start typing in any text field. A muted inline *ghost* continuation appears after your caret.
4. Press **Tab** (or **→** at the end of the field) to accept it, or **Esc** to dismiss.

### How suggestions are generated
* **Default (local, offline):** Your submissions are accumulated into a per-profile **corpus**. A lightweight in-memory n-gram model predicts the most likely next word(s) from your own writing style. Nothing leaves your browser.
* **Optional LLM mode:** In Settings, expand the LLM options and check **Use LLM for suggestions**. Choose a **Provider**:
  * *OpenAI-compatible* — set the **Endpoint URL**, **Model** (e.g. `gpt-4o-mini`), and **API Key**.
  * *Google Gemini* — set **Model** (e.g. `gemini-1.5-flash`) and your **API Key**; the endpoint is built automatically.
  * Suggestions are then fetched from your configured endpoint. ⚠️ This sends the text you type (and your learned samples) to a third party and breaks the offline/privacy-first model for those suggestions.

### Privacy notes
* The corpus is stored locally in `chrome.storage.local` per profile, separate from the auto-fill `label → value` map.
* Search, password, email, URL, tel, number, and similar non-prose fields are excluded.
* The feature only activates on the field you are actively focused in, and never while auto-filling.

---

## Templates: Paste-to-Fill (Opt-in, Hybrid)

Real Filler can fill **arbitrary forms from a block of free-form text** — a resume, bio, or notes — without you mapping each field by hand. Paste your info once, then hit **Fill Current Page** and the extension maps it onto the page's fields.

### How it works
* **Default (local, offline):** A built-in extractor pulls structured facts from your text — email, phone, URL, name, address, and any `Key: Value` / `Key - Value` / `Key = Value` pairs. Each form field is matched by label (exact, type-based like "email"/"phone"/"name", or fuzzy). Nothing leaves your browser.
* **Optional LLM mapping:** When the LLM is enabled in Settings, an extra pass asks your configured provider to map fields the local extractor can't guess. ⚠️ This sends your pasted text **and** the form's field labels to a third party, breaking the offline/privacy-first model.

### How to use
1. Open the popup and go to the **Templates** tab.
2. Paste your free-form info (or use `Key: Value` lines for best results).
3. Click **Save Template** (saved per active profile).
4. Open a form and click **Fill Current Page** (or use the right-click menu). Template facts fill the matching fields; any field the template doesn't cover still falls back to your learned `label → value` data.

### Notes
* Templates fill on manual trigger only (button/context menu). Automatic page-load fill still uses learned data only.
* Iframes are supported — the content script runs in every frame.

---

## How to Install (Developer Unpacked Mode)

1.  **Download/Clone** this repository to your local machine.
2.  Open Google Chrome and navigate to: `chrome://extensions/`
3.  In the top-right corner, toggle **Developer mode** to **ON**.
4.  Click the **Load unpacked** button in the top-left corner.
5.  Select the `real-filler` root directory (the folder containing `manifest.json`).
6.  *Success!* Real Filler will now appear in your extension toolbar. Pin it for easy access!

---

## Step-by-Step Usage Guide

### Step 1: Initialize Your Profiles
Click the **Real Filler** extension icon in your toolbar to open the popup. By default, you're on the `Default` profile. Click **Add Profile** to create custom personas (e.g., "Work" or "Personal").

### Step 2: Teach the Extension

**On Google Forms:**
Open any Google Form and start filling it out normally. As you type and move to the next field (or click options), Real Filler silently memorizes the connection between the *Question Label* and your *Answer*. It will auto-fill these fields the next time you open the form.

**On Any Website:**
Visit any website with forms (registration pages, checkout forms, login pages, etc.). Fill in your details normally. When you leave a field (tab/click away), Real Filler learns the label-to-value mapping. The next time you visit, the form will be pre-filled automatically.

### Step 3: Enjoy Seamless Auto-Fill

Fields are pre-filled automatically on page load for both Google Forms and any other website. You can also manually trigger a fill anytime via the popup button or right-click context menu.

### Step 4: Manage Your Data
Open the popup to view your learned parameters.
*   If you made a typo, click the red **✕** next to that label to delete it.
*   To start fresh on a profile, click **Clear Profile**.

---

## Technical Architecture

```text
real-filler/
├── manifest.json         # Extension config, permissions, content script routing
├── background/
│   └── background.js     # Context menu handler (works on all pages)
├── content/
│   └── content.js        # Dual-mode DOM engine: Google Forms + Universal detection
├── popup/
│   ├── popup.html        # User interface for managing profiles and data
│   ├── popup.css         # Polished layout and typography styles
│   └── popup.js          # Profile CRUD, data list binding, manual fill trigger
└── icons/
    ├── icon16.png        # Toolbar icon (16x16)
    ├── icon48.png        # Extension management page icon (48x48)
    └── icon128.png       # Chrome Web Store promo icon (128x128)
```

---

## Security & Data Compliance

*   **Local-Only Storage:** All data is stored in `chrome.storage.local`. Nothing leaves your browser.
*   **Transparent Code:** The extension is completely open-source with no obfuscation, allowing easy auditing.
*   **Minimal Permissions:** Requests only the permissions necessary for functionality (`storage`, `activeTab`, `scripting`, `contextMenus`). Host access is required to detect and fill input fields on web pages.
