document.addEventListener('DOMContentLoaded', async () => {
  const profileSelect = document.getElementById('current-profile');
  const addProfileBtn = document.getElementById('add-profile');
  const dataList = document.getElementById('data-list');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const manualFillBtn = document.getElementById('manual-fill-btn');
  const mainFooter = document.getElementById('main-footer');
  const clearProfileBtn = document.getElementById('clear-profile');
  const clearAllBtn = document.getElementById('clear-all');

  const templateLines = document.getElementById('template-lines');

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

    if (typeof DEFAULT_REFERENCES_TEXT !== 'undefined') {
      renderTemplateLines(DEFAULT_REFERENCES_TEXT);
    }

    // Footer only on Learned Data tab
    mainFooter.classList.remove('visible');
  }

  function renderTemplateLines(text) {
    templateLines.innerHTML = '';
    if (!text || !text.trim()) return;

    const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
    blocks.forEach(block => {
      const group = document.createElement('div');
      group.className = 'template-ref-group';

      const lines = block.split('\n').filter(l => l.trim());
      lines.forEach(line => {
        const value = line.includes(':') ? line.split(':').slice(1).join(':').trim() : line.trim();
        const label = line.includes(':') ? line.split(':')[0].trim() : '';
        const div = document.createElement('div');
        div.className = 'template-line';
        div.innerHTML = `
          <span class="template-line-text"><strong>${label}:</strong> ${value}</span>
          <button class="template-line-copy">Copy</button>
        `;
        div.querySelector('.template-line-copy').addEventListener('click', (e) => {
          navigator.clipboard.writeText(value).then(() => {
            const btn = e.target;
            btn.textContent = 'Copied!';
            btn.classList.add('copied');
            setTimeout(() => {
              btn.textContent = 'Copy';
              btn.classList.remove('copied');
            }, 1500);
          });
        });
        group.appendChild(div);
      });

      templateLines.appendChild(group);
    });
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

  // ===== CANDIDATE MANAGEMENT =====
  const candidateSelect = document.getElementById('candidate-select');
  const candidateDetails = document.getElementById('candidate-details');
  const editCandidateBtn = document.getElementById('edit-candidate-btn');
  const saveCandidateBtn = document.getElementById('save-candidate-btn');
  const cancelCandidateBtn = document.getElementById('cancel-candidate-btn');

  const CANDIDATE_FIELDS = [
    { key: 'name', label: 'Full Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'address', label: 'Address' },
    { key: 'compensation', label: 'Compensation' },
    { key: 'academicTimeline', label: 'Academic Timeline' },
    { key: 'birthDate', label: 'Birth Date' },
    { key: 'openForRelocation', label: 'Open for Relocation' },
    { key: 'protectedVeteran', label: 'Protected Veteran' },
    { key: 'disability', label: 'Disability Status' },
    { key: 'drivingLicense', label: 'Driving License' },
    { key: 'visaType', label: 'Visa Type' },
    { key: 'relocating', label: 'Relocating for Position' },
    { key: 'peLicense', label: 'IL P.E. License' },
    { key: 'notes', label: 'Notes' }
  ];

  async function getCandidates() {
    const data = await chrome.storage.local.get('candidates');
    return data.candidates || null;
  }

  async function initCandidates() {
    let candidates = await getCandidates();
    if (!candidates) {
      candidates = CANDIDATES_DATA;
      await chrome.storage.local.set({ candidates });
    }

    candidateSelect.innerHTML = '<option value="">-- Choose --</option>';
    candidates.forEach(c => {
      const opt = document.createElement('option');
      opt.value = c.id;
      opt.textContent = c.name;
      candidateSelect.appendChild(opt);
    });
  }

  function renderCandidateDetails(candidate, editable) {
    if (!candidate) {
      candidateDetails.innerHTML = '<div class="empty-msg">Select a candidate to view details.</div>';
      return;
    }
    candidateDetails.innerHTML = '';

    // Standard fields
    CANDIDATE_FIELDS.forEach(field => {
      const div = document.createElement('div');
      div.className = 'candidate-field';
      const val = candidate[field.key] || '';
      if (editable) {
        div.innerHTML = `
          <span class="candidate-field-label">${field.label}</span>
          <div class="candidate-field-value">
            <input type="text" data-key="${field.key}" value="${val.replace(/"/g, '&quot;')}">
          </div>
        `;
      } else {
        div.innerHTML = `
          <span class="candidate-field-label">${field.label}</span>
          <span class="candidate-field-value">${val || '—'}</span>
          ${val ? '<button class="copy-field-btn">Copy</button>' : ''}
        `;
        const copyBtn = div.querySelector('.copy-field-btn');
        if (copyBtn) {
          copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(val).then(() => {
              copyBtn.textContent = 'Copied!';
              copyBtn.classList.add('copied');
              setTimeout(() => {
                copyBtn.textContent = 'Copy';
                copyBtn.classList.remove('copied');
              }, 1500);
            });
          });
        }
      }
      candidateDetails.appendChild(div);
    });

    // Custom fields
    const customFields = candidate.customFields || {};
    const customFieldsDiv = document.createElement('div');
    customFieldsDiv.className = 'custom-fields-section';

    const customLabel = document.createElement('h4');
    customLabel.textContent = 'Additional Info';
    customLabel.style.cssText = 'margin: 12px 0 8px 0; color: var(--primary); font-size: 0.85rem;';
    customFieldsDiv.appendChild(customLabel);

    const customList = document.createElement('div');
    customList.className = 'custom-fields-list';
    customList.id = 'custom-fields-list';

    Object.entries(customFields).forEach(([key, value]) => {
      const item = document.createElement('div');
      item.className = 'custom-field-item';
      item.innerHTML = `
        <div class="custom-field-row">
          <input type="text" class="custom-key" value="${key.replace(/"/g, '&quot;')}" placeholder="Key" ${editable ? '' : 'disabled'}>
          <input type="text" class="custom-value" value="${value.replace(/"/g, '&quot;')}" placeholder="Value" ${editable ? '' : 'disabled'}>
          <button class="copy-custom-btn">Copy</button>
          ${editable ? '<button class="delete-custom-btn">✕</button>' : ''}
        </div>
      `;
      // Copy button
      const copyBtn = item.querySelector('.copy-custom-btn');
      copyBtn.addEventListener('click', () => {
        navigator.clipboard.writeText(value).then(() => {
          copyBtn.textContent = 'Copied!';
          setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
        });
      });
      // Delete button (edit mode only)
      if (editable) {
        const delBtn = item.querySelector('.delete-custom-btn');
        delBtn.addEventListener('click', () => {
          item.remove();
        });
      }
      customList.appendChild(item);
    });

    customFieldsDiv.appendChild(customList);

    // Add button (edit mode only)
    if (editable) {
      const addBtn = document.createElement('button');
      addBtn.className = 'add-custom-btn primary-btn small';
      addBtn.textContent = '+ Add Field';
      addBtn.addEventListener('click', () => {
        const newItem = document.createElement('div');
        newItem.className = 'custom-field-item';
        newItem.innerHTML = `
          <div class="custom-field-row">
            <input type="text" class="custom-key" placeholder="Key">
            <input type="text" class="custom-value" placeholder="Value">
            <button class="copy-custom-btn">Copy</button>
            <button class="delete-custom-btn">✕</button>
          </div>
        `;
        // Copy handler for new item
        newItem.querySelector('.copy-custom-btn').addEventListener('click', (e) => {
          const valInput = e.target.parentElement.querySelector('.custom-value');
          if (valInput) {
            navigator.clipboard.writeText(valInput.value).then(() => {
              e.target.textContent = 'Copied!';
              setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
            });
          }
        });
        // Delete handler for new item
        newItem.querySelector('.delete-custom-btn').addEventListener('click', () => {
          newItem.remove();
        });
        customList.appendChild(newItem);
      });
      customFieldsDiv.appendChild(addBtn);
    }

    candidateDetails.appendChild(customFieldsDiv);
  }

  candidateSelect.addEventListener('change', async () => {
    const id = candidateSelect.value;
    const candidates = await getCandidates();
    const c = candidates.find(x => x.id === id);
    renderCandidateDetails(c, false);
    editCandidateBtn.style.display = '';
    saveCandidateBtn.style.display = 'none';
    cancelCandidateBtn.style.display = 'none';
  });

  editCandidateBtn.addEventListener('click', async () => {
    const id = candidateSelect.value;
    const candidates = await getCandidates();
    const c = candidates.find(x => x.id === id);
    renderCandidateDetails(c, true);
    editCandidateBtn.style.display = 'none';
    saveCandidateBtn.style.display = '';
    cancelCandidateBtn.style.display = '';
  });

  cancelCandidateBtn.addEventListener('click', async () => {
    const id = candidateSelect.value;
    const candidates = await getCandidates();
    const c = candidates.find(x => x.id === id);
    renderCandidateDetails(c, false);
    editCandidateBtn.style.display = '';
    saveCandidateBtn.style.display = 'none';
    cancelCandidateBtn.style.display = 'none';
  });

  saveCandidateBtn.addEventListener('click', async () => {
    const id = candidateSelect.value;
    const candidates = await getCandidates();
    const idx = candidates.findIndex(x => x.id === id);
    if (idx === -1) return;

    candidateDetails.querySelectorAll('input[data-key]').forEach(input => {
      candidates[idx][input.dataset.key] = input.value;
    });

    // Save custom fields
    const customFields = {};
    candidateDetails.querySelectorAll('.custom-field-row').forEach(row => {
      const keyInput = row.querySelector('.custom-key');
      const valueInput = row.querySelector('.custom-value');
      if (keyInput && valueInput && keyInput.value.trim() && valueInput.value.trim()) {
        customFields[keyInput.value.trim()] = valueInput.value.trim();
      }
    });
    candidates[idx].customFields = customFields;

    await chrome.storage.local.set({ candidates });
    renderCandidateDetails(candidates[idx], false);
    editCandidateBtn.style.display = '';
    saveCandidateBtn.style.display = 'none';
    cancelCandidateBtn.style.display = 'none';
  });

  initCandidates();

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`${btn.dataset.tab}-tab`).classList.add('active');
      if (btn.dataset.tab === 'data') {
        mainFooter.classList.add('visible');
      } else {
        mainFooter.classList.remove('visible');
      }
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

  // Auto-fill on load toggle
  const autoFillToggle = document.getElementById('auto-fill-toggle');
  // Load saved state
  const autoFillData = await chrome.storage.local.get('settings');
  autoFillToggle.checked = (autoFillData.settings || {}).autoFillOnLoad === true;
  autoFillToggle.addEventListener('change', async (e) => {
    await saveSettings({ autoFillOnLoad: e.target.checked });
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
