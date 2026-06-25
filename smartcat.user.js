// ==UserScript==
// @name         智能猫 SmartCat
// @namespace    https://scriptcat.org/
// @version      0.1.0
// @description  单文件 ScriptCat AI Agent 面板，支持页面内唤起、发送上下文、复制结果和本地配置
// @author       wuxia
// @match        *://*/*
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_setClipboard
// @grant        CAT.agent.conversation
// @icon.        https://scriptcat.org/_next/image?url=%2Fassets%2Flogo.png&w=64&q=75
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";

  const APP = {
    id: "smartcat",
    name: "智能猫",
    englishName: "SmartCat",
    version: "0.1.0",
  };

  const DEFAULT_CONFIG = {
    shortcut: getDefaultShortcut(),
  };

  const STORAGE_KEYS = {
    draft: "smartcat.draft.v1",
    recent: "smartcat.recent.v1",
  };

  const MAX_RECENT_MESSAGES = 8;
  const MAX_ATTACHMENT_CHARS = 12000;
  const MAX_PAGE_TEXT_CHARS = 20000;
  const MAX_NODE_TEXT_CHARS = 12000;
  const AT_SUGGESTIONS = [
    { token: "@file", label: "@file", description: "引用一个本地文本文件" },
    { token: "@selection", label: "@selection", description: "选择页面节点作为上下文" },
    { token: "@page", label: "@page", description: "引用当前页面正文文本" },
    { token: "@img", label: "@img", description: "选择页面图片作为上下文" },
  ];

  const TEXT = {
    placeholder: "像命令行一样提问，输入 @ 引用文件/页面，Ctrl/⌘+Enter 发送",
    agentUnavailable: "当前 ScriptCat 环境不可用 CAT.agent.conversation，无法调用内置 Agent。",
    emptyInput: "请输入内容后再发送。",
    loading: "正在请求 Agent...",
    copied: "已复制当前回复。",
    clearedData: "已清除草稿和最近消息。",
    noRecent: "暂无最近消息。",
  };

  const state = {
    config: { ...DEFAULT_CONFIG },
    panel: null,
    elements: {},
    lastMessage: "",
    lastResponseText: "",
    sending: false,
    abortController: null,
    conversation: null,
    attachment: null,
    selectedNode: null,
    selectedImage: null,
    nodePicker: null,
    drag: null,
  };

  // ---------------------------------------------------------------------------
  // Storage
  // ---------------------------------------------------------------------------

  async function getStoredValue(key, fallbackValue) {
    try {
      if (typeof GM_getValue === "function") {
        const value = await GM_getValue(key, fallbackValue);
        return value === undefined ? fallbackValue : value;
      }
    } catch (error) {
      console.warn("[SmartCat] GM_getValue failed, using localStorage", error);
    }

    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallbackValue : JSON.parse(raw);
    } catch (error) {
      console.warn("[SmartCat] localStorage read failed", error);
      return fallbackValue;
    }
  }

  async function setStoredValue(key, value) {
    try {
      if (typeof GM_setValue === "function") {
        await GM_setValue(key, value);
        return;
      }
    } catch (error) {
      console.warn("[SmartCat] GM_setValue failed, using localStorage", error);
    }

    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("[SmartCat] localStorage write failed", error);
    }
  }

  function getDefaultShortcut() {
    return isMacPlatform() ? "Command+K" : "Alt+K";
  }

  function isMacPlatform() {
    const platform = navigator.userAgentData && navigator.userAgentData.platform
      ? navigator.userAgentData.platform
      : navigator.platform || "";
    return /mac/i.test(platform);
  }

  async function loadDraft() {
    return String(await getStoredValue(STORAGE_KEYS.draft, ""));
  }

  async function saveDraft(value) {
    await setStoredValue(STORAGE_KEYS.draft, String(value || ""));
  }

  async function clearDraft() {
    await saveDraft("");
  }

  async function loadRecentMessages() {
    const recent = await getStoredValue(STORAGE_KEYS.recent, []);
    return Array.isArray(recent) ? recent : [];
  }

  async function addRecentMessage(message, responseText) {
    const recent = await loadRecentMessages();
    recent.unshift({
      message,
      responseText,
      url: location.href,
      title: document.title,
      createdAt: new Date().toISOString(),
    });
    await setStoredValue(STORAGE_KEYS.recent, recent.slice(0, MAX_RECENT_MESSAGES));
  }

  async function clearLocalData() {
    await setStoredValue(STORAGE_KEYS.draft, "");
    await setStoredValue(STORAGE_KEYS.recent, []);
  }

  // ---------------------------------------------------------------------------
  // UI
  // ---------------------------------------------------------------------------

  function ensurePanel() {
    if (state.panel && document.body.contains(state.panel)) {
      return state.panel;
    }

    injectStyles();

    const root = document.createElement("section");
    root.id = "smartcat-panel";
    root.setAttribute("aria-label", `${APP.name} AI Agent`);
    root.innerHTML = `
      <div class="smartcat-card" role="dialog" aria-modal="false">
        <header class="smartcat-header">
          <div>
            <div class="smartcat-title">${APP.name}</div>
            <div class="smartcat-subtitle">${APP.englishName} · AI Agent</div>
          </div>
          <button type="button" class="smartcat-icon-button" data-action="close" title="关闭">×</button>
        </header>
        <main class="smartcat-body">
          <textarea class="smartcat-input" rows="4"></textarea>
          <div class="smartcat-at-hints" hidden></div>
          <div class="smartcat-toolbar">
            <button type="button" data-action="send">发送</button>
            <button type="button" data-action="retry" disabled>重试</button>
            <button type="button" data-action="copy">复制</button>
            <button type="button" data-action="clear">清空</button>
            <button type="button" data-action="file">文件</button>
            <button type="button" data-action="recent">最近</button>
            <button type="button" data-action="clear-data">清本地</button>
          </div>
          <div class="smartcat-config-summary"></div>
          <input class="smartcat-file-input" type="file" aria-hidden="true" tabindex="-1" />
          <pre class="smartcat-response" aria-live="polite"></pre>
        </main>
      </div>
    `;

    state.elements = {
      root,
      input: root.querySelector(".smartcat-input"),
      response: root.querySelector(".smartcat-response"),
      configSummary: root.querySelector(".smartcat-config-summary"),
      header: root.querySelector(".smartcat-header"),
      atHints: root.querySelector(".smartcat-at-hints"),
      fileInput: root.querySelector(".smartcat-file-input"),
      sendButton: root.querySelector('[data-action="send"]'),
      retryButton: root.querySelector('[data-action="retry"]'),
    };

    state.elements.input.placeholder = TEXT.placeholder;
    state.elements.input.addEventListener("input", () => {
      saveDraft(state.elements.input.value);
      updateAtHints();
    });
    state.elements.input.addEventListener("keydown", (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        event.preventDefault();
        sendCurrentInput();
      } else if (event.key === "Tab" && !state.elements.atHints.hidden) {
        event.preventDefault();
        const suggestions = getCurrentAtSuggestions();
        if (suggestions.length) {
          applyAtSuggestion(suggestions[0].token);
        }
      }
    });
    state.elements.fileInput.addEventListener("change", handleFilePicked);
    state.elements.header.addEventListener("pointerdown", startPanelDrag);

    root.addEventListener("click", handlePanelClick);
    root.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        hidePanel();
      }
    });

    document.body.appendChild(root);
    state.panel = root;
    updateConfigSummary();
    return root;
  }

  function injectStyles() {
    if (document.getElementById("smartcat-style")) return;

    const style = document.createElement("style");
    style.id = "smartcat-style";
    style.textContent = `
      #smartcat-panel {
        position: fixed !important;
        left: 50% !important;
        top: 50% !important;
        transform: translate(-50%, -50%) !important;
        z-index: 2147483647 !important;
        width: min(680px, calc(100vw - 32px)) !important;
        color: #111827 !important;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        display: none !important;
        user-select: none !important;
      }

      #smartcat-panel.smartcat-open {
        display: block !important;
      }

      #smartcat-panel * {
        box-sizing: border-box !important;
        letter-spacing: 0 !important;
      }

      #smartcat-panel .smartcat-card {
        background: #ffffff !important;
        border: 1px solid #d7dde8 !important;
        border-radius: 8px !important;
        box-shadow: 0 18px 60px rgba(15, 23, 42, 0.22) !important;
        overflow: hidden !important;
      }

      #smartcat-panel .smartcat-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        padding: 12px 14px !important;
        border-bottom: 1px solid #e5e7eb !important;
        background: #f8fafc !important;
        cursor: grab !important;
        touch-action: none !important;
      }

      #smartcat-panel.smartcat-dragging .smartcat-header {
        cursor: grabbing !important;
      }

      #smartcat-panel .smartcat-title {
        font-size: 15px !important;
        line-height: 20px !important;
        font-weight: 700 !important;
      }

      #smartcat-panel .smartcat-subtitle,
      #smartcat-panel .smartcat-config-summary {
        color: #64748b !important;
        font-size: 12px !important;
        line-height: 18px !important;
      }

      #smartcat-panel .smartcat-icon-button {
        width: 30px !important;
        height: 30px !important;
        border: 1px solid #d1d5db !important;
        border-radius: 6px !important;
        background: #ffffff !important;
        color: #475569 !important;
        cursor: pointer !important;
        font-size: 18px !important;
        line-height: 1 !important;
      }

      #smartcat-panel .smartcat-body {
        padding: 12px !important;
      }

      #smartcat-panel .smartcat-input {
        width: 100% !important;
        min-height: 96px !important;
        resize: vertical !important;
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        padding: 10px !important;
        color: #0f172a !important;
        background: #ffffff !important;
        font-size: 14px !important;
        line-height: 1.5 !important;
        outline: none !important;
        user-select: text !important;
      }

      #smartcat-panel .smartcat-input:focus {
        border-color: #2563eb !important;
        box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.14) !important;
      }

      #smartcat-panel .smartcat-toolbar {
        display: flex !important;
        gap: 6px !important;
        flex-wrap: wrap !important;
        margin: 10px 0 8px !important;
      }

      #smartcat-panel .smartcat-at-hints {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        padding: 8px 0 0 !important;
      }

      #smartcat-panel .smartcat-at-hints[hidden] {
        display: none !important;
      }

      #smartcat-panel .smartcat-at-hint {
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        background: #f8fafc !important;
        color: #334155 !important;
        cursor: pointer !important;
        font-size: 12px !important;
        line-height: 16px !important;
        padding: 5px 7px !important;
      }

      #smartcat-panel .smartcat-at-hint strong {
        color: #0f172a !important;
        font-weight: 700 !important;
      }

      #smartcat-panel .smartcat-file-input {
        display: none !important;
        visibility: hidden !important;
        position: absolute !important;
        width: 0 !important;
        height: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }

      #smartcat-panel button {
        border: 1px solid #cbd5e1 !important;
        border-radius: 6px !important;
        background: #f8fafc !important;
        color: #1f2937 !important;
        cursor: pointer !important;
        font-size: 13px !important;
        line-height: 18px !important;
        padding: 6px 10px !important;
      }

      #smartcat-panel button:hover:not(:disabled) {
        background: #eef2ff !important;
        border-color: #93c5fd !important;
      }

      #smartcat-panel button:disabled {
        cursor: not-allowed !important;
        opacity: 0.55 !important;
      }

      #smartcat-panel .smartcat-response {
        width: 100% !important;
        min-height: 120px !important;
        max-height: 360px !important;
        overflow: auto !important;
        margin: 8px 0 0 !important;
        border: 1px solid #e2e8f0 !important;
        border-radius: 6px !important;
        padding: 10px !important;
        background: #0f172a !important;
        color: #e5e7eb !important;
        white-space: pre-wrap !important;
        word-break: break-word !important;
        font: 13px/1.55 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace !important;
        user-select: text !important;
      }

      .smartcat-node-picker-highlight {
        position: fixed !important;
        z-index: 2147483646 !important;
        pointer-events: none !important;
        border: 2px solid #2563eb !important;
        background: rgba(37, 99, 235, 0.14) !important;
        box-shadow: 0 0 0 99999px rgba(15, 23, 42, 0.18) !important;
        border-radius: 4px !important;
      }

      .smartcat-node-picker-label {
        position: fixed !important;
        z-index: 2147483647 !important;
        pointer-events: none !important;
        max-width: min(520px, calc(100vw - 24px)) !important;
        padding: 7px 10px !important;
        border-radius: 6px !important;
        background: #111827 !important;
        color: #f8fafc !important;
        font: 12px/1.45 -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        box-shadow: 0 8px 24px rgba(15, 23, 42, 0.25) !important;
      }

      @media (max-width: 560px) {
        #smartcat-panel {
          width: calc(100vw - 24px) !important;
        }
      }
    `;
    document.documentElement.appendChild(style);
  }

  async function openPanel() {
    const panel = ensurePanel();
    panel.classList.add("smartcat-open");
    state.elements.input.value = await loadDraft();
    updateConfigSummary();
    updateAtHints();
    setTimeout(() => state.elements.input.focus(), 0);
  }

  function hidePanel() {
    if (!state.panel) return;
    saveDraft(state.elements.input.value);
    state.panel.classList.remove("smartcat-open");
  }

  function updateConfigSummary() {
    if (!state.elements.configSummary) return;
    const agentMode = nativeAgentAvailable() ? "ScriptCat Agent" : "Agent 不可用";
    const attachment = state.attachment ? ` · 已引用 ${state.attachment.name}` : "";
    const selectedNode = state.selectedNode ? ` · 已选择 <${state.selectedNode.tag}>` : "";
    const selectedImage = state.selectedImage ? " · 已选择图片" : "";
    state.elements.configSummary.textContent = `快捷键 ${state.config.shortcut} · ${agentMode}${attachment}${selectedNode}${selectedImage}`;
  }

  async function handlePanelClick(event) {
    if (event.target && event.target.dataset && event.target.dataset.atToken) {
      applyAtSuggestion(event.target.dataset.atToken);
      return;
    }

    const action = event.target && event.target.dataset ? event.target.dataset.action : "";
    if (!action) return;

    if (action === "close") hidePanel();
    if (action === "send") await sendCurrentInput();
    if (action === "retry") await retryLastMessage();
    if (action === "copy") await copyCurrentResponse();
    if (action === "clear") setResponse("");
    if (action === "file") openFilePicker();
    if (action === "recent") await showRecentMessages();
    if (action === "clear-data") await clearDataFromPanel();
  }

  function setResponse(text, options = {}) {
    state.lastResponseText = String(text || "");
    if (state.elements.response) {
      state.elements.response.textContent = state.lastResponseText;
    }
    if (state.elements.retryButton) {
      state.elements.retryButton.disabled = !options.canRetry || !state.lastMessage;
    }
  }

  function setLoading(isLoading) {
    state.sending = isLoading;
    if (state.elements.sendButton) {
      state.elements.sendButton.disabled = isLoading;
      state.elements.sendButton.textContent = isLoading ? "发送中" : "发送";
    }
  }

  async function clearDataFromPanel() {
    if (!confirm("清除草稿、最近消息和文件引用？")) return;
    await clearLocalData();
    state.attachment = null;
    state.selectedNode = null;
    state.selectedImage = null;
    state.elements.input.value = "";
    if (state.elements.fileInput) state.elements.fileInput.value = "";
    updateConfigSummary();
    setResponse(TEXT.clearedData);
  }

  // ---------------------------------------------------------------------------
  // @ mentions and files
  // ---------------------------------------------------------------------------

  function updateAtHints() {
    if (!state.elements.atHints || !state.elements.input) return;
    const token = getCurrentAtToken(state.elements.input.value, state.elements.input.selectionStart || 0);

    if (!token) {
      state.elements.atHints.hidden = true;
      state.elements.atHints.textContent = "";
      return;
    }

    const suggestions = getCurrentAtSuggestions();
    if (!suggestions.length) {
      state.elements.atHints.hidden = true;
      state.elements.atHints.textContent = "";
      return;
    }

    state.elements.atHints.hidden = false;
    state.elements.atHints.innerHTML = suggestions
      .map((item) => (
        `<button type="button" class="smartcat-at-hint" data-at-token="${item.token}">` +
        `<strong>${item.label}</strong> ${item.description}</button>`
      ))
      .join("");
  }

  function getCurrentAtToken(value, cursor) {
    const beforeCursor = value.slice(0, cursor);
    const match = beforeCursor.match(/(^|\s)(@[a-zA-Z\u4e00-\u9fa5]*)$/);
    return match ? match[2] : "";
  }

  function getCurrentAtSuggestions() {
    if (!state.elements.input) return [];

    const token = getCurrentAtToken(
      state.elements.input.value,
      state.elements.input.selectionStart || 0,
    );
    const normalized = token.toLowerCase();
    return AT_SUGGESTIONS.filter((item) => item.token.startsWith(normalized));
  }

  function applyAtSuggestion(token) {
    const input = state.elements.input;
    if (!input) return;

    const cursor = input.selectionStart || 0;
    const beforeCursor = input.value.slice(0, cursor);
    const afterCursor = input.value.slice(cursor);
    const match = beforeCursor.match(/(^|\s)(@[a-zA-Z\u4e00-\u9fa5]*)$/);
    if (!match) return;

    const prefix = beforeCursor.slice(0, beforeCursor.length - match[2].length);
    input.value = `${prefix}${token} ${afterCursor}`;
    const nextCursor = `${prefix}${token} `.length;
    input.setSelectionRange(nextCursor, nextCursor);
    saveDraft(input.value);
    updateAtHints();

    if (token === "@file") openFilePicker();
    if (token === "@selection") startNodePicker("node");
    if (token === "@img") startNodePicker("image");
  }

  function openFilePicker() {
    if (state.elements.fileInput) {
      state.elements.fileInput.click();
    }
  }

  async function handleFilePicked(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    try {
      const text = await readFileAsText(file);
      state.attachment = {
        name: file.name,
        type: file.type || "text/plain",
        size: file.size,
        text: text.slice(0, MAX_ATTACHMENT_CHARS),
        truncated: text.length > MAX_ATTACHMENT_CHARS,
      };
      ensureAtFileToken();
      updateConfigSummary();
      setResponse(`已引用文件：${file.name}${state.attachment.truncated ? "（内容已截断）" : ""}`);
    } catch (error) {
      setResponse(`读取文件失败：${error.message}`);
    }
  }

  function readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = () => reject(reader.error || new Error("未知文件读取错误"));
      reader.readAsText(file);
    });
  }

  function ensureAtFileToken() {
    const input = state.elements.input;
    if (!input || input.value.includes("@file")) return;
    input.value = input.value ? `@file ${input.value}` : "@file ";
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
    saveDraft(input.value);
  }

  // ---------------------------------------------------------------------------
  // Node picker
  // ---------------------------------------------------------------------------

  function startNodePicker(mode = "node") {
    if (state.nodePicker) return;

    hidePanel();

    const highlight = document.createElement("div");
    highlight.className = "smartcat-node-picker-highlight";
    highlight.hidden = true;

    const label = document.createElement("div");
    label.className = "smartcat-node-picker-label";
    label.textContent = mode === "image"
      ? "选择一张页面图片作为 @img 上下文，点击确认，Esc 取消"
      : "选择一个页面区域作为 @selection 上下文，点击确认，Esc 取消";

    document.documentElement.appendChild(highlight);
    document.documentElement.appendChild(label);

    state.nodePicker = {
      mode,
      highlight,
      label,
      current: null,
    };

    positionNodePickerLabel(12, 12);

    document.addEventListener("mousemove", handleNodePickerMove, true);
    document.addEventListener("click", handleNodePickerClick, true);
    document.addEventListener("keydown", handleNodePickerKeydown, true);
  }

  function stopNodePicker(options = {}) {
    if (!state.nodePicker) return;

    document.removeEventListener("mousemove", handleNodePickerMove, true);
    document.removeEventListener("click", handleNodePickerClick, true);
    document.removeEventListener("keydown", handleNodePickerKeydown, true);

    state.nodePicker.highlight.remove();
    state.nodePicker.label.remove();
    state.nodePicker = null;

    if (options.reopen !== false) {
      openPanel();
    }
  }

  function handleNodePickerMove(event) {
    if (!state.nodePicker) return;

    const target = getPickableElement(event.target, state.nodePicker.mode);
    if (!target) {
      state.nodePicker.current = null;
      state.nodePicker.highlight.hidden = true;
      state.nodePicker.label.textContent = state.nodePicker.mode === "image"
        ? "移动到页面图片上，点击选择图片，Esc 取消"
        : "移动到页面内容上，点击选择节点，Esc 取消";
      positionNodePickerLabel(event.clientX + 12, event.clientY + 12);
      return;
    }

    state.nodePicker.current = target;
    updateNodePickerHighlight(target);
    if (state.nodePicker.mode === "image") {
      const image = getImageInfo(target);
      state.nodePicker.label.textContent = `选择图片 · ${image.width || "?"}x${image.height || "?"} · 点击确认，Esc 取消`;
    } else {
      const textLength = getElementText(target).length;
      state.nodePicker.label.textContent = `选择 <${target.tagName.toLowerCase()}> · ${textLength} 字符 · 点击确认，Esc 取消`;
    }
    positionNodePickerLabel(event.clientX + 12, event.clientY + 12);
  }

  function handleNodePickerClick(event) {
    if (!state.nodePicker) return;

    event.preventDefault();
    event.stopPropagation();

    const target = getPickableElement(event.target, state.nodePicker.mode) || state.nodePicker.current;
    if (!target) return;

    if (state.nodePicker.mode === "image") {
      state.selectedImage = getImageInfo(target);
      stopNodePicker();
      updateConfigSummary();
      setResponse(`已选择图片作为 @img 上下文：${state.selectedImage.src}`);
      return;
    }

    const text = getElementText(target);
    state.selectedNode = {
      tag: target.tagName.toLowerCase(),
      text: text.slice(0, MAX_NODE_TEXT_CHARS),
      truncated: text.length > MAX_NODE_TEXT_CHARS,
    };

    stopNodePicker();
    updateConfigSummary();
    setResponse(
      `已选择 <${state.selectedNode.tag}> 节点作为 @selection 上下文` +
      `${state.selectedNode.truncated ? "（内容已截断）" : ""}`,
    );
  }

  function handleNodePickerKeydown(event) {
    if (event.key !== "Escape") return;

    event.preventDefault();
    event.stopPropagation();
    stopNodePicker();
  }

  function getPickableElement(target, mode = "node") {
    if (!(target instanceof Element)) return null;
    if (target.closest("#smartcat-panel")) return null;
    if (target.closest(".smartcat-node-picker-highlight, .smartcat-node-picker-label")) return null;

    if (mode === "image") {
      const image = target.closest("img");
      if (image && (image.currentSrc || image.src)) return image;
      return null;
    }

    return target.closest("article, main, section, div, p, li, table, pre, blockquote, body");
  }

  function updateNodePickerHighlight(element) {
    const rect = element.getBoundingClientRect();
    const highlight = state.nodePicker.highlight;
    highlight.hidden = false;
    highlight.style.setProperty("left", `${rect.left}px`, "important");
    highlight.style.setProperty("top", `${rect.top}px`, "important");
    highlight.style.setProperty("width", `${rect.width}px`, "important");
    highlight.style.setProperty("height", `${rect.height}px`, "important");
  }

  function positionNodePickerLabel(left, top) {
    const label = state.nodePicker.label;
    const maxLeft = Math.max(8, window.innerWidth - label.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - label.offsetHeight - 8);
    label.style.setProperty("left", `${clamp(left, 8, maxLeft)}px`, "important");
    label.style.setProperty("top", `${clamp(top, 8, maxTop)}px`, "important");
  }

  function getElementText(element) {
    const clone = element.cloneNode(true);
    clone
      .querySelectorAll("script, style, noscript, template, svg, canvas, iframe, object, embed")
      .forEach((node) => node.remove());

    return (clone.innerText || clone.textContent || "")
      .replace(/\u00a0/g, " ")
      .replace(/[ \t\r\f\v]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  function getImageInfo(image) {
    const rect = image.getBoundingClientRect();
    return {
      src: image.currentSrc || image.src || "",
      alt: image.alt || "",
      title: image.title || "",
      width: image.naturalWidth || Math.round(rect.width),
      height: image.naturalHeight || Math.round(rect.height),
      displayWidth: Math.round(rect.width),
      displayHeight: Math.round(rect.height),
    };
  }

  // ---------------------------------------------------------------------------
  // Agent
  // ---------------------------------------------------------------------------

  async function sendCurrentInput() {
    const input = state.elements.input;
    const message = input ? input.value.trim() : "";
    if (!message) {
      setResponse(TEXT.emptyInput);
      return;
    }
    if (message.includes("@selection") && !state.selectedNode) {
      startNodePicker("node");
      return;
    }
    if (message.includes("@img") && !state.selectedImage) {
      startNodePicker("image");
      return;
    }
    await sendMessage(message);
  }

  async function retryLastMessage() {
    if (!state.lastMessage) return;
    await sendMessage(state.lastMessage);
  }

  async function sendMessage(message) {
    if (!nativeAgentAvailable()) {
      setResponse(TEXT.agentUnavailable);
      return;
    }
    if (state.sending) return;

    state.lastMessage = message;
    setLoading(true);
    setResponse(TEXT.loading);

    try {
      const responseText = await requestAgent(message);
      setResponse(responseText);
      await clearDraft();
      if (state.elements.input) state.elements.input.value = "";
      await addRecentMessage(message, responseText);
    } catch (error) {
      setResponse(`请求失败：${error.message}`, { canRetry: true });
    } finally {
      setLoading(false);
    }
  }

  async function requestAgent(message) {
    return requestScriptCatAgent(message);
  }

  async function requestScriptCatAgent(message) {
    if (!state.conversation) {
      state.conversation = await CAT.agent.conversation.create({
        system: [
          "你是智能猫 SmartCat，一个运行在 ScriptCat 用户脚本里的轻量 AI Agent。",
          "请直接、准确地回答用户问题。",
          "用户消息会附带当前网页标题、URL 和选中文本，可按需参考。",
        ].join("\n"),
      });
    }

    const prompt = buildAgentPrompt(message);

    const reply = await state.conversation.chat(prompt);
    if (reply && typeof reply.content === "string") return reply.content;
    if (typeof reply === "string") return reply;
    return JSON.stringify(reply, null, 2);
  }

  function buildAgentPrompt(message) {
    const selection = String(window.getSelection ? window.getSelection() : "");
    const context = [
      "页面上下文：",
      `标题：${document.title || ""}`,
      `URL：${location.href}`,
    ];

    if (message.includes("@selection")) {
      if (state.selectedNode) {
        context.push([
          "节点选择引用：",
          `标签：<${state.selectedNode.tag}>`,
          state.selectedNode.truncated ? `注意：节点文本已截断到 ${MAX_NODE_TEXT_CHARS} 字符。` : "",
          "内容：",
          state.selectedNode.text,
        ].filter(Boolean).join("\n"));
      } else {
        context.push("节点选择引用：用户输入了 @selection，但尚未选择页面节点。");
      }
    }
    if (message.includes("@page")) {
      const pageText = extractPageText();
      context.push([
        "页面正文引用：",
        pageText.text || "未提取到页面正文文本。",
        pageText.truncated ? `注意：页面正文已截断到 ${MAX_PAGE_TEXT_CHARS} 字符。` : "",
      ].filter(Boolean).join("\n"));
    }
    if (message.includes("@img")) {
      if (state.selectedImage) {
        context.push([
          "图片引用：",
          `地址：${state.selectedImage.src}`,
          `替代文本：${state.selectedImage.alt || "无"}`,
          `标题：${state.selectedImage.title || "无"}`,
          `原始尺寸：${state.selectedImage.width || "未知"}x${state.selectedImage.height || "未知"}`,
          `显示尺寸：${state.selectedImage.displayWidth || "未知"}x${state.selectedImage.displayHeight || "未知"}`,
        ].join("\n"));
      } else {
        context.push("图片引用：用户输入了 @img，但尚未选择页面图片。");
      }
    }
    if (message.includes("@file")) {
      if (state.attachment) {
        context.push([
          "文件引用：",
          `文件名：${state.attachment.name}`,
          `类型：${state.attachment.type}`,
          `大小：${state.attachment.size} bytes`,
          state.attachment.truncated ? `注意：文件内容已截断到 ${MAX_ATTACHMENT_CHARS} 字符。` : "",
          "内容：",
          state.attachment.text,
        ].filter(Boolean).join("\n"));
      } else {
        context.push("文件引用：用户输入了 @file，但尚未选择文件。");
      }
    }
    if (!message.includes("@selection")) {
      context.push(`当前选中文本：${selection || "无"}`);
    }

    return [message, "", context.join("\n")].join("\n");
  }

  function extractPageText() {
    const source = document.body;
    if (!source) return { text: "", truncated: false };

    const clone = source.cloneNode(true);
    clone
      .querySelectorAll([
        "script",
        "style",
        "noscript",
        "template",
        "svg",
        "canvas",
        "iframe",
        "object",
        "embed",
        "video",
        "audio",
        "source",
        "picture",
        "nav",
        "header",
        "footer",
      ].join(","))
      .forEach((node) => node.remove());

    const text = clone.textContent
      .replace(/\u00a0/g, " ")
      .replace(/[ \t\r\f\v]+/g, " ")
      .replace(/\n\s*\n\s*\n+/g, "\n\n")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .join("\n")
      .trim();

    return {
      text: text.slice(0, MAX_PAGE_TEXT_CHARS),
      truncated: text.length > MAX_PAGE_TEXT_CHARS,
    };
  }

  function nativeAgentAvailable() {
    return (
      typeof CAT !== "undefined" &&
      CAT &&
      CAT.agent &&
      CAT.agent.conversation &&
      typeof CAT.agent.conversation.create === "function"
    );
  }

  // ---------------------------------------------------------------------------
  // Dragging
  // ---------------------------------------------------------------------------

  function startPanelDrag(event) {
    if (!state.panel || event.button !== 0) return;
    if (event.target.closest("button")) return;

    const rect = state.panel.getBoundingClientRect();
    state.drag = {
      pointerId: event.pointerId,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };

    state.panel.classList.add("smartcat-dragging");
    setPanelPosition(rect.left, rect.top);
    state.elements.header.setPointerCapture(event.pointerId);
    event.preventDefault();

    window.addEventListener("pointermove", movePanelDrag, true);
    window.addEventListener("pointerup", stopPanelDrag, true);
    window.addEventListener("pointercancel", stopPanelDrag, true);
  }

  function movePanelDrag(event) {
    if (!state.drag || !state.panel || event.pointerId !== state.drag.pointerId) return;

    const margin = 8;
    const maxLeft = Math.max(margin, window.innerWidth - state.drag.width - margin);
    const maxTop = Math.max(margin, window.innerHeight - state.drag.height - margin);
    const left = clamp(event.clientX - state.drag.offsetX, margin, maxLeft);
    const top = clamp(event.clientY - state.drag.offsetY, margin, maxTop);

    setPanelPosition(left, top);
  }

  function stopPanelDrag(event) {
    if (!state.drag || event.pointerId !== state.drag.pointerId) return;

    if (state.elements.header && state.elements.header.hasPointerCapture(event.pointerId)) {
      state.elements.header.releasePointerCapture(event.pointerId);
    }
    if (state.panel) {
      state.panel.classList.remove("smartcat-dragging");
    }
    state.drag = null;
    window.removeEventListener("pointermove", movePanelDrag, true);
    window.removeEventListener("pointerup", stopPanelDrag, true);
    window.removeEventListener("pointercancel", stopPanelDrag, true);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function setPanelPosition(left, top) {
    state.panel.style.setProperty("left", `${left}px`, "important");
    state.panel.style.setProperty("top", `${top}px`, "important");
    state.panel.style.setProperty("transform", "none", "important");
  }

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function copyCurrentResponse() {
    if (!state.lastResponseText) return;
    try {
      if (typeof GM_setClipboard === "function") {
        GM_setClipboard(state.lastResponseText);
      } else if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(state.lastResponseText);
      } else {
        throw new Error("当前浏览器不支持剪贴板 API");
      }
      setResponse(`${state.lastResponseText}\n\n${TEXT.copied}`);
    } catch (error) {
      setResponse(`复制失败：${error.message}`, { canRetry: true });
    }
  }

  async function showRecentMessages() {
    const recent = await loadRecentMessages();
    if (!recent.length) {
      setResponse(TEXT.noRecent);
      return;
    }

    const text = recent
      .map((item, index) => {
        const time = item.createdAt ? new Date(item.createdAt).toLocaleString() : "";
        return [
          `#${index + 1} ${time}`,
          `Q: ${item.message}`,
          `A: ${item.responseText}`,
        ].join("\n");
      })
      .join("\n\n---\n\n");
    setResponse(text);
  }

  // ---------------------------------------------------------------------------
  // Event binding
  // ---------------------------------------------------------------------------

  function registerMenuCommand() {
    if (typeof GM_registerMenuCommand === "function") {
      GM_registerMenuCommand("打开智能猫 SmartCat", openPanel);
    }
  }

  function bindShortcut() {
    document.addEventListener(
      "keydown",
      async (event) => {
        if (state.panel && state.panel.classList.contains("smartcat-open") && event.key === "Escape") {
          event.preventDefault();
          hidePanel();
          return;
        }

        if (matchesConfiguredShortcut(event)) {
          event.preventDefault();
          await openPanel();
        }
      },
      true,
    );
  }

  function matchesShortcut(event, shortcut) {
    const parts = String(shortcut || "")
      .split("+")
      .map((part) => part.trim().toLowerCase())
      .filter(Boolean);

    if (!parts.length) return false;

    const expectedKey = parts[parts.length - 1];
    const key = normalizeKey(event.key);
    const wantsCtrl = parts.includes("ctrl") || parts.includes("control");
    const wantsAlt = parts.includes("alt") || parts.includes("option");
    const wantsShift = parts.includes("shift");
    const wantsMeta = parts.includes("meta") || parts.includes("cmd") || parts.includes("command");

    return (
      key === normalizeKey(expectedKey) &&
      event.ctrlKey === wantsCtrl &&
      event.altKey === wantsAlt &&
      event.shiftKey === wantsShift &&
      event.metaKey === wantsMeta
    );
  }

  function matchesConfiguredShortcut(event) {
    if (matchesShortcut(event, state.config.shortcut)) return true;

    // Keep Command+K working on macOS even if an older saved config still says Alt+K.
    return isMacPlatform() && matchesShortcut(event, "Command+K");
  }

  function normalizeKey(key) {
    const lower = String(key || "").toLowerCase();
    if (lower === " ") return "space";
    if (lower === "escape") return "esc";
    return lower;
  }

  async function init() {
    registerMenuCommand();
    bindShortcut();
    console.log(`[${APP.englishName}] loaded. Open with ${state.config.shortcut} or ScriptCat menu.`);
  }

  init();
})();
