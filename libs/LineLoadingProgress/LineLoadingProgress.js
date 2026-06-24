/**
 * LineLoadingProgress - 页面顶部加载进度条组件库
 *
 * 功能特性:
 * - 页面顶部固定细线进度条，模拟 NProgress / YouTube 加载条效果
 * - 支持增量式递进、手动设置进度值、自动完成
 * - 可配置颜色、高度、z-index、动画速度等
 * - 零依赖，UMD 模块，支持脚本猫 / <script> / Node.js / AMD
 *
 * @version 1.0.0
 * @author wuxia
 * @license MIT
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.LineLoadingProgress = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function () {

  // ─── 默认配置 ───────────────────────────────────────

  var DEFAULT_OPTIONS = {
    color: '#35a935',          // 进度条颜色
    height: '2px',             // 进度条高度
    zIndex: 1000,              // z-index
    trickle: true,             // 是否自动 trickle（增量递进）
    trickleSpeed: 400,         // trickle 间隔(ms)
    trickleSize: 0.02,         // 每次 trickle 增量
    minimum: 0.08,             // 最小进度值（避免 0% 看不到）
    maximum: 1.0,              // 最大进度值
    speed: 300,                // 进度变化动画时长(ms)
    easing: 'ease',            // CSS easing 函数
    parentId: 'wx_process',    // 进度条 DOM id
    showSpinner: false,        // 是否显示右上角旋转 spinner
    spinnerColor: '#35a935',   // spinner 颜色
  };

  // ─── 状态 ───────────────────────────────────────

  var CSS_RULES_TEMPLATE = [
    'position: fixed',
    'left: 0',
    'top: 0',
    'z-index: {{zIndex}}',
    'width: 100%',
    'height: {{height}}',
    '-webkit-appearance: none',
    '-moz-appearance: none',
    'appearance: none',
    'border: none',
    'background-color: transparent',
    'color: {{color}}',
    'transition: width {{speed}}ms {{easing}}',
    'pointer-events: none',
  ];

  var SPINNER_CSS = [
    'position: fixed',
    'top: 15px',
    'right: 15px',
    'z-index: {{zIndex}}',
    'width: 18px',
    'height: 18px',
    'border: 2px solid {{spinnerColor}}',
    'border-radius: 50%',
    'border-top-color: transparent',
    'animation: wx-spinner-rotate 400ms linear infinite',
    'pointer-events: none',
  ];

  // ─── LineLoadingProgress 类 ───────────────────────────────────────

  /**
   * 页面顶部加载进度条组件
   *
   * @param {Object} [options] - 配置选项，详见 DEFAULT_OPTIONS
   */
  function LineLoadingProgress(options) {
    this.options = mergeOptions(DEFAULT_OPTIONS, options || {});
    this.status = null;       // 当前进度值（null = 未开始）
    this._trickleTimer = null;
    this._styleEl = null;
    this._spinnerEl = null;
    this._progressEl = null;
  }

  // ─── 公开方法 ───────────────────────────────────────

  /**
   * 启动进度条（从 minimum 开始）
   * @returns {LineLoadingProgress} this（支持链式调用）
   */
  LineLoadingProgress.prototype.start = function () {
    if (this.status !== null) return this;
    this.status = this.options.minimum;
    this._ensureDOM();
    this._setProgress(this.status);
    if (this.options.trickle) this._startTrickle();
    return this;
  };

  /**
   * 递增进度（指定增量）
   * @param {number} [amount] - 递增量，默认 trickleSize
   * @returns {LineLoadingProgress} this
   */
  LineLoadingProgress.prototype.inc = function (amount) {
    if (this.status === null) return this.start();
    if (this.status >= this.options.maximum) return this;

    if (typeof amount !== 'number') {
      amount = this.options.trickleSize;
      // 进度越大，增量越小（模拟真实加载体验）
      if (this.status > 0.5) {
        amount = Math.random() * 0.03;
      } else if (this.status > 0.3) {
        amount = this.options.trickleSize * 0.5;
      }
    }

    this.status = clamp(this.status + amount, 0, this.options.maximum);
    this._setProgress(this.status);
    return this;
  };

  /**
   * 手动设置进度值
   * @param {number} n - 进度值 (0 ~ maximum)
   * @returns {LineLoadingProgress} this
   */
  LineLoadingProgress.prototype.set = function (n) {
    this.status = clamp(n, this.options.minimum, this.options.maximum);
    this._ensureDOM();
    this._setProgress(this.status);
    return this;
  };

  /**
   * 标记完成：快速推进到 100% 后淡出消失
   * @returns {LineLoadingProgress} this
   */
  LineLoadingProgress.prototype.done = function () {
    if (this.status === null) return this;

    this.inc(0.3 + 0.5 * Math.random());
    this.status = this.options.maximum;
    this._setProgress(this.status);

    this._stopTrickle();

    // 淡出并移除
    var self = this;
    setTimeout(function () {
      self._fadeOut(function () {
        self.status = null;
        self._removeDOM();
      });
    }, this.options.speed);

    return this;
  };

  /**
   * 隐藏进度条（不完成，直接隐藏）
   * @returns {LineLoadingProgress} this
   */
  LineLoadingProgress.prototype.hide = function () {
    this._stopTrickle();
    this.status = null;
    this._removeDOM();
    return this;
  };

  /**
   * 获取当前进度值
   * @returns {number|null} 当前进度值，null 表示未开始
   */
  LineLoadingProgress.prototype.getProgress = function () {
    return this.status;
  };

  /**
   * 更新配置选项
   * @param {Object} newOptions - 需更新的配置项
   * @returns {LineLoadingProgress} this
   */
  LineLoadingProgress.prototype.configure = function (newOptions) {
    mergeOptions(this.options, newOptions);
    this._updateStyle();
    return this;
  };

  /**
   * 销毁实例，移除所有 DOM 和事件
   * @returns {LineLoadingProgress} this
   */
  LineLoadingProgress.prototype.destroy = function () {
    this._stopTrickle();
    this.status = null;
    this._removeDOM();
    this._removeStyle();
    return this;
  };

  // ─── 内部方法 ───────────────────────────────────────

  /** 确保 DOM 元素存在 */
  LineLoadingProgress.prototype._ensureDOM = function () {
    if (!this._styleEl) this._createStyle();
    if (!this._progressEl) this._createProgress();
    if (this.options.showSpinner && !this._spinnerEl) this._createSpinner();
  };

  /** 创建 <style> 元素 */
  LineLoadingProgress.prototype._createStyle = function () {
    var css = this._buildCSS();
    // spinner 动画 keyframes
    if (this.options.showSpinner) {
      css += '@keyframes wx-spinner-rotate { to { transform: rotate(360deg); } }';
    }
    var el = document.createElement('style');
    el.type = 'text/css';
    el.textContent = css;
    document.head.appendChild(el);
    this._styleEl = el;
  };

  /** 更新样式 */
  LineLoadingProgress.prototype._updateStyle = function () {
    if (this._styleEl) {
      this._styleEl.textContent = this._buildCSS();
      if (this.options.showSpinner) {
        this._styleEl.textContent += '@keyframes wx-spinner-rotate { to { transform: rotate(360deg); } }';
      }
    }
    if (this._progressEl) {
      this._progressEl.id = this.options.parentId;
    }
    if (this.options.showSpinner && this.status !== null) {
      this._createSpinner();
    } else if (this._spinnerEl) {
      this._spinnerEl.remove();
      this._spinnerEl = null;
    }
  };

  /** 构建 CSS 字符串 */
  LineLoadingProgress.prototype._buildCSS = function () {
    var opts = this.options;
    var progressRules = CSS_RULES_TEMPLATE.map(function (rule) {
      return rule
        .replace('{{zIndex}}', opts.zIndex)
        .replace('{{height}}', opts.height)
        .replace('{{color}}', opts.color)
        .replace('{{speed}}', opts.speed)
        .replace('{{easing}}', opts.easing);
    }).join('; ');

    var css = '#' + opts.parentId + ' { ' + progressRules + ' }\n';
    css += '#' + opts.parentId + '::-webkit-progress-bar { background-color: transparent; }\n';
    css += '#' + opts.parentId + '::-webkit-progress-value { background-color: ' + opts.color + '; transition: width ' + opts.speed + 'ms ' + opts.easing + '; }\n';
    css += '#' + opts.parentId + '::-moz-progress-bar { background-color: ' + opts.color + '; }\n';

    if (opts.showSpinner) {
      var spinnerId = opts.parentId + '-spinner';
      var spinnerRules = SPINNER_CSS.map(function (rule) {
        return rule
          .replace('{{zIndex}}', opts.zIndex)
          .replace('{{spinnerColor}}', opts.spinnerColor);
      }).join('; ');
      css += '#' + spinnerId + ' { ' + spinnerRules + ' }\n';
    }

    return css;
  };

  /** 创建 <progress> 元素 */
  LineLoadingProgress.prototype._createProgress = function () {
    var el = document.createElement('progress');
    el.id = this.options.parentId;
    el.max = 1;
    el.value = 0;
    document.body.appendChild(el);
    this._progressEl = el;
  };

  /** 创建 spinner 元素 */
  LineLoadingProgress.prototype._createSpinner = function () {
    if (this._spinnerEl) return;
    var el = document.createElement('div');
    el.id = this.options.parentId + '-spinner';
    document.body.appendChild(el);
    this._spinnerEl = el;
  };

  /** 设置进度值到 DOM */
  LineLoadingProgress.prototype._setProgress = function (n) {
    if (!this._progressEl) return;
    this._progressEl.value = n;
  };

  /** 淡出进度条 */
  LineLoadingProgress.prototype._fadeOut = function (callback) {
    if (!this._progressEl) { callback(); return; }
    var el = this._progressEl;
    el.style.opacity = '1';
    el.style.transition = 'opacity ' + this.options.speed + 'ms ' + this.options.easing;

    // 强制重排触发 transition
    void el.offsetWidth;
    el.style.opacity = '0';

    setTimeout(callback, this.options.speed);
  };

  /** 启动 trickle 定时器 */
  LineLoadingProgress.prototype._startTrickle = function () {
    this._stopTrickle();
    var self = this;
    this._trickleTimer = setInterval(function () {
      self.inc();
    }, this.options.trickleSpeed);
  };

  /** 停止 trickle 定时器 */
  LineLoadingProgress.prototype._stopTrickle = function () {
    if (this._trickleTimer) {
      clearInterval(this._trickleTimer);
      this._trickleTimer = null;
    }
  };

  /** 移除进度条和 spinner DOM */
  LineLoadingProgress.prototype._removeDOM = function () {
    if (this._progressEl) {
      this._progressEl.remove();
      this._progressEl = null;
    }
    if (this._spinnerEl) {
      this._spinnerEl.remove();
      this._spinnerEl = null;
    }
  };

  /** 移除样式 DOM */
  LineLoadingProgress.prototype._removeStyle = function () {
    if (this._styleEl) {
      this._styleEl.remove();
      this._styleEl = null;
    }
  };

  // ─── 工具函数 ───────────────────────────────────────

  function clamp(n, min, max) {
    if (n < min) return min;
    if (n > max) return max;
    return n;
  }

  function mergeOptions(target, source) {
    for (var key in source) {
      if (source[key] !== undefined) {
        target[key] = source[key];
      }
    }
    return target;
  }

  // ─── 导出 ───────────────────────────────────────

  return LineLoadingProgress;
});
