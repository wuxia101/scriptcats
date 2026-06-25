/**
 * TextSelectionToolbar - 文本选择工具栏组件
 * 
 * 功能特性:
 * - 选中文本后自动显示工具栏
 * - 支持注册自定义按钮（图标、标题、回调函数）
 * - 支持按钮组和分隔线
 * - 智能定位（避免超出视口）
 * - 支持事件监听
 * - 完美销毁，不污染 DOM
 * 
 * @version 1.0.2
 * @author ScriptCat
 */

class TextSelectionToolbar {
  static instanceCount = 0;

  constructor(options = {}) {
    // 生成唯一 ID
    this.id = `text-toolbar-${++TextSelectionToolbar.instanceCount}`;
    
    // 配置
    this.options = {
      container: null,           // 监听文本选择的容器，默认整个文档
      maxButtons: 10,            // 最大按钮数
      showDelay: 100,            // 显示延迟（毫秒）
      hideDelay: 300,            // 隐藏延迟（毫秒）
      offsetX: 0,                // 水平偏移
      offsetY: 10,               // 垂直偏移（相对于选区）
      zIndex: 10000,             // 层级
      showTitle: false,          // 全局默认：是否在按钮上显示 title 文字
      ...options
    };

    // 状态
    this.buttons = [];
    this.isVisible = false;
    this.currentSelection = null;
    this.showTimer = null;
    this.hideTimer = null;

    // 事件处理函数存储
    this.eventListeners = {};

    // 创建工具栏 DOM
    this._createToolbar();
    
    // 绑定事件
    this._bindEvents();
  }

  /**
   * 创建工具栏 DOM 结构
   */
  _createToolbar() {
    // 创建容器
    this.toolbar = document.createElement('div');
    this.toolbar.className = 'text-toolbar';
    this.toolbar.id = this.id;
    this.toolbar.style.cssText = `
      position: absolute;
      display: none;
      background: #fff;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05);
      padding: 6px;
      z-index: ${this.options.zIndex};
      font-size: 14px;
    `;

    // 创建按钮容器
    this.buttonContainer = document.createElement('div');
    this.buttonContainer.style.cssText = 'display: flex; align-items: center;';
    this.toolbar.appendChild(this.buttonContainer);

    // 添加到页面
    document.body.appendChild(this.toolbar);

    // 添加显示动画样式（如果还没有）
    this._injectStyles();
  }

  /**
   * 注入必要的样式
   */
  _injectStyles() {
    if (document.getElementById('text-toolbar-styles')) return;

    const style = document.createElement('style');
    style.id = 'text-toolbar-styles';
    style.textContent = `
      .text-toolbar {
        animation: toolbarFadeIn 0.15s ease-out;
      }
      .text-toolbar::before {
        content: '';
        position: absolute;
        top: -6px;
        left: 50%;
        transform: translateX(-50%);
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-bottom: 6px solid #fff;
        filter: drop-shadow(0 -2px 2px rgba(0,0,0,0.05));
      }
      .text-toolbar.align-bottom::before {
        top: auto;
        bottom: -6px;
        border-bottom: none;
        border-top: 6px solid #fff;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.05));
      }
      .text-toolbar-btn {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 36px;
        height: 36px;
        padding: 0 10px;
        margin: 2px;
        border: none;
        background: transparent;
        border-radius: 6px;
        cursor: pointer;
        color: #555;
        font-size: 14px;
        transition: all 0.2s ease;
        font-family: inherit;
        white-space: nowrap;
      }
      .text-toolbar-btn:hover {
        background: #f0f2f5;
        color: #667eea;
      }
      .text-toolbar-btn:active {
        background: #e8eaff;
        transform: scale(0.95);
      }
      .text-toolbar-btn svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .text-toolbar-btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .text-toolbar-btn-icon svg {
        width: 18px;
        height: 18px;
        fill: currentColor;
      }
      .text-toolbar-btn-with-title {
        gap: 4px;
        padding: 0 12px;
      }
      .text-toolbar-btn-title {
        font-size: 13px;
        line-height: 1;
        margin-left: 2px;
      }
      .text-toolbar-divider {
        width: 1px;
        height: 24px;
        background: #e5e7eb;
        margin: 6px 4px;
      }
      @keyframes toolbarFadeIn {
        from {
          opacity: 0;
          transform: translateY(5px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * 绑定事件监听
   */
  _bindEvents() {
    // 获取监听区域
    this.listenTarget = this.options.container 
      ? document.querySelector(this.options.container)
      : document.body;

    // 鼠标释放事件 - 显示工具栏
    document.addEventListener('mouseup', this._handleMouseUp.bind(this));
    
    // 点击工具栏按钮
    this.toolbar.addEventListener('click', this._handleToolbarClick.bind(this));
    
    // 鼠标按下时延迟隐藏
    document.addEventListener('mousedown', this._handleMouseDown.bind(this));
    
    // 滚动时隐藏
    document.addEventListener('scroll', this._handleScroll.bind(this), true);
    
    // 选择变化时更新位置
    document.addEventListener('selectionchange', this._handleSelectionChange.bind(this));
    
    // 键盘事件
    document.addEventListener('keydown', this._handleKeyDown.bind(this));
  }

  /**
   * 鼠标释放 - 获取选中文本
   */
  _handleMouseUp(e) {
    // 清除隐藏定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // 延迟显示，等待选区稳定
    this.showTimer = setTimeout(() => {
      const selection = window.getSelection();
      
      // 检查是否有选中文本
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        this._hide();
        return;
      }

      const text = selection.toString().trim();
      
      // 检查选中的文本是否在监听区域内
      if (this.options.container) {
        const range = selection.getRangeAt(0);
        if (!this._isSelectionInContainer(range)) {
          this._hide();
          return;
        }
      }

      if (!text) {
        this._hide();
        return;
      }

      // 保存当前选区信息
      this.currentSelection = {
        text: text,
        selection: selection,
        range: selection.getRangeAt(0).cloneRange()
      };

      // 显示工具栏
      this._show(e);
    }, this.options.showDelay);
  }

  /**
   * 检查选区是否在指定容器内
   */
  _isSelectionInContainer(range) {
    const container = this.listenTarget;
    if (!container) return true;

    // 如果容器就是 body 或者未设置，认为在监听范围内
    if (container === document.body) return true;

    // 检查起始节点是否在容器内
    let node = range.startContainer;
    while (node && node !== document) {
      if (node === container) return true;
      node = node.parentNode;
    }

    // 检查结束节点
    node = range.endContainer;
    while (node && node !== document) {
      if (node === container) return true;
      node = node.parentNode;
    }

    return false;
  }

  /**
   * 鼠标按下 - 准备隐藏
   */
  _handleMouseDown(e) {
    // 如果点击的是工具栏本身，不隐藏
    if (e.target.closest('.text-toolbar')) {
      return;
    }

    // 延迟隐藏
    this.hideTimer = setTimeout(() => {
      this._hide();
    }, this.options.hideDelay);
  }

  /**
   * 处理滚动
   */
  _handleScroll() {
    if (this.isVisible) {
      this._hide();
    }
  }

  /**
   * 选择变化
   */
  _handleSelectionChange() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      this._hide();
    }
  }

  /**
   * 键盘事件
   */
  _handleKeyDown(e) {
    // ESC 键隐藏
    if (e.key === 'Escape' && this.isVisible) {
      this._hide();
      window.getSelection().removeAllRanges();
    }
  }

  /**
   * 显示工具栏
   */
  _show(e) {
    if (this.buttons.length === 0) return;

    // 计算位置
    const position = this._calculatePosition();
    
    if (!position) {
      this._hide();
      return;
    }

    // 设置位置
    this.toolbar.style.left = `${position.x}px`;
    this.toolbar.style.top = `${position.y}px`;
    
    // 设置对齐方向
    this.toolbar.classList.toggle('align-bottom', position.alignBottom);

    // 显示
    this.toolbar.style.display = 'block';
    this.isVisible = true;

    // 触发显示事件
    this._emit('show', this.currentSelection);
  }

  /**
   * 隐藏工具栏
   */
  _hide() {
    this.toolbar.style.display = 'none';
    this.isVisible = false;
    this.currentSelection = null;

    // 触发隐藏事件
    this._emit('hide');
  }

  /**
   * 计算工具栏位置
   */
  _calculatePosition() {
    if (!this.currentSelection) return null;

    const selection = this.currentSelection.selection;
    const range = this.currentSelection.range;

    // 获取选区边界坐标
    const rects = range.getClientRects();
    
    if (rects.length === 0) {
      // 单行或 collapsed selection
      const rect = range.getBoundingClientRect();
      if (rect.width === 0) return null;
      
      return this._positionFromRect(rect);
    }

    // 多行选择：使用第一个和最后一个矩形
    const firstRect = rects[0];
    const lastRect = rects[rects.length - 1];

    // 计算中心位置
    const centerX = (firstRect.left + lastRect.right) / 2;
    const topY = firstRect.top;
    const bottomY = lastRect.bottom;

    // 获取工具栏尺寸
    const toolbarRect = this.toolbar.getBoundingClientRect();
    const toolbarWidth = this._estimateToolbarWidth();
    const toolbarHeight = 48;

    // 视口尺寸
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    // 计算 x 位置（居中对齐）
    let x = centerX - toolbarWidth / 2 + scrollX;
    
    // 边界检查 - 水平
    if (x < 10) x = 10;
    if (x + toolbarWidth > viewportWidth - 10) {
      x = viewportWidth - toolbarWidth - 10;
    }

    // 判断应该显示在上面还是下面
    const spaceAbove = topY - scrollY;
    const spaceBelow = viewportHeight - (bottomY - scrollY);
    
    let y;
    let alignBottom = false;

    if (spaceBelow >= toolbarHeight + 10 || spaceBelow >= spaceAbove) {
      // 显示在下方
      y = bottomY + this.options.offsetY + scrollY;
    } else {
      // 显示在上方
      y = topY - toolbarHeight - this.options.offsetY + scrollY;
      alignBottom = true;
    }

    // 边界检查 - 垂直
    if (y < scrollY + 10) {
      y = scrollY + 10;
    }
    if (y + toolbarHeight > scrollY + viewportHeight - 10) {
      y = scrollY + viewportHeight - toolbarHeight - 10;
    }

    return { x, y, alignBottom };
  }

  /**
   * 从单个矩形计算位置
   */
  _positionFromRect(rect) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;

    const toolbarWidth = this._estimateToolbarWidth();
    const toolbarHeight = 48;

    // 居中定位
    let x = rect.left + rect.width / 2 - toolbarWidth / 2 + scrollX;
    let y = rect.bottom + this.options.offsetY + scrollY;

    // 边界检查
    if (x < 10) x = 10;
    if (x + toolbarWidth > viewportWidth - 10) {
      x = viewportWidth - toolbarWidth - 10;
    }

    // 检查下方空间是否足够
    const spaceBelow = viewportHeight - (rect.bottom - scrollY);
    if (spaceBelow < toolbarHeight + 10) {
      // 显示在上方
      y = rect.top - toolbarHeight - this.options.offsetY + scrollY;
    }

    return { x, y, alignBottom: false };
  }

  /**
   * 估算工具栏宽度（用于位置计算）
   */
  _estimateToolbarWidth() {
    const btnWidths = this.buttons.map(b => {
      if (b.showTitle && b.title) {
        return 46 + b.title.length * 10;
      }
      return 46;
    });
    return 12 + btnWidths.reduce((sum, w) => sum + w + 4, 0);
  }

  /**
   * 处理工具栏点击
   */
  _handleToolbarClick(e) {
    const btn = e.target.closest('.text-toolbar-btn');
    if (!btn) return;

    // 阻止默认行为和事件冒泡
    e.preventDefault();
    e.stopPropagation();

    // 清除隐藏定时器
    if (this.hideTimer) {
      clearTimeout(this.hideTimer);
      this.hideTimer = null;
    }

    // 获取按钮 ID
    const buttonId = btn.dataset.buttonId;
    const button = this.buttons.find(b => b.id === buttonId);

    if (button && button.action && this.currentSelection) {
      // 恢复选区
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(this.currentSelection.range);

      // 执行动作
      try {
        button.action(this.currentSelection);
        
        // 触发按钮点击事件
        this._emit('buttonClick', {
          button: button,
          selection: this.currentSelection,
          buttonId: buttonId
        });
      } catch (error) {
        console.error(`[TextSelectionToolbar] 按钮 "${buttonId}" 执行出错:`, error);
      }
    }
  }

  // ==================== 公共 API ====================

  /**
   * 注册按钮
   * @param {Object} config - 按钮配置
   * @param {string} config.id - 按钮唯一 ID
   * @param {string|HTMLElement} config.icon - 按钮图标（支持 SVG、emoji、HTML）
   * @param {string} config.title - 按钮标题（hover 时显示，showTitle 为 true 时在按钮内显示）
   * @param {boolean} config.showTitle - 是否在按钮上同时显示 title 文字，默认跟随全局 options.showTitle
   * @param {Function} config.action - 点击回调函数，参数为 {text, selection, range}
   */
  registerButton(config) {
    if (!config || !config.id) {
      console.warn('[TextSelectionToolbar] 按钮配置缺少 ID');
      return this;
    }

    const button = {
      id: config.id,
      icon: config.icon || '',
      title: config.title || config.id,
      showTitle: config.showTitle !== undefined ? config.showTitle : this.options.showTitle,
      action: config.action || (() => {})
    };

    this.buttons.push(button);
    this._renderButtons();
    
    return this;
  }

  /**
   * 注册多个按钮
   * @param {Array} configs - 按钮配置数组
   */
  registerButtonGroup(configs) {
    if (!Array.isArray(configs)) {
      console.warn('[TextSelectionToolbar] registerButtonGroup 需要数组参数');
      return this;
    }

    configs.forEach(config => {
      if (config.divider) {
        this.addDivider();
      } else {
        this.registerButton(config);
      }
    });

    return this;
  }

  /**
   * 添加分隔线
   */
  addDivider() {
    const divider = document.createElement('div');
    divider.className = 'text-toolbar-divider';
    divider.dataset.divider = 'true';
    this.buttonContainer.appendChild(divider);
    return this;
  }

  /**
   * 移除按钮
   * @param {string} buttonId - 按钮 ID
   */
  removeButton(buttonId) {
    const index = this.buttons.findIndex(b => b.id === buttonId);
    if (index !== -1) {
      this.buttons.splice(index, 1);
      this._renderButtons();
    }
    return this;
  }

  /**
   * 更新按钮
   * @param {string} buttonId - 按钮 ID
   * @param {Object} config - 新的配置
   */
  updateButton(buttonId, config) {
    const button = this.buttons.find(b => b.id === buttonId);
    if (button) {
      Object.assign(button, config);
      this._renderButtons();
    }
    return this;
  }

  /**
   * 获取按钮
   * @param {string} buttonId - 按钮 ID
   */
  getButton(buttonId) {
    return this.buttons.find(b => b.id === buttonId);
  }

  /**
   * 获取所有按钮
   */
  getAllButtons() {
    return [...this.buttons];
  }

  /**
   * 清空所有按钮
   */
  clearButtons() {
    this.buttons = [];
    this._renderButtons();
    return this;
  }

  /**
   * 显示工具栏
   */
  show() {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      this.currentSelection = {
        text: selection.toString().trim(),
        selection: selection,
        range: selection.getRangeAt(0).cloneRange()
      };
      this._show();
    }
    return this;
  }

  /**
   * 隐藏工具栏
   */
  hide() {
    this._hide();
    return this;
  }

  /**
   * 显示/隐藏切换
   */
  toggle() {
    if (this.isVisible) {
      this.hide();
    } else {
      this.show();
    }
    return this;
  }

  /**
   * 获取当前选中文本
   */
  getSelection() {
    return this.currentSelection ? {...this.currentSelection} : null;
  }

  /**
   * 监听事件
   * @param {string} event - 事件名 (show, hide, buttonClick)
   * @param {Function} callback - 回调函数
   */
  on(event, callback) {
    if (!this.eventListeners[event]) {
      this.eventListeners[event] = [];
    }
    this.eventListeners[event].push(callback);
    return this;
  }

  /**
   * 移除事件监听
   */
  off(event, callback) {
    if (this.eventListeners[event]) {
      const index = this.eventListeners[event].indexOf(callback);
      if (index !== -1) {
        this.eventListeners[event].splice(index, 1);
      }
    }
    return this;
  }

  /**
   * 触发事件
   */
  _emit(event, data) {
    if (this.eventListeners[event]) {
      this.eventListeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`[TextSelectionToolbar] 事件 "${event}" 处理出错:`, error);
        }
      });
    }
  }

  /**
   * 渲染按钮
   */
  _renderButtons() {
    // 清空按钮容器
    this.buttonContainer.innerHTML = '';

    this.buttons.forEach(button => {
      const btn = document.createElement('button');
      btn.className = 'text-toolbar-btn';
      if (button.showTitle && button.title) {
        btn.classList.add('text-toolbar-btn-with-title');
      }
      btn.dataset.buttonId = button.id;
      btn.title = button.title;
      btn.type = 'button';
      
      // 渲染图标
      const hasIcon = button.icon && button.icon !== '';
      if (hasIcon) {
        const iconEl = document.createElement('span');
        iconEl.className = 'text-toolbar-btn-icon';
        if (typeof button.icon === 'string' && (
          button.icon.startsWith('<svg') || 
          button.icon.startsWith('<i') ||
          button.icon.startsWith('<img')
        )) {
          iconEl.innerHTML = button.icon;
        } else {
          iconEl.textContent = button.icon;
        }
        btn.appendChild(iconEl);
      }

      // 渲染标题文字（showTitle 为 true 时）
      if (button.showTitle && button.title) {
        const titleEl = document.createElement('span');
        titleEl.className = 'text-toolbar-btn-title';
        titleEl.textContent = button.title;
        btn.appendChild(titleEl);
      } else if (!hasIcon) {
        // 无图标时用 title 作为内容
        btn.textContent = button.title;
      }

      this.buttonContainer.appendChild(btn);
    });
  }

  /**
   * 更新配置
   */
  setOptions(options) {
    Object.assign(this.options, options);
    return this;
  }

  /**
   * 销毁组件
   */
  destroy() {
    // 移除 DOM
    if (this.toolbar && this.toolbar.parentNode) {
      this.toolbar.parentNode.removeChild(this.toolbar);
    }

    // 移除事件监听
    document.removeEventListener('mouseup', this._handleMouseUp);
    document.removeEventListener('mousedown', this._handleMouseDown);
    document.removeEventListener('scroll', this._handleScroll, true);
    document.removeEventListener('selectionchange', this._handleSelectionChange);
    document.removeEventListener('keydown', this._handleKeyDown);

    // 清空状态
    this.buttons = [];
    this.currentSelection = null;
    this.eventListeners = {};

    // 触发销毁事件
    this._emit('destroy');

    return this;
  }
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextSelectionToolbar;
}
