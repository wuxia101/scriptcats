// ==UserScript==
// @name         AI Selection Toolbar
// @namespace    scriptcat-ai-toolbar
// @version      1.0.0
// @description  选中文本后显示可配置的 AI 工具栏：问问AI、复制、翻译、朗读、总结
// @author       ScriptCat
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_xmlhttpRequest
// @grant        CAT.agent.conversation
// @require      https://scriptcat.org/lib/6768/1.0.3/TextSelectionToolbar.js?sha384-KdAOkMoxfRv3Z1qNcSkB15QDJOJdYaHtDWalODEHRpwmLORd12I2maAY7CuRuHXc
// @icon         https://scriptcat.org/_next/image?url=%2Fassets%2Flogo.png&w=64&q=75
// ==/UserScript==

(function () {
  'use strict';

  // ============================================================
  // 7. 设置存储与配置 (ai-toolbar-settings)
  // ============================================================

  const STORAGE_PREFIX = 'aiToolbar_';

  const DEFAULT_SETTINGS = {
    tts_backend: 'browser',
    tts_lang: 'zh-CN',
    tts_rate: 1.0,
    tts_volume: 1.0,
    tts_externalEndpoint: '',
    tts_externalKey: '',
    toolbarShowTitle: true,
    translation_targetLang: 'zh',
    actions: [
      { id: 'ask-ai', enabled: true, icon: '🤖', title: '问问AI', type: 'chat', promptTemplate: '当前页面属于「{domain}」领域。用户选中了一段文本，请先解释选中内容是什么，然后结合该领域知识回答用户提问。\n\n选中文本：{text}', order: 1 },
      { id: 'copy', enabled: true, icon: '📋', title: '复制', type: 'local', order: 2 },
      { id: 'translate', enabled: true, icon: '🌐', title: '翻译', type: 'chat', promptTemplate: '请将以下文本翻译成{lang}，只输出翻译结果：\n\n{text}', order: 3 },
      { id: 'read-aloud', enabled: true, icon: '🔊', title: '朗读', type: 'local', order: 4 },
      { id: 'summarize', enabled: true, icon: '📝', title: '总结', type: 'chat', promptTemplate: '请先根据当前页面内容判断该文本所属的领域（如技术、金融、医疗、法律、教育、文学等），然后用该领域的专业视角对选中文本进行总结。\n\n输出格式要求：\n1. 先判断领域，以「领域：xxx」开头\n2. 用「属性：内容」的 key:value 形式提取文本中的关键信息（每行一个属性）\n3. 最后用一段简洁的文字总结核心要点\n\n示例：\n领域：技术\n语言：Python\n框架：Django\n主题：ORM 性能优化\n总结：文本介绍了 Django ORM 中避免 N+1 查询的几种常见优化策略，包括 select_related、prefetch_related 和批量查询等方法。\n\n选中文本：{text}', order: 5 },
    ],
  };

  const LANG_NAMES = { zh: '中文', en: '英文', ja: '日语', ko: '韩语', fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', pt: '葡萄牙语', it: '意大利语', ar: '阿拉伯语' };

  function loadSettings() {
    const settings = {};
    // Load simple key-value settings
    for (const [key, defaultVal] of Object.entries(DEFAULT_SETTINGS)) {
      if (key === 'actions') continue;
      const stored = GM_getValue(STORAGE_PREFIX + key);
      settings[key] = stored !== undefined ? stored : defaultVal;
    }
    // Load actions
    const storedActions = GM_getValue(STORAGE_PREFIX + 'actions');
    settings.actions = storedActions !== undefined ? storedActions : DEFAULT_SETTINGS.actions;
    return settings;
  }

  function saveSetting(key, value) {
    GM_setValue(STORAGE_PREFIX + key, value);
  }

  function getLangName(code) {
    return LANG_NAMES[code] || code;
  }

  // ============================================================
  // 5.6 Prompt 模板引擎 (toolbar-actions)
  // ============================================================

  /** 页面领域关键词映射 */
  const DOMAIN_KEYWORDS = {
    技术: ['code', '编程', '开发', 'javascript', 'python', 'api', 'github', 'stack overflow', 'bug', '框架', '算法', '数据库', '服务器', '部署', 'docker', 'linux', '前端', '后端', 'react', 'vue', 'node'],
    金融: ['股票', '基金', '投资', '利率', '财报', '市值', '融资', 'ipo', '债券', '期货', '外汇', '银行', '保险', '证券', '估值'],
    医疗: ['症状', '治疗', '诊断', '药物', '手术', '临床', '患者', '病理', '疫苗', '医院', '健康', '疾病', '医学', '护理'],
    法律: ['合同', '法规', '条款', '诉讼', '判决', '律师', '权利', '义务', '侵权', '知识产权', '刑法', '民法', '仲裁'],
    教育: ['课程', '考试', '学习', '教学', '培训', '学历', '招生', '论文', '研究', '学术', '大学', '学校', '教育'],
    文学: ['小说', '诗歌', '散文', '作者', '作品', '文学', '创作', '叙事', '角色', '情节', '书评', '阅读'],
    商业: ['市场', '营销', '品牌', '客户', '产品', '战略', '管理', '创业', '供应链', '零售', '电商', '竞争'],
    科学: ['实验', '理论', '研究', '数据', '分析', '物理', '化学', '生物', '天文', '数学', '科学', '发现'],
  };

  /** 根据页面内容推断领域 */
  function inferPageDomain() {
    const title = document.title || '';
    const metaDesc = (document.querySelector('meta[name="description"]')?.content || '');
    const url = location.href || '';
    const bodyText = (document.body?.innerText?.substring(0, 3000) || '');
    const source = `${title} ${metaDesc} ${url} ${bodyText}`.toLowerCase();

    let bestDomain = '综合';
    let bestScore = 0;

    for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
      let score = 0;
      for (const kw of keywords) {
        const matches = source.split(kw.toLowerCase()).length - 1;
        score += matches;
      }
      if (score > bestScore) {
        bestScore = score;
        bestDomain = domain;
      }
    }

    return bestDomain;
  }

  function renderPromptTemplate(template, text, lang) {
    return template
      .replace(/\{text\}/g, text)
      .replace(/\{lang\}/g, getLangName(lang))
      .replace(/\{domain\}/g, inferPageDomain());
  }

  // ============================================================
  // 4. LLM 适配层 — 仅 CAT.agent (llm-adapter)
  // ============================================================

  // 1.3 入口检查
  function isCatAPIAvailable() {
    return typeof CAT !== 'undefined' && CAT.agent && CAT.agent.conversation;
  }

  // StreamChunk: { type: "content_delta"|"done"|"error", content: string }
  class CatAPIAdapter {
    constructor() {
      this.conversation = null;
      this.currentSystemPrompt = null;
      this.abortController = null;
    }

    async chat(messages, options = {}) {
      const systemPrompt = options.systemPrompt || this.currentSystemPrompt || '';
      const text = options.text || '';
      const lang = options.lang || '';

      // Create or reuse conversation
      if (!this.conversation || this.currentSystemPrompt !== systemPrompt) {
        if (this.conversation) {
          try { await this.conversation.clear(); } catch (e) { /* ignore */ }
        }
        this.conversation = await CAT.agent.conversation.create({
          system: systemPrompt,
          ephemeral: true,
          cache: false,
        });
        this.currentSystemPrompt = systemPrompt;
      }

      // Build user message
      const userMessage = messages && messages.length > 0
        ? messages[messages.length - 1].content
        : text;

      // Stream via chatStream
      const stream = this.conversation.chatStream(userMessage);
      this.abortController = { aborted: false };

      // Wrap stream into AsyncIterable of StreamChunk + abort function
      const asyncIterable = this._wrapStream(stream);
      return {
        stream: asyncIterable,
        abort: () => {
          this.abortController.aborted = true;
          // CAT.agent conversation doesn't have explicit abort; we mark done
        },
      };
    }

    async _wrapStream(catStream) {
      const chunks = [];
      let done = false;

      // We need to consume the stream and collect chunks
      // Since the panel needs incremental rendering, we'll push chunks to a queue
      // that the panel consumer reads via a poll/callback pattern

      // Actually, let's use a simpler approach: collect all chunks in real-time
      // and provide them through a callback-based approach

      // We'll modify the architecture slightly: instead of AsyncIterable,
      // use a callback-based approach that's easier to integrate with DOM updates

      // For now, let's just collect and return when done
      // The panel will call startChat() which sets up the stream processing

      try {
        for await (const chunk of catStream) {
          if (this.abortController && this.abortController.aborted) break;
          chunks.push(chunk);
        }
      } catch (e) {
        chunks.push({ type: 'error', error: e.message || 'CatAPI 流式请求出错' });
      }

      return chunks;
    }

    async chatStreamToPanel(systemPrompt, userMessage, onChunk, onDone, onError) {
      try {
        // If systemPrompt is null (follow-up), reuse existing conversation
        // If systemPrompt differs from current, recreate conversation
        const needRecreate = systemPrompt !== null && systemPrompt !== this.currentSystemPrompt;
        const noConversation = !this.conversation;

        if (needRecreate || noConversation) {
          if (this.conversation) {
            try { await this.conversation.clear(); } catch (e) { /* ignore */ }
          }
          this.conversation = await CAT.agent.conversation.create({
            system: systemPrompt || this.currentSystemPrompt || '',
            ephemeral: true,
            cache: false,
          });
          this.currentSystemPrompt = systemPrompt || this.currentSystemPrompt;
        }

        const stream = await this.conversation.chatStream(userMessage);
        this.abortController = { aborted: false };

        for await (const chunk of stream) {
          if (this.abortController.aborted) break;

          if (chunk.type === 'content_delta') {
            // 只处理字符串内容，过滤掉异常值
            if (chunk.content && typeof chunk.content === 'string') {
              onChunk(chunk.content);
            }
          } else if (chunk.type === 'thinking_delta') {
            // 忽略思考过程，不输出到面板
          } else if (chunk.type === 'tool_call') {
            // 忽略工具调用事件
          } else if (chunk.type === 'content_block') {
            // 内容块事件：如果是文本块则输出
            if (chunk.block && chunk.block.type === 'text' && chunk.block.text) {
              onChunk(chunk.block.text);
            }
          } else if (chunk.type === 'done') {
            onDone();
            break; // done 后立即退出循环
          } else if (chunk.type === 'error') {
            onError(chunk.error || 'CatAPI 出错');
            return;
          }
        }

        // If aborted, we still call onDone with whatever we have
        if (this.abortController.aborted) {
          onDone();
        }
      } catch (e) {
        onError(e.message || 'CatAPI 不可用，请检查 @grant 和 ScriptCat 版本');
      }
    }

    abort() {
      if (this.abortController) {
        this.abortController.aborted = true;
      }
    }

    reset() {
      this.conversation = null;
      this.currentSystemPrompt = null;
      this.abortController = null;
    }
  }

  // ============================================================
  // 6. 朗读适配层 (tts-adapter)
  // ============================================================

  /**
   * 朗读文本预处理：去除不适合朗读的符号和标记
   * - 剔除 Markdown 语法标记（#、*、```、>、- 列表等）
   * - 剔除 URL 链接
   * - 剔除 HTML 标签残留
   * - 剔除 emoji 和特殊 Unicode 符号
   * - 保留自然语言标点（逗号、句号、问号、感叹号、冒号等）以提供朗读节奏
   */
  function cleanTextForTTS(text) {
    if (!text) return '';
    let cleaned = text;

    // 移除 fenced code blocks（含语言标记）
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '');
    // 移除 inline code
    cleaned = cleaned.replace(/`[^`]+`/g, '');
    // 移除 Markdown 标题标记
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '');
    // 移除粗体/斜体标记
    cleaned = cleaned.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
    // 移除引用标记
    cleaned = cleaned.replace(/^>\s+/gm, '');
    // 移除链接，保留显示文字
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
    // 移除裸 URL
    cleaned = cleaned.replace(/https?:\/\/\S+/g, '');
    // 移除 HTML 标签
    cleaned = cleaned.replace(/<[^>]+>/g, '');
    // 移除列表标记（- 和数字.）
    cleaned = cleaned.replace(/^[\s]*[-*•]\s+/gm, '');
    cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '');
    // 移除 emoji 和常见特殊符号（保留自然语言标点）
    cleaned = cleaned.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{200D}\u{20E3}]/gu, '');
    // 移除特殊排版符号：§†‡※☆★○●◎◇◆□■△▲▽▼♩♪♫♬
    cleaned = cleaned.replace(/[§†‡※☆★○●◎◇◆□■△▲▽▼♩♪♫♬♩→←↑↓↔⟹⇒⇐⊕⊗]/g, '');
    // 移除多余空白
    cleaned = cleaned.replace(/[ \t]+/g, ' ');
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    cleaned = cleaned.trim();

    return cleaned;
  }

  class BrowserTTSAdapter {
    constructor(settings) {
      this.settings = settings;
      this.speaking = false;
      this.voicesLoaded = false;
      this._loadVoices();
    }

    _loadVoices() {
      const voices = speechSynthesis.getVoices();
      if (voices.length > 0) {
        this.voicesLoaded = true;
        return;
      }
      // Voices load asynchronously in some browsers
      speechSynthesis.addEventListener('voiceschanged', () => {
        this.voicesLoaded = true;
      }, { once: true });
    }

    _findVoice(lang) {
      const voices = speechSynthesis.getVoices();
      // Try exact match first
      let voice = voices.find(v => v.lang === lang);
      if (!voice) {
        // Try prefix match (e.g., "zh-CN" matches "zh")
        voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
      }
      return voice || voices[0]; // fallback to first available
    }

    speak(text, options = {}) {
      if (this.speaking) this.stop();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = this.settings.tts_lang || 'zh-CN';
      utterance.rate = this.settings.tts_rate || 1.0;
      utterance.volume = this.settings.tts_volume || 1.0;

      const voice = this._findVoice(utterance.lang);
      if (voice) utterance.voice = voice;

      utterance.onend = () => {
        this.speaking = false;
        this._onSpeechEnd?.();
      };
      utterance.onerror = (e) => {
        this.speaking = false;
        if (e.error === 'not-allowed' || e.error === 'canceled') {
          // Autoplay policy or manual cancel
          this._onSpeechEnd?.();
        } else {
          console.warn('[AI Toolbar] Speech error:', e.error);
        }
      };

      try {
        speechSynthesis.speak(utterance);
        this.speaking = true;
      } catch (e) {
        // Autoplay policy might block
        this.speaking = false;
        console.warn('[AI Toolbar] Speech blocked:', e.message);
      }
    }

    stop() {
      speechSynthesis.cancel();
      this.speaking = false;
    }

    setOnSpeechEnd(callback) {
      this._onSpeechEnd = callback;
    }
  }

  class ExternalTTSAdapter {
    constructor(settings) {
      this.settings = settings;
      this.audioElement = null;
      this.speaking = false;
    }

    speak(text, options = {}) {
      if (this.speaking) this.stop();

      const endpoint = this.settings.tts_externalEndpoint;
      const key = this.settings.tts_externalKey;

      if (!endpoint || !key) {
        console.warn('[AI Toolbar] 外部 TTS 未配置');
        return;
      }

      GM_xmlhttpRequest({
        method: 'POST',
        url: endpoint,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        data: JSON.stringify({
          model: 'tts-1',
          input: text,
          voice: 'alloy',
        }),
        responseType: 'blob',
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            const blob = response.response;
            const url = URL.createObjectURL(blob);
            this.audioElement = new Audio(url);
            this.audioElement.onended = () => {
              this.speaking = false;
              URL.revokeObjectURL(url);
              this._onSpeechEnd?.();
            };
            this.audioElement.onerror = () => {
              this.speaking = false;
              URL.revokeObjectURL(url);
            };
            this.audioElement.play();
            this.speaking = true;
          } else {
            console.warn('[AI Toolbar] TTS API error:', response.status);
          }
        },
        onerror: () => {
          console.warn('[AI Toolbar] TTS 请求失败');
        },
      });
    }

    stop() {
      if (this.audioElement) {
        this.audioElement.pause();
        this.audioElement = null;
      }
      this.speaking = false;
    }

    setOnSpeechEnd(callback) {
      this._onSpeechEnd = callback;
    }
  }

  function createTTSAdapter(settings) {
    return settings.tts_backend === 'external'
      ? new ExternalTTSAdapter(settings)
      : new BrowserTTSAdapter(settings);
  }

  // ============================================================
  // 9. Markdown-lite 结果渲染
  // ============================================================

  function renderMarkdownLite(text) {
    if (!text) return '';

    let html = text;

    // Fenced code blocks: ```lang\ncode\n```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      const label = lang ? `<span class="ait-code-lang">${lang}</span>` : '';
      return `<pre class="ait-code-block">${label}<code>${escapeHtml(code.trim())}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="ait-inline-code">$1</code>');

    // Links: [text](url)
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // Bold: **text**
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

    // Headers: ### text
    html = html.replace(/^#{1,3}\s+(.+)$/gm, '<h4 class="ait-heading">$1</h4>');

    // Bullet lists: - item
    html = html.replace(/^[•\-]\s+(.+)$/gm, '<li class="ait-li">$1</li>');

    // Numbered lists: 1. item
    html = html.replace(/^\d+\.\s+(.+)$/gm, '<li class="ait-li ait-li-ordered">$1</li>');

    // Paragraphs: double newline
    html = html.replace(/\n\n+/g, '</p><p class="ait-para">');
    html = html.replace(/\n/g, '<br>');

    // Wrap in paragraph if not already wrapped
    if (!html.startsWith('<')) {
      html = `<p class="ait-para">${html}</p>`;
    }

    return html;
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ============================================================
  // 2. Shadow DOM 和面板 DOM + 3. 面板状态机
  // ============================================================

  const PANEL_STYLES = `
    :host {
      all: initial;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    }

    .ait-host {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      z-index: 999999;
      pointer-events: none;
    }

    .ait-backdrop {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.08);
      pointer-events: auto;
    }

    .ait-panel {
      position: absolute;
      width: 420px;
      max-width: calc(100vw - 40px);
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 8px 30px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06);
      pointer-events: auto;
      overflow: hidden;
      animation: aitPanelIn 0.15s ease-out;
    }

    .ait-panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-bottom: 1px solid #eee;
      background: #fafbfc;
      cursor: grab;
      user-select: none;
    }
    .ait-panel-header:active {
      cursor: grabbing;
    }

    .ait-panel-title {
      font-size: 14px;
      font-weight: 600;
      color: #333;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .ait-panel-close {
      width: 28px; height: 28px;
      border: none; background: transparent;
      cursor: pointer; border-radius: 6px;
      font-size: 16px; color: #999;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .ait-panel-close:hover { background: #f0f0f0; color: #666; }

    .ait-result-area {
      padding: 16px;
      max-height: 300px;
      overflow-y: auto;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
      word-break: break-word;
    }

    .ait-result-area:empty::before {
      content: '';
    }

    .ait-loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 40px;
      color: #999;
    }

    .ait-spinner {
      width: 24px; height: 24px;
      border: 3px solid #eee;
      border-top-color: #667eea;
      border-radius: 50%;
      animation: aitSpin 0.8s linear infinite;
      margin-right: 10px;
    }

    .ait-error {
      color: #e53e3e;
      padding: 16px;
      text-align: center;
    }

    .ait-footer {
      padding: 10px 16px;
      border-top: 1px solid #eee;
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .ait-followup-input {
      flex: 1;
      border: 1px solid #ddd;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
      font-family: inherit;
      resize: none;
      min-height: 36px;
      max-height: 80px;
    }
    .ait-followup-input:focus { border-color: #667eea; }
    .ait-followup-input:disabled {
      background: #f5f5f5;
      color: #aaa;
      cursor: not-allowed;
    }

    .ait-send-btn {
      width: 36px; height: 36px;
      border: none; background: #667eea;
      border-radius: 8px; cursor: pointer;
      color: #fff; font-size: 16px;
      display: flex; align-items: center; justify-content: center;
      transition: all 0.2s;
    }
    .ait-send-btn:hover { background: #5a6fd6; }
    .ait-send-btn:disabled { background: #ccc; cursor: not-allowed; }

    .ait-actions-bar {
      display: flex;
      gap: 6px;
      padding: 8px 16px;
      border-top: 1px solid #eee;
      background: #fafbfc;
    }

    .ait-action-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      color: #666;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .ait-action-btn:hover { background: #f0f2f5; color: #667eea; }

    .ait-cancel-btn {
      border: none;
      background: transparent;
      cursor: pointer;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 13px;
      color: #999;
      transition: all 0.2s;
    }
    .ait-cancel-btn:hover { background: #fee; color: #e53e3e; }

    /* Markdown-lite styles */
    .ait-para { margin: 0 0 8px; }
    .ait-heading { margin: 12px 0 6px; font-size: 15px; font-weight: 600; color: #333; }
    .ait-li { margin: 4px 0; padding-left: 20px; position: relative; }
    .ait-li::before { content: '•'; position: absolute; left: 4px; color: #667eea; }
    .ait-li-ordered::before { content: ''; }
    .ait-code-block {
      background: #1e1e1e;
      color: #d4d4d4;
      padding: 12px;
      border-radius: 8px;
      overflow-x: auto;
      margin: 8px 0;
      position: relative;
    }
    .ait-code-lang {
      position: absolute;
      top: 6px; right: 10px;
      background: #333;
      color: #aaa;
      font-size: 11px;
      padding: 2px 8px;
      border-radius: 4px;
    }
    .ait-code-block code { font-family: 'Menlo', 'Consolas', monospace; font-size: 13px; }
    .ait-inline-code {
      background: #f0f2f5;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Menlo', 'Consolas', monospace;
      font-size: 13px;
    }

    .ait-copied-feedback {
      position: absolute;
      background: #667eea;
      color: #fff;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 12px;
      animation: aitFadeOut 2s forwards;
    }

    @keyframes aitPanelIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes aitSpin {
      to { transform: rotate(360deg); }
    }
    @keyframes aitFadeOut {
      0%, 70% { opacity: 1; }
      100% { opacity: 0; }
    }
  `;

  class AIToolbarPanel {
    constructor(onCloseCallback) {
      // State machine
      this.state = 'idle'; // idle | loading | streaming | done
      this.rawText = ''; // raw LLM response text (for copy)
      this.currentAction = null;
      this.currentSelection = null;
      this.onCloseCallback = onCloseCallback || null;

      // Create host + shadow DOM
      this.hostEl = document.createElement('div');
      this.hostEl.className = 'ait-host-wrapper';
      document.body.appendChild(this.hostEl);

      this.shadowRoot = this.hostEl.attachShadow({ mode: 'open' });

      // Inject styles
      const styleEl = document.createElement('style');
      styleEl.textContent = PANEL_STYLES;
      this.shadowRoot.appendChild(styleEl);

      // Host overlay (always present but hidden)
      this.hostOverlay = document.createElement('div');
      this.hostOverlay.className = 'ait-host';
      this.hostOverlay.style.display = 'none';
      this.shadowRoot.appendChild(this.hostOverlay);

      // Build panel DOM
      this.panel = this._buildPanelDOM();
      this.hostOverlay.appendChild(this._buildBackdrop());
      this.hostOverlay.appendChild(this.panel);

      // Esc key capture in shadow
      this.shadowRoot.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.state !== 'idle') {
          e.preventDefault();
          e.stopPropagation();
          this.close();
        }
      }, true);

      // 拖动支持 — header 区域拖动面板
      this._initDrag();
    }

    _buildBackdrop() {
      const backdrop = document.createElement('div');
      backdrop.className = 'ait-backdrop';
      // 不点击 backdrop 关闭面板，只能通过 X 按钮或 Esc 关闭
      // backdrop 仅用于遮挡页面防止误操作
      return backdrop;
    }

    _initDrag() {
      this._dragState = { active: false, startX: 0, startY: 0, panelX: 0, panelY: 0 };

      this.headerEl.addEventListener('mousedown', (e) => {
        // 点击关闭按钮时不触发拖动
        if (e.target.closest('.ait-panel-close')) return;

        this._dragState.active = true;
        this._dragState.startX = e.clientX;
        this._dragState.startY = e.clientY;

        const rect = this.panel.getBoundingClientRect();
        this._dragState.panelX = rect.left;
        this._dragState.panelY = rect.top;

        e.preventDefault();
      });

      this.shadowRoot.addEventListener('mousemove', (e) => {
        if (!this._dragState.active) return;

        const dx = e.clientX - this._dragState.startX;
        const dy = e.clientY - this._dragState.startY;

        const newX = this._dragState.panelX + dx;
        const newY = this._dragState.panelY + dy;

        // 限制在视口范围内
        const maxX = window.innerWidth - 50;
        const maxY = window.innerHeight - 50;
        this.panel.style.left = `${Math.max(-370, Math.min(maxX, newX))}px`;
        this.panel.style.top = `${Math.max(0, Math.min(maxY, newY))}px`;
      });

      this.shadowRoot.addEventListener('mouseup', () => {
        this._dragState.active = false;
      });
    }

    _buildPanelDOM() {
      const panel = document.createElement('div');
      panel.className = 'ait-panel';
      panel.style.display = 'none';

      // Header
      this.headerEl = document.createElement('div');
      this.headerEl.className = 'ait-panel-header';
      this.titleEl = document.createElement('div');
      this.titleEl.className = 'ait-panel-title';
      this.closeBtn = document.createElement('button');
      this.closeBtn.className = 'ait-panel-close';
      this.closeBtn.textContent = '✕';
      this.closeBtn.addEventListener('click', () => this.close());
      this.headerEl.appendChild(this.titleEl);
      this.headerEl.appendChild(this.closeBtn);
      panel.appendChild(this.headerEl);

      // Result area (shown in streaming/done)
      this.resultArea = document.createElement('div');
      this.resultArea.className = 'ait-result-area';
      this.resultArea.style.display = 'none';
      panel.appendChild(this.resultArea);

      // Loading indicator
      this.loadingEl = document.createElement('div');
      this.loadingEl.className = 'ait-loading';
      this.loadingEl.style.display = 'none';
      this.spinnerEl = document.createElement('div');
      this.spinnerEl.className = 'ait-spinner';
      this.loadingLabelEl = document.createElement('span');
      this.loadingLabelEl.textContent = 'AI 正在思考...';
      this.loadingEl.appendChild(this.spinnerEl);
      this.loadingEl.appendChild(this.loadingLabelEl);
      panel.appendChild(this.loadingEl);

      // Error area
      this.errorEl = document.createElement('div');
      this.errorEl.className = 'ait-error';
      this.errorEl.style.display = 'none';
      panel.appendChild(this.errorEl);

      // Cancel button (during loading/streaming)
      this.cancelBar = document.createElement('div');
      this.cancelBar.className = 'ait-actions-bar';
      this.cancelBar.style.display = 'none';
      this.cancelBtn = document.createElement('button');
      this.cancelBtn.className = 'ait-cancel-btn';
      this.cancelBtn.textContent = '取消';
      this.cancelBtn.addEventListener('click', () => this._cancelRequest());
      this.cancelBar.appendChild(this.cancelBtn);
      panel.appendChild(this.cancelBar);

      // Done actions bar (copy, 朗读, close)
      this.doneBar = document.createElement('div');
      this.doneBar.className = 'ait-actions-bar';
      this.doneBar.style.display = 'none';

      this.copyBtn = document.createElement('button');
      this.copyBtn.className = 'ait-action-btn';
      this.copyBtn.textContent = '📋 复制';
      this.copyBtn.addEventListener('click', () => this._copyResult());

      this.readAloudBtn = document.createElement('button');
      this.readAloudBtn.className = 'ait-action-btn';
      this.readAloudBtn.textContent = '🔊 朗读';
      this.readAloudBtn.addEventListener('click', () => this._readAloudResult());

      this.doneBar.appendChild(this.copyBtn);
      this.doneBar.appendChild(this.readAloudBtn);
      panel.appendChild(this.doneBar);

      // Follow-up input
      this.footerEl = document.createElement('div');
      this.footerEl.className = 'ait-footer';
      this.footerEl.style.display = 'none';
      this.followupInput = document.createElement('textarea');
      this.followupInput.className = 'ait-followup-input';
      this.followupInput.placeholder = '继续追问...';
      this.followupInput.rows = 1;
      this.followupInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          this._submitFollowup();
        }
      });
      this.sendBtn = document.createElement('button');
      this.sendBtn.className = 'ait-send-btn';
      this.sendBtn.textContent = '➤';
      this.sendBtn.addEventListener('click', () => this._submitFollowup());
      this.footerEl.appendChild(this.followupInput);
      this.footerEl.appendChild(this.sendBtn);
      panel.appendChild(this.footerEl);

      return panel;
    }

    // ----- State transitions -----

    open(actionConfig, selection, adapter, ttsAdapter, settings) {
      this.currentAction = actionConfig;
      this.currentSelection = selection;
      this.adapter = adapter;
      this.ttsAdapter = ttsAdapter;
      this.settings = settings;
      this.rawText = '';

      // Set title
      this.titleEl.innerHTML = `${actionConfig.icon || '🤖'} ${actionConfig.title || 'AI'}`;

      // Position panel
      this._positionPanel(selection.range);

      // Show overlay and panel
      this.hostOverlay.style.display = '';
      this.panel.style.display = '';

      // Transition to loading
      this._setState('loading');

      // Start LLM chat
      const systemPrompt = renderPromptTemplate(
        actionConfig.promptTemplate || '',
        selection.text,
        settings.translation_targetLang || 'zh'
      );

      adapter.chatStreamToPanel(
        systemPrompt,
        selection.text,
        (content) => {
          if (this.state === 'loading') this._setState('streaming');
          this._appendContent(content);
        },
        () => {
          this._setState('done');
        },
        (error) => {
          this._showError(error);
        }
      );
    }

    close() {
      if (this.adapter) this.adapter.abort();
      if (this.ttsAdapter && this.ttsAdapter.speaking) this.ttsAdapter.stop();
      this._setState('idle');
      this.hostOverlay.style.display = 'none';
      this.panel.style.display = 'none';
      this.rawText = '';
      this.resultArea.innerHTML = '';
      this.adapter?.reset();
      // 通知外部：面板已关闭，可恢复工具栏
      if (this.onCloseCallback) this.onCloseCallback();
    }

    _setState(newState) {
      this.state = newState;

      // Loading state
      this.loadingEl.style.display = newState === 'loading' ? '' : 'none';
      this.cancelBar.style.display = (newState === 'loading' || newState === 'streaming') ? '' : 'none';

      // Streaming state
      this.resultArea.style.display = (newState === 'streaming' || newState === 'done') ? '' : 'none';

      // Done state
      this.doneBar.style.display = newState === 'done' ? '' : 'none';
      this.footerEl.style.display = newState === 'done' ? '' : 'none';

      // Input disabled states
      this.followupInput.disabled = newState !== 'done';
      this.sendBtn.disabled = newState !== 'done';

      // Error hidden by default
      this.errorEl.style.display = 'none';
    }

    _appendContent(content) {
      this.rawText += content;
      this.resultArea.innerHTML = renderMarkdownLite(this.rawText);
      // Auto-scroll to bottom
      this.resultArea.scrollTop = this.resultArea.scrollHeight;
    }

    _showError(message) {
      this.state = 'done';
      this.loadingEl.style.display = 'none';
      this.cancelBar.style.display = 'none';
      this.resultArea.style.display = 'none';
      this.errorEl.textContent = message;
      this.errorEl.style.display = '';
      this.doneBar.style.display = 'none';
      this.footerEl.style.display = 'none';
    }

    _cancelRequest() {
      this.adapter.abort();
      // Keep whatever text we have, transition to done
      this._setState('done');
    }

    _copyResult() {
      const text = this.rawText;
      if (!text) return;

      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
          this._showCopiedFeedback();
        }).catch(() => {
          this._fallbackCopy(text);
        });
      } else {
        this._fallbackCopy(text);
      }
    }

    _fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        this._showCopiedFeedback();
      } catch (e) {
        // ignore
      }
      document.body.removeChild(textarea);
    }

    _showCopiedFeedback() {
      this.copyBtn.textContent = '✓ 已复制';
      setTimeout(() => {
        this.copyBtn.textContent = '📋 复制';
      }, 2000);
    }

    _readAloudResult() {
      if (!this.ttsAdapter) return;
      if (this.ttsAdapter.speaking) {
        this.ttsAdapter.stop();
        this.readAloudBtn.textContent = '🔊 朗读';
        return;
      }

      this.ttsAdapter.speak(cleanTextForTTS(this.rawText));
      this.readAloudBtn.textContent = '🔇 停止';
      this.ttsAdapter.setOnSpeechEnd(() => {
        this.readAloudBtn.textContent = '🔊 朗读';
      });
    }

    _submitFollowup() {
      const text = this.followupInput.value.trim();
      if (!text) return;

      this.followupInput.value = '';
      // 清空旧结果，追问只显示最新回复
      this.rawText = '';
      this.resultArea.innerHTML = '';
      this._setState('loading');
      this.loadingLabelEl.textContent = 'AI 正在回复...';

      // Send follow-up via same conversation
      this.adapter.chatStreamToPanel(
        null, // reuse existing conversation, don't recreate
        text,
        (content) => {
          if (this.state === 'loading') this._setState('streaming');
          this._appendContent(content);
        },
        () => {
          this._setState('done');
          this.loadingLabelEl.textContent = 'AI 正在思考...';
        },
        (error) => {
          this._showError(error);
          this.loadingLabelEl.textContent = 'AI 正在思考...';
        }
      );
    }

    // ----- 2.4 面板定位算法 -----

    _positionPanel(range) {
      if (!range) return;

      const rect = range.getBoundingClientRect();
      const viewportW = window.innerWidth;
      const viewportH = window.innerHeight;
      const scrollX = window.scrollX;
      const scrollY = window.scrollY;

      const panelW = 420;
      const panelH = 400; // estimated

      // Horizontal: center on selection
      let x = rect.left + rect.width / 2 - panelW / 2;
      if (x < 10) x = 10;
      if (x + panelW > viewportW - 10) x = viewportW - panelW - 10;

      // Vertical: prefer below selection, flip above if no space
      const spaceBelow = viewportH - rect.bottom;
      let y;
      if (spaceBelow >= panelH + 10) {
        y = rect.bottom + 10;
      } else {
        y = Math.max(10, rect.top - panelH - 10);
      }

      this.panel.style.left = `${x}px`;
      this.panel.style.top = `${y}px`;
    }
  }

  // ============================================================
  // 1.2 + 5. 预设按钮 + 8. 自定义动作 — 主入口
  // ============================================================

  class AISelectionToolbar {
    constructor() {
      this.settings = loadSettings();
      this.adapter = isCatAPIAvailable() ? new CatAPIAdapter() : null;
      this.ttsAdapter = createTTSAdapter(this.settings);
      this.panel = new AIToolbarPanel(() => this._onPanelClose());
      this.toolbar = new TextSelectionToolbar({ zIndex: 10001, showTitle: this.settings.toolbarShowTitle ?? true });

      if (!this.adapter) {
        console.error('[AI Selection Toolbar] CatAPI 不可用，请检查 @grant 和 ScriptCat 版本');
        // Still register non-AI buttons
      }

      this._registerActions();
    }

    _registerActions() {
      const actions = this.settings.actions
        .filter(a => a.enabled)
        .sort((a, b) => a.order - b.order);

      for (const action of actions) {
        this._registerAction(action);
      }
    }

    _registerAction(actionConfig) {
      const showTitle = this.settings.toolbarShowTitle ?? true;

      switch (actionConfig.type) {
        case 'chat':
          this.toolbar.registerButton({
            id: actionConfig.id,
            icon: actionConfig.icon,
            title: actionConfig.title,
            showTitle: showTitle,
            action: (selection) => this._handleChatAction(actionConfig, selection),
          });
          break;
        case 'local':
          if (actionConfig.id === 'copy') {
            this.toolbar.registerButton({
              id: 'copy',
              icon: '📋',
              title: '复制',
              showTitle: showTitle,
              action: (selection) => this._handleCopyAction(selection),
            });
          } else if (actionConfig.id === 'read-aloud') {
            this.toolbar.registerButton({
              id: 'read-aloud',
              icon: '🔊',
              title: '朗读',
              showTitle: showTitle,
              action: (selection) => this._handleReadAloudAction(selection),
            });
          } else if (actionConfig.callback) {
            this.toolbar.registerButton({
              id: actionConfig.id,
              icon: actionConfig.icon,
              title: actionConfig.title,
              showTitle: showTitle,
              action: actionConfig.callback,
            });
          }
          break;
      }
    }

    _handleChatAction(actionConfig, selection) {
      if (!this.adapter) {
        console.warn('[AI Selection Toolbar] CatAPI 不可用，无法发起 AI 对话');
        return;
      }

      // 隐藏选择工具栏，面板打开期间不需要工具栏
      this.toolbar.hide();
      this.panel.open(actionConfig, selection, this.adapter, this.ttsAdapter, this.settings);
    }

    _handleCopyAction(selection) {
      const text = selection.text;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).catch(() => {
          this._fallbackCopy(text);
        });
      } else {
        this._fallbackCopy(text);
      }
    }

    _fallbackCopy(text) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    _handleReadAloudAction(selection) {
      if (!this.ttsAdapter) return;
      this.ttsAdapter.speak(cleanTextForTTS(selection.text));
    }

    // 面板关闭后恢复工具栏（如果选区仍然存在）
    _onPanelClose() {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed && selection.toString().trim()) {
        this.toolbar.show();
      }
    }

    // 7.6 配置变更生效
    refresh() {
      this.settings = loadSettings();
      this.ttsAdapter = createTTSAdapter(this.settings);
      this.toolbar.clearButtons();
      this._registerActions();
    }
  }

  // ============================================================
  // Initialize
  // ============================================================

  // Wait for DOM ready
  let aiToolbar;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      aiToolbar = new AISelectionToolbar();
      window.__aiSelectionToolbar = aiToolbar;
    });
  } else {
    aiToolbar = new AISelectionToolbar();
    window.__aiSelectionToolbar = aiToolbar;
  }
})();
