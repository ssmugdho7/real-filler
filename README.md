# 🚀 Real Filler - Intelligent, Local-First Google Forms Auto-Filler

**Real Filler** is a modern, high-performance Chrome extension designed to automate the tedious process of filling out repetitive Google Forms. By leveraging context-aware matching algorithms and browser-native local storage, Real Filler learns from your standard form submissions and instantly pre-fills matching fields in future forms.

---

## 🌟 Why Real Filler Stands Out (The Secret Sauce)

While the internet is flooded with generic form-fillers, they almost always fail when it comes to Google Forms. Here is why **Real Filler** is in a league of its own:

### 1. ⚡ Built Specifically for Google Forms' Custom DOM
Standard form-fillers only look for traditional HTML `<input>` and `<select>` tags. However, modern Google Forms rely heavily on custom ARIA structures (such as `role="radio"` and `role="checkbox"` nested inside nested `div` containers). Real Filler has a **specialized DOM-traversal engine** that precisely maps Google's custom structures, simulates standard click dispatches, and updates underlying React/JS form state seamlessly.

### 2. 🎭 Multi-Profile Persona Isolation
Need to fill out a form for work? Then another for your personal life? Real Filler allows you to create **multiple isolated profiles** (e.g., *Work*, *Personal*, *School*, *Gaming*). You can switch between profiles instantly from the popup, ensuring your professional data never leaks into your personal forms.

### 3. 🌀 Dynamic Multi-Page & Lazy-Load Resilience
Many Google Forms split questionnaires across multiple pages or lazy-load sections as you answer questions. Real Filler features a robust **`MutationObserver` lifecycle manager** and configurable **retry logic** that automatically runs and fills new fields as they appear on your screen, completely eliminating the need to manually trigger the filler on every page.

### 4. 🔒 100% Privacy-First & Zero Telemetry
Your data is yours alone. Unlike cloud-based autofillers that store, process, or sell your form entries on remote servers, Real Filler operates **entirely offline**. All learned data is stored directly on your computer's browser cache using `chrome.storage.local`. No trackers, no servers, no cloud leak risks.

---

## 🛠️ Core Features

*   **Continuous Auto-Learning:** The extension actively monitors fields. When an input loses focus (`blur` event) or you click custom radios/checkboxes, the text/value is associated with the field's question label and saved instantly.
*   **Intuitive Multi-Profile Panel:** Create, rename, and select profiles on the fly.
*   **Granular Data Management:** View all learned data categorized by label in the popup. Clean up mistakes by deleting individual keys, purging a single profile, or wiping the entire database.
*   **Manual Trigger Override:** If a form has non-standard lag, easily force an immediate, deep auto-fill of the current tab with a single click.
*   **Native Event Dispatching:** Dispatches `input`, `change`, and `blur` events so Google Forms registers the inputs as valid and doesn't trigger "This is a required question" errors on submit.

---

## 📖 How to Install (Developer Unpacked Mode)

Until the extension is installed via the Chrome Web Store, you can run and test it locally using Chrome’s Developer Mode:

1.  **Download/Clone** this repository to your local machine.
2.  Open Google Chrome and navigate to: `chrome://extensions/`
3.  In the top-right corner, toggle **Developer mode** to **ON**.
4.  Click the **Load unpacked** button in the top-left corner.
5.  Select the `real-filler` root directory (the folder containing `manifest.json`).
6.  *Success!* Real Filler will now appear in your extension toolbar. Pin it for easy access!

---

## 🚀 Step-by-Step Usage Guide

### Step 1: Initialize Your Profiles
Click the **Real Filler** extension icon in your toolbar to open the popup. By default, you're on the `Default` profile. Click **Add Profile** to create custom personas (e.g., "Work" or "Personal").

### Step 2: Teach the Extension
Open any Google Form (e.g., a registration form or survey). Start filling it out normally:
*   Type into text fields, emails, or paragraph boxes.
*   Select your radio buttons or checkboxes.
As you type and move to the next field (or click options), Real Filler silently memorizes the connection between the *Question Label* and your *Answer*.

### Step 3: Enjoy Seamless Auto-Fill
The next time you open that Google Form, or *any other Google Form* with similar questions (e.g., asking for "Full Name", "Email", "Phone Number", "Organization"), Real Filler will instantly pre-populate your answers before you even click.

### Step 4: Manage Your Data
Open the popup to view your learned parameters.
*   If you made a typo (e.g., typed your email wrong), click the red **✕** next to that label to delete it.
*   To start fresh on a profile, click **Clear Profile**.

---

## 📁 Technical Architecture

The extension is designed with lightweight, vanilla web technologies to guarantee speed and compatibility:

```text
real-filler/
├── manifest.json         # Extension configuration, permissions, and service worker routing
├── background/
│   └── background.js     # Handles extension action clicks and background communications
├── content/
│   └── content.js        # Core DOM-matching engine, mutation observers, and auto-filler scripts
├── popup/
│   ├── popup.html        # Elegant user interface for managing profiles and data
│   ├── popup.css         # Minimalist, polished layout and typography styles
│   └── popup.js          # Handles profile CRUD operations and data list binding
└── icons/
    ├── icon16.png        # Toolbar icon (16x16)
    ├── icon48.png        # Extension management page icon (48x48)
    └── icon128.png       # Chrome Web Store promo icon (128x128)
```

---

## 🔒 Security & Data Compliance

Real Filler is built with high compliance standards:
*   **Least Privilege Principle:** Uses only standard storage permissions and is locked strictly to `https://docs.google.com/forms/*` host permissions. It cannot read data on other websites.
*   **No Obfuscation:** The code is completely transparent, lightweight, and open-source, allowing easy auditing for enterprise deployments.
