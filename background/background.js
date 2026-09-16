// Keep side panel open — only close on icon click
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});

// Create context menu on installation
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "fillForm",
    title: "Fill this page (Real Filler)",
    contexts: ["all"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "fillForm") {
    chrome.tabs.sendMessage(tab.id, { action: "manualFill" });
  }
});

// LLM relays (optional, user-enabled). Both keep the message channel open with
// `return true` so the async responses reach the content script.
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "getSuggestion") {
    getLlmSuggestion(msg.fragment, msg.settings)
      .then(text => sendResponse({ text }))
      .catch(() => sendResponse({ text: "" }));
    return true; // keep channel open for async response
  }
  if (msg.action === "mapFields") {
    mapFields(msg.labels, msg.text, msg.settings)
      .then(map => sendResponse({ map }))
      .catch(() => sendResponse({ map: null }));
    return true;
  }
});

const SA_SYSTEM_PROMPT =
  "You are an autocomplete engine. Continue the user's sentence in their own writing style. " +
  "Reply with ONLY the continuation text — no quotes, no explanations, no leading spaces.";

const MAP_SYSTEM_PROMPT =
  "You are a form-mapping engine. Given a list of form field labels and a block of free-form " +
  "text, return ONLY a JSON object that maps each label to the best value extracted from the " +
  "text. Use the label strings exactly as provided (do not normalize them). Omit labels with no " +
  "value. Respond with JSON only — no prose, no code fences.";

async function getLlmSuggestion(fragment, llm) {
  if (!llm || !llm.apiKey || !fragment) return "";
  const provider = (llm.provider || "openai").toLowerCase();
  if (provider === "gemini") return callGemini(SA_SYSTEM_PROMPT, fragment, llm, 60);
  return callOpenAi(SA_SYSTEM_PROMPT, fragment, llm, 60);
}

async function mapFields(labels, text, llm) {
  if (!llm || !llm.apiKey || !text || !Array.isArray(labels) || labels.length === 0) return null;
  const labelList = labels.map(l => l.label).join('"\n- "');
  const capped = text.slice(0, 3000);
  const userContent =
    'Field labels:\n- "' + labelList + '"\n\nUser-provided text:\n"""\n' + capped + '\n"""';

  let raw;
  const provider = (llm.provider || "openai").toLowerCase();
  if (provider === "gemini") raw = await callGemini(MAP_SYSTEM_PROMPT, userContent, llm, 1024);
  else raw = await callOpenAi(MAP_SYSTEM_PROMPT, userContent, llm, 1024);
  return parseMapJson(raw);
}

function parseMapJson(raw) {
  if (!raw) return null;
  let text = raw.trim();
  // Strip code fences if the model wrapped the JSON.
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) text = fence[1].trim();
  try {
    const obj = JSON.parse(text);
    if (obj && typeof obj === "object" && !Array.isArray(obj)) {
      const out = {};
      for (const [k, v] of Object.entries(obj)) {
        if (v === null || v === undefined) continue;
        out[k] = typeof v === "string" ? v : String(v);
      }
      return out;
    }
  } catch (e) {
    // Fall through to best-effort brace extraction.
  }
  const brace = text.match(/\{[\s\S]*\}/);
  if (brace) {
    try {
      const obj = JSON.parse(brace[0]);
      if (obj && typeof obj === "object") {
        const out = {};
        for (const [k, v] of Object.entries(obj)) {
          if (v === null || v === undefined) continue;
          out[k] = typeof v === "string" ? v : String(v);
        }
        return out;
      }
    } catch (e) {}
  }
  return null;
}

async function callOpenAi(systemPrompt, userContent, llm, maxTokens) {
  if (!llm.endpoint) return "";
  const body = {
    model: llm.model || "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    max_tokens: maxTokens,
    temperature: 0.2,
    stream: false,
  };
  try {
    const resp = await fetch(llm.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + llm.apiKey,
      },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return data?.choices?.[0]?.message?.content || "";
  } catch (e) {
    return "";
  }
}

async function callGemini(systemPrompt, userContent, llm, maxTokens) {
  const model = llm.model || "gemini-1.5-flash";
  const url =
    "https://generativelanguage.googleapis.com/v1beta/models/" +
    encodeURIComponent(model) +
    ":generateContent?key=" +
    encodeURIComponent(llm.apiKey);
  const body = {
    contents: [{ role: "user", parts: [{ text: userContent }] }],
    systemInstruction: { parts: [{ text: systemPrompt }] },
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.2 },
  };
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) return "";
    const data = await resp.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (e) {
    return "";
  }
}
