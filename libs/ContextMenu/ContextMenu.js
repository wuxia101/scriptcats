/**
 * ContextMenu.js - 右键上下文菜单组件库
 * @version 1.0.0
 * @license MIT
 * 
 * 一个轻量级、可扩展的原生JavaScript右键菜单组件库
 * 支持菜单分组、图标、多级子菜单、快捷键提示、禁用状态等企业级功能
 */

(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.ContextMenu = factory());
})(this, function () {
  'use strict';

  /**
   * 默认配置
   */
  const DEFAULT_OPTIONS = {
    zIndex: 2147483647,        // 最大z-index确保菜单顶层
    offsetX: 0,                // X轴偏移
    offsetY: 2,                // Y轴偏移
    menuClass: 'cm-menu',      // 菜单容器类名
    itemClass: 'cm-item',      // 菜单项类名
    hoverDelay: 100,           // 子菜单展开延迟(ms)
    fadeIn: true,              // 是否启用淡入动画
    animationDuration: 150,    // 动画时长(ms)
  };

  /**
   * 默认样式
   */
  const DEFAULT_STYLES = `
    .cm-menu {
      position: fixed;
      top: 0;
      left: 0;
      z-index: 2147483647;
      min-width: 180px;
      max-width: 320px;
      background: rgba(30, 30, 35, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(100, 120, 160, 0.3);
      border-radius: 8px;
      padding: 6px 0;
      box-shadow: 
        0 4px 6px rgba(0, 0, 0, 0.3),
        0 10px 40px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      font-family: 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 13px;
      color: #e8eaed;
      user-select: none;
      opacity: 0;
      transform: scale(0.95);
      transform-origin: top left;
      transition: opacity 150ms ease-out, transform 150ms ease-out;
    }
    
    .cm-menu.cm-visible {
      opacity: 1;
      transform: scale(1);
    }
    
    .cm-menu * {
      box-sizing: border-box;
    }
    
    .cm-item {
      position: relative;
      display: flex;
      align-items: center;
      padding: 8px 12px;
      cursor: pointer;
      transition: background-color 100ms, padding-left 100ms;
      border-radius: 4px;
      margin: 0 4px;
    }
    
    .cm-item:hover {
      background: rgba(80, 120, 200, 0.25);
      padding-left: 14px;
    }
    
    .cm-item::before {
      content: '';
      position: absolute;
      left: 0;
      top: 50%;
      transform: translateY(-50%);
      width: 3px;
      height: 0;
      background: #5c9cf5;
      border-radius: 0 2px 2px 0;
      transition: height 100ms ease-out;
    }
    
    .cm-item:hover::before {
      height: 16px;
    }
    
    .cm-item.cm-disabled {
      opacity: 0.4;
      cursor: not-allowed;
      pointer-events: none;
    }
    
    .cm-item.cm-disabled:hover {
      background: rgba(60, 60, 65, 0.5);
      padding-left: 12px;
    }
    
    .cm-item.cm-disabled::before {
      display: none;
    }
    
    .cm-item-icon {
      width: 20px;
      margin-right: 10px;
      font-size: 14px;
      text-align: center;
      flex-shrink: 0;
    }
    
    .cm-item-text {
      flex: 1;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    
    .cm-item-shortcut {
      margin-left: 20px;
      font-size: 11px;
      color: #8b919a;
      flex-shrink: 0;
    }
    
    .cm-item-arrow {
      margin-left: 10px;
      font-size: 10px;
      color: #8b919a;
      flex-shrink: 0;
    }
    
    .cm-divider {
      height: 1px;
      margin: 6px 12px;
      background: rgba(100, 120, 160, 0.2);
    }
    
    .cm-submenu {
      position: relative;
    }
    
    .cm-submenu-content {
      position: absolute;
      top: -6px;
      left: 100%;
      min-width: 160px;
      background: rgba(30, 30, 35, 0.95);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border: 1px solid rgba(100, 120, 160, 0.3);
      border-radius: 8px;
      padding: 6px 0;
      box-shadow: 
        0 4px 6px rgba(0, 0, 0, 0.3),
        0 10px 40px rgba(0, 0, 0, 0.4),
        inset 0 1px 0 rgba(255, 255, 255, 0.05);
      opacity: 0;
      visibility: hidden;
      transform: translateX(-8px);
      transition: opacity 120ms ease-out, transform 120ms ease-out, visibility 120ms;
    }
    
    .cm-submenu.cm-open > .cm-submenu-content {
      opacity: 1;
      visibility: visible;
      transform: translateX(0);
    }
    
    .cm-menu-highlight {
      background: rgba(80, 120, 200, 0.25) !important;
    }
  `;

  /**
   * ContextMenu 主类
   */
  class ContextMenu {
    constructor(options = {}) {
      this.options = { ...DEFAULT_OPTIONS, ...options };
      this.items = [];
      this.currentSubmenu = null;
      this.hoverTimer = null;
      this.isVisible = false;
      this.menuInfo = {};
      this.idCounter = 0;
      
      // 创建样式
      this._injectStyles();
      
      // 创建菜单容器
      this._createMenuContainer();
      
      // 绑定事件
      this._bindEvents();
    }

    /**
     * 注入默认样式
     */
    _injectStyles() {
      if (document.getElementById('cm-styles')) return;
      
      const style = document.createElement('style');
      style.id = 'cm-styles';
      style.textContent = DEFAULT_STYLES;
      document.head.appendChild(style);
    }

    /**
     * 创建菜单容器
     */
    _createMenuContainer() {
      this.container = document.createElement('div');
      this.container.className = this.options.menuClass;
      this.container.innerHTML = '';
      document.body.appendChild(this.container);
    }

    /**
     * 绑定全局事件
     */
    _bindEvents() {
      // 阻止浏览器原生菜单
      this._boundContextMenu = (e) => this._onContextMenu(e);
      document.addEventListener('contextmenu', this._boundContextMenu);

      // 点击其他地方关闭菜单
      this._boundClickOutside = (e) => this._onClickOutside(e);
      document.addEventListener('click', this._boundClickOutside);

      // 键盘事件
      this._boundKeyDown = (e) => this._onKeyDown(e);
      document.addEventListener('keydown', this._boundKeyDown);

      // 滚动或调整窗口时关闭菜单
      this._boundScroll = () => this.hide();
      document.addEventListener('scroll', this._boundScroll, true);
      window.addEventListener('resize', this._boundScroll);
    }

    /**
     * 获取菜单信息
     */
    _getMenuInfo(e) {
      const target = e.target;
      const selection = window.getSelection();
      const selectionText = selection.toString().trim();

      return {
        x: e.clientX,
        y: e.clientY,
        target: target,
        selectionText: selectionText,
        clipboardText: '',  // 需要用户主动获取
        href: target.href || (target.closest('a') ? target.closest('a').href : ''),
        tagName: target.tagName.toLowerCase(),
        className: target.className,
        id: target.id,
      };
    }

    /**
     * 右键菜单事件处理
     */
    _onContextMenu(e) {
      // 如果菜单可见，先隐藏
      if (this.isVisible) {
        this.hide();
      }

      // 获取菜单信息
      this.menuInfo = this._getMenuInfo(e);

      // 过滤可见项
      const visibleItems = this.items.filter(item => {
        if (item.type === 'divider') return true;
        if (item.visible === false) return false;
        if (typeof item.visible === 'function') {
          return item.visible(this.menuInfo);
        }
        return true;
      });

      // 如果没有可见项，不显示菜单
      if (visibleItems.length === 0) return;

      // 阻止默认行为
      e.preventDefault();

      // 渲染菜单
      this._renderMenu(visibleItems);

      // 显示菜单
      this.show(e.clientX, e.clientY);
    }

    /**
     * 渲染菜单内容
     */
    _renderMenu(items) {
      let html = '';

      items.forEach(item => {
        if (item.type === 'divider') {
          html += '<div class="cm-divider"></div>';
          return;
        }

        const isDisabled = item.disabled || false;
        const hasSubmenu = item.submenu && item.submenu.items.length > 0;
        const icon = item.icon ? `<span class="cm-item-icon">${item.icon}</span>` : '';
        const shortcut = item.shortcut ? `<span class="cm-item-shortcut">${item.shortcut}</span>` : '';
        const arrow = hasSubmenu ? '<span class="cm-item-arrow">›</span>' : '';
        const disabledClass = isDisabled ? 'cm-disabled' : '';
        const submenuClass = hasSubmenu ? 'cm-submenu' : '';

        html += `
          <div class="cm-item ${disabledClass} ${submenuClass}" 
               data-id="${item.id}" 
               data-has-submenu="${hasSubmenu}">
            ${icon}
            <span class="cm-item-text">${item.text}</span>
            ${shortcut}
            ${arrow}
            ${hasSubmenu ? this._renderSubmenu(item.submenu) : ''}
          </div>
        `;
      });

      this.container.innerHTML = html;

      // 绑定菜单项事件
      this._bindItemEvents();
    }

    /**
     * 渲染子菜单
     */
    _renderSubmenu(submenu) {
      let html = '<div class="cm-submenu-content">';
      
      submenu.items.forEach(item => {
        if (item.type === 'divider') {
          html += '<div class="cm-divider"></div>';
          return;
        }

        const isDisabled = item.disabled || false;
        const hasSubmenu = item.submenu && item.submenu.items.length > 0;
        const icon = item.icon ? `<span class="cm-item-icon">${item.icon}</span>` : '';
        const shortcut = item.shortcut ? `<span class="cm-item-shortcut">${item.shortcut}</span>` : '';
        const arrow = hasSubmenu ? '<span class="cm-item-arrow">›</span>' : '';
        const disabledClass = isDisabled ? 'cm-disabled' : '';
        const submenuClass = hasSubmenu ? 'cm-submenu' : '';

        html += `
          <div class="cm-item ${disabledClass} ${submenuClass}" 
               data-id="${item.id}" 
               data-has-submenu="${hasSubmenu}">
            ${icon}
            <span class="cm-item-text">${item.text}</span>
            ${shortcut}
            ${arrow}
            ${hasSubmenu ? this._renderSubmenu(item.submenu) : ''}
          </div>
        `;
      });

      html += '</div>';
      return html;
    }

    /**
     * 绑定菜单项事件
     */
    _bindItemEvents() {
      const items = this.container.querySelectorAll('.cm-item');
      
      items.forEach(item => {
        // 悬停事件
        item.addEventListener('mouseenter', (e) => this._onItemHover(e));
        
        // 点击事件
        item.addEventListener('click', (e) => this._onItemClick(e));
      });
    }

    /**
     * 菜单项悬停处理
     */
    _onItemHover(e) {
      const item = e.currentTarget;
      
      // 清除之前的定时器
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }

      // 移除其他高亮
      this.container.querySelectorAll('.cm-item.cm-highlight').forEach(el => {
        el.classList.remove('cm-highlight');
      });
      
      // 移除其他打开的子菜单
      this.container.querySelectorAll('.cm-submenu.cm-open').forEach(el => {
        if (!item.closest('.cm-submenu')?.contains(el)) {
          el.classList.remove('cm-open');
        }
      });

      // 如果有子菜单
      if (item.dataset.hasSubmenu === 'true' && !item.classList.contains('cm-disabled')) {
        // 高亮当前项
        item.classList.add('cm-highlight');
        
        // 延迟展开子菜单
        this.hoverTimer = setTimeout(() => {
          item.classList.add('cm-open');
        }, this.options.hoverDelay);
      } else {
        item.classList.add('cm-highlight');
      }
    }

    /**
     * 菜单项点击处理
     */
    _onItemClick(e) {
      e.stopPropagation();
      
      const item = e.currentTarget;
      
      // 禁用项不响应
      if (item.classList.contains('cm-disabled')) return;

      const id = item.dataset.id;
      const hasSubmenu = item.dataset.hasSubmenu === 'true';

      // 如果有子菜单，由悬停处理
      if (hasSubmenu) return;

      // 查找对应的菜单项数据
      const menuItem = this._findMenuItem(id);
      
      if (menuItem && menuItem.onClick) {
        menuItem.onClick(this.menuInfo);
      }

      // 隐藏菜单
      this.hide();
    }

    /**
     * 递归查找菜单项
     */
    _findMenuItem(id, items = this.items) {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.submenu) {
          const found = this._findMenuItem(id, item.submenu.items);
          if (found) return found;
        }
      }
      return null;
    }

    /**
     * 点击外部关闭菜单
     */
    _onClickOutside(e) {
      if (this.isVisible && !this.container.contains(e.target)) {
        this.hide();
      }
    }

    /**
     * 键盘事件处理
     */
    _onKeyDown(e) {
      if (!this.isVisible) return;

      const focusedItem = this.container.querySelector('.cm-item.cm-highlight');
      const items = Array.from(this.container.querySelectorAll('.cm-item:not(.cm-disabled):not([data-has-submenu="true"])'));
      const allItems = Array.from(this.container.querySelectorAll('.cm-item:not(.cm-disabled)'));
      const currentIndex = focusedItem ? allItems.indexOf(focusedItem) : -1;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          this.hide();
          break;

        case 'ArrowDown':
          e.preventDefault();
          if (currentIndex < allItems.length - 1) {
            this._highlightItem(allItems[currentIndex + 1]);
          } else if (currentIndex === -1) {
            this._highlightItem(allItems[0]);
          }
          break;

        case 'ArrowUp':
          e.preventDefault();
          if (currentIndex > 0) {
            this._highlightItem(allItems[currentIndex - 1]);
          }
          break;

        case 'Enter':
          if (focusedItem) {
            e.preventDefault();
            focusedItem.click();
          }
          break;

        case 'ArrowRight':
          if (focusedItem && focusedItem.dataset.hasSubmenu === 'true') {
            e.preventDefault();
            focusedItem.classList.add('cm-open');
          }
          break;

        case 'ArrowLeft':
          if (focusedItem) {
            const parentSubmenu = focusedItem.closest('.cm-submenu:not(.cm-menu)');
            if (parentSubmenu) {
              e.preventDefault();
              parentSubmenu.classList.remove('cm-open');
              parentSubmenu.closest('.cm-item')?.classList.add('cm-highlight');
            }
          }
          break;
      }
    }

    /**
     * 高亮指定项
     */
    _highlightItem(item) {
      // 移除所有高亮
      this.container.querySelectorAll('.cm-item.cm-highlight').forEach(el => {
        el.classList.remove('cm-highlight');
      });
      
      // 移除所有打开的子菜单
      this.container.querySelectorAll('.cm-submenu.cm-open').forEach(el => {
        el.classList.remove('cm-open');
      });

      // 高亮当前项
      item.classList.add('cm-highlight');

      // 如果有子菜单，打开它
      if (item.dataset.hasSubmenu === 'true') {
        item.classList.add('cm-open');
      }
    }

    /**
     * 显示菜单
     */
    show(x, y) {
      // 计算菜单位置
      const pos = this._calculatePosition(x, y);
      
      this.container.style.left = pos.x + 'px';
      this.container.style.top = pos.y + 'px';
      this.container.style.right = 'auto';
      this.container.style.bottom = 'auto';

      // 显示动画
      this.container.classList.add('cm-visible');
      this.isVisible = true;
    }

    /**
     * 计算菜单位置
     */
    _calculatePosition(x, y) {
      const menuRect = this.container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const menuWidth = menuRect.width || 200;
      const menuHeight = menuRect.height || 300;

      let posX = x + this.options.offsetX;
      let posY = y + this.options.offsetY;

      // 边界检测 - 右侧
      if (posX + menuWidth > viewportWidth) {
        posX = viewportWidth - menuWidth - 10;
      }

      // 边界检测 - 底部
      if (posY + menuHeight > viewportHeight) {
        posY = viewportHeight - menuHeight - 10;
      }

      // 确保不超出左边界和上边界
      posX = Math.max(10, posX);
      posY = Math.max(10, posY);

      return { x: posX, y: posY };
    }

    /**
     * 隐藏菜单
     */
    hide() {
      this.container.classList.remove('cm-visible');
      this.isVisible = false;
      this.currentSubmenu = null;
      
      if (this.hoverTimer) {
        clearTimeout(this.hoverTimer);
        this.hoverTimer = null;
      }
    }

    /**
     * 注册菜单项
     * @param {Object} config - 菜单项配置
     * @returns {ContextMenu} 返回实例支持链式调用
     */
    register(config) {
      const item = {
        id: config.id || `cm-item-${++this.idCounter}`,
        text: config.text || '',
        icon: config.icon || '',
        shortcut: config.shortcut || '',
        disabled: config.disabled || false,
        visible: config.visible !== undefined ? config.visible : true,
        onClick: config.onClick || null,
        submenu: null,
        type: 'item',
      };

      // 如果有子菜单配置
      if (config.submenu && typeof config.submenu === 'function') {
        const subMenuInstance = new SubMenu(this);
        config.submenu(subMenuInstance);
        item.submenu = {
          items: subMenuInstance.items,
          parent: this
        };
      }

      this.items.push(item);
      return this;
    }

    /**
     * 添加分隔线
     * @returns {ContextMenu} 返回实例支持链式调用
     */
    divider() {
      this.items.push({
        type: 'divider'
      });
      return this;
    }

    /**
     * 创建子菜单
     * @param {string} text - 子菜单文本
     * @param {Function} callback - 子菜单配置回调
     * @returns {ContextMenu} 返回实例支持链式调用
     */
    submenu(text, callback) {
      const subMenuInstance = new SubMenu(this);
      callback(subMenuInstance);

      this.items.push({
        id: `cm-submenu-${++this.idCounter}`,
        text: text,
        type: 'submenu',
        submenu: {
          items: subMenuInstance.items,
          parent: this
        }
      });

      return this;
    }

    /**
     * 清空所有菜单项
     * @returns {ContextMenu} 返回实例支持链式调用
     */
    clear() {
      this.items = [];
      this.container.innerHTML = '';
      return this;
    }

    /**
     * 更新菜单项
     * @param {string} id - 菜单项ID
     * @param {Object} updates - 要更新的属性
     * @returns {ContextMenu} 返回实例支持链式调用
     */
    update(id, updates) {
      const item = this._findMenuItem(id);
      if (item) {
        Object.assign(item, updates);
      }
      return this;
    }

    /**
     * 移除菜单项
     * @param {string} id - 菜单项ID
     * @returns {ContextMenu} 返回实例支持链式调用
     */
    remove(id) {
      this.items = this.items.filter(item => {
        if (item.id === id) return false;
        if (item.submenu) {
          item.submenu.items = item.submenu.items.filter(subItem => subItem.id !== id);
        }
        return true;
      });
      return this;
    }

    /**
     * 获取剪贴板文本
     * @returns {Promise<string>}
     */
    async getClipboardText() {
      try {
        return await navigator.clipboard.readText();
      } catch (err) {
        return '';
      }
    }

    /**
     * 销毁组件
     */
    destroy() {
      // 移除事件监听
      document.removeEventListener('contextmenu', this._boundContextMenu);
      document.removeEventListener('click', this._boundClickOutside);
      document.removeEventListener('keydown', this._boundKeyDown);
      document.removeEventListener('scroll', this._boundScroll, true);
      window.removeEventListener('resize', this._boundScroll);

      // 移除DOM
      this.container.remove();

      // 清空数据
      this.items = [];
    }
  }

  /**
   * 子菜单类
   */
  class SubMenu {
    constructor(parent) {
      this.parent = parent;
      this.items = [];
    }

    register(config) {
      const item = {
        id: config.id || `cm-submenu-item-${++ContextMenu.prototype.idCounter || 0}`,
        text: config.text || '',
        icon: config.icon || '',
        shortcut: config.shortcut || '',
        disabled: config.disabled || false,
        visible: config.visible !== undefined ? config.visible : true,
        onClick: config.onClick || null,
        submenu: null,
        type: 'item',
      };

      // 支持嵌套子菜单
      if (config.submenu && typeof config.submenu === 'function') {
        const nestedSubMenu = new SubMenu(this);
        config.submenu(nestedSubMenu);
        item.submenu = {
          items: nestedSubMenu.items,
          parent: this
        };
      }

      this.items.push(item);
      return this;
    }

    divider() {
      this.items.push({
        type: 'divider'
      });
      return this;
    }

    submenu(text, callback) {
      const subMenuInstance = new SubMenu(this);
      callback(subMenuInstance);

      this.items.push({
        id: `cm-submenu-${++ContextMenu.prototype.idCounter || 0}`,
        text: text,
        type: 'submenu',
        submenu: {
          items: subMenuInstance.items,
          parent: this
        }
      });

      return this;
    }
  }

  return ContextMenu;
});
