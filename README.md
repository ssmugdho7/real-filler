# Real Filler - Universal Form & Input Auto-Filler

**Real Filler** is a modern, high-performance Chrome extension that automates the tedious process of filling out repetitive forms and input fields. It works on **Google Forms** and **any website** with standard HTML inputs. By leveraging context-aware matching algorithms and browser-native local storage, Real Filler learns from your submissions and instantly pre-fills matching fields in future visits.

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
