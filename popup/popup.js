document.addEventListener('DOMContentLoaded', async () => {
  const profileSelect = document.getElementById('current-profile');
  const addProfileBtn = document.getElementById('add-profile');
  const dataList = document.getElementById('data-list');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const manualFillBtn = document.getElementById('manual-fill-btn');
  const clearProfileBtn = document.getElementById('clear-profile');
  const clearAllBtn = document.getElementById('clear-all');

  // Load and Render Initial State
  async function init() {
    const data = await chrome.storage.local.get(['profiles', 'currentProfile']);
    const profiles = data.profiles || { default: {} };
    const currentProfile = data.currentProfile || 'default';

    // Populate profile selector
    profileSelect.innerHTML = '';
    Object.keys(profiles).forEach(p => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p.charAt(0).toUpperCase() + p.slice(1);
      if (p === currentProfile) opt.selected = true;
      profileSelect.appendChild(opt);
    });

    renderData(profiles[currentProfile] || {});
  }

  function renderData(learnedData) {
    const keys = Object.keys(learnedData);
    dataList.innerHTML = '';

    if (keys.length === 0) {
      dataList.innerHTML = '<div class="empty-msg">This profile is empty.<br>Start filling forms to teach Real Filler!</div>';
      return;
    }

    keys.forEach(label => {
      const item = document.createElement('div');
      item.className = 'data-item';
      item.innerHTML = `
        <div class="item-info">
          <span class="item-label">${label}</span>
          <span class="item-value">${learnedData[label]}</span>
        </div>
        <button class="delete-btn" data-label="${label}">✕</button>
      `;
      dataList.appendChild(item);
    });

    // Delete listeners
    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const label = e.target.getAttribute('data-label');
        const data = await chrome.storage.local.get('profiles');
        const profiles = data.profiles || {};
        const current = profileSelect.value;
        if (profiles[current]) {
          delete profiles[current][label];
          await chrome.storage.local.set({ profiles });
          renderData(profiles[current]);
        }
      });
    });
  }

  // Profile Management
  profileSelect.addEventListener('change', async (e) => {
    const newProfile = e.target.value;
    await chrome.storage.local.set({ currentProfile: newProfile });
    const data = await chrome.storage.local.get('profiles');
    renderData(data.profiles[newProfile] || {});
  });

  addProfileBtn.addEventListener('click', async () => {
    const name = prompt('Enter profile name (e.g., Work, Personal):');
    if (name && name.trim()) {
      const data = await chrome.storage.local.get('profiles');
      const profiles = data.profiles || { default: {} };
      const normalizedName = name.trim().toLowerCase();
      if (!profiles[normalizedName]) {
        profiles[normalizedName] = {};
        await chrome.storage.local.set({ profiles, currentProfile: normalizedName });
        init();
      }
    }
  });

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
    });
  });

  // Actions
  manualFillBtn.addEventListener('click', () => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'manualFill' });
      }
    });
  });

  clearProfileBtn.addEventListener('click', async () => {
    if (confirm('Clear all data in this profile?')) {
      const current = profileSelect.value;
      const data = await chrome.storage.local.get('profiles');
      const profiles = data.profiles || {};
      profiles[current] = {};
      await chrome.storage.local.set({ profiles });
      renderData({});
    }
  });

  clearAllBtn.addEventListener('click', async () => {
    if (confirm('Delete ALL profiles and data? This cannot be undone.')) {
      await chrome.storage.local.set({ profiles: { default: {} }, currentProfile: 'default' });
      init();
    }
  });

  init();
});
