document.addEventListener('DOMContentLoaded', async () => {
  const profileSelect = document.getElementById('current-profile');
  const addProfileBtn = document.getElementById('add-profile');
  const dataList = document.getElementById('data-list');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const manualFillBtn = document.getElementById('manual-fill-btn');
  const clearProfileBtn = document.getElementById('clear-profile');
  const clearAllBtn = document.getElementById('clear-all');

  const templateInput = document.getElementById('template-input');
  const templateSaveBtn = document.getElementById('template-save');
  const templateClearBtn = document.getElementById('template-clear');
  const templateStatus = document.getElementById('template-status');

  const sentenceToggle = document.getElementById('sentence-autocomplete-toggle');
  const llmSettings = document.getElementById('llm-settings');
  const llmEnabledToggle = document.getElementById('llm-enabled-toggle');
  const llmProvider = document.getElementById('llm-provider');
  const llmEndpointItem = document.getElementById('llm-endpoint-item');
  const llmEndpoint = document.getElementById('llm-endpoint');
  const llmModel = document.getElementById('llm-model');
  const llmApiKey = document.getElementById('llm-api-key');

  // Load and Render Initial State
  async function init() {
    const data = await chrome.storage.local.get(['profiles', 'currentProfile', 'settings']);
    const profiles = data.profiles || { default: {} };
    const currentProfile = data.currentProfile || 'default';
    const settings = data.settings || {};

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
    renderSettings(settings);

    const tData = await chrome.storage.local.get(['templates']);
    const templates = tData.templates || {};
    templateInput.value = templates[currentProfile] || '';
    templateStatus.textContent = '';
  }

  function renderSettings(settings) {
    const sentenceOn = !!settings.sentenceAutocomplete;
    sentenceToggle.checked = sentenceOn;
    llmSettings.hidden = !sentenceOn;

    const llm = settings.llm || {};
    llmEnabledToggle.checked = !!llm.enabled;
    llmProvider.value = llm.provider || 'openai';
    llmEndpoint.value = llm.endpoint || '';
    llmModel.value = llm.model || '';
    llmApiKey.value = llm.apiKey || '';
    syncLlmProviderUi();
  }

  function syncLlmProviderUi() {
    const isGemini = llmProvider.value === 'gemini';
    llmEndpointItem.hidden = isGemini;
    if (isGemini && !llmModel.value.trim()) llmModel.value = 'gemini-1.5-flash';
  }

  async function saveSettings(patch) {
    const data = await chrome.storage.local.get('settings');
    const settings = data.settings || {};
    const next = { ...settings, ...patch };
    await chrome.storage.local.set({ settings: next });
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
    const tData = await chrome.storage.local.get('templates');
    templateInput.value = (tData.templates || {})[newProfile] || '';
    templateStatus.textContent = '';
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

  async function getTemplates() {
    const data = await chrome.storage.local.get('templates');
    return data.templates || {};
  }

  templateSaveBtn.addEventListener('click', async () => {
    const current = profileSelect.value;
    const templates = await getTemplates();
    templates[current] = templateInput.value;
    await chrome.storage.local.set({ templates });
    templateStatus.textContent = 'Template saved for "' + current + '".';
  });

  templateClearBtn.addEventListener('click', async () => {
    const current = profileSelect.value;
    const templates = await getTemplates();
    delete templates[current];
    await chrome.storage.local.set({ templates });
    templateInput.value = '';
    templateStatus.textContent = 'Template cleared.';
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

  // Sentence autocomplete settings
  sentenceToggle.addEventListener('change', async (e) => {
    const on = e.target.checked;
    await saveSettings({ sentenceAutocomplete: on });
    llmSettings.hidden = !on;
  });

  llmEnabledToggle.addEventListener('change', async (e) => {
    await saveSettings({ llm: { ...(await getLlm()), enabled: e.target.checked } });
  });

  llmProvider.addEventListener('change', async (e) => {
    await saveSettings({ llm: { ...(await getLlm()), provider: e.target.value } });
    syncLlmProviderUi();
  });

  llmEndpoint.addEventListener('change', async (e) => {
    await saveSettings({ llm: { ...(await getLlm()), endpoint: e.target.value.trim() } });
  });

  llmModel.addEventListener('change', async (e) => {
    await saveSettings({ llm: { ...(await getLlm()), model: e.target.value.trim() } });
  });

  llmApiKey.addEventListener('change', async (e) => {
    await saveSettings({ llm: { ...(await getLlm()), apiKey: e.target.value.trim() } });
  });

  async function getLlm() {
    const data = await chrome.storage.local.get('settings');
    return data.settings?.llm || {};
  }

  init();
});
