# TextSelectionToolbar - 文本选择工具栏组件

## 目录

- [TextSelectionToolbar - 文本选择工具栏组件](#textselectiontoolbar---文本选择工具栏组件)
  - [目录](#目录)
  - [功能介绍](#功能介绍)
  - [核心特性](#核心特性)
  - [使用方法](#使用方法)
    - [脚本猫](#脚本猫)
    - [基础引入](#基础引入)
    - [基础示例](#基础示例)
    - [使用 SVG 图标](#使用-svg-图标)
    - [事件监听](#事件监听)
    - [销毁工具栏](#销毁工具栏)
  - [配置选项](#配置选项)
  - [API 方法](#api-方法)
    - [按钮管理](#按钮管理)
    - [状态控制](#状态控制)
    - [事件系统](#事件系统)
    - [生命周期](#生命周期)
  - [按钮配置](#按钮配置)
  - [支持的事件](#支持的事件)
  - [样式定制](#样式定制)
  - [浏览器兼容](#浏览器兼容)

---

## 功能介绍

TextSelectionToolbar 是一个纯 JavaScript 编写的文本选择工具栏组件。当用户在页面上选中文本时，会自动在选区附近显示一个浮动工具栏，用户可以点击工具栏上的按钮对选中文本执行自定义操作。

## 核心特性

- **自动触发**：选中文本后自动显示工具栏，无需手动干预
- **智能定位**：自动计算最佳显示位置，确保工具栏始终在视口内可见
- **灵活配置**：支持注册多个自定义按钮、按钮组和分隔线
- **事件系统**：提供完整的事件机制，支持监听显示、隐藏、按钮点击等事件
- **容器限制**：可指定监听区域，只在特定容器内的文本选择时显示工具栏
- **无污染销毁**：提供完整的 destroy 方法，销毁时清理所有 DOM 和事件监听
- **动画效果**：内置淡入动画和小三角指示器，提升用户体验

## 使用方法

### 脚本猫

```javascript
// ==UserScript==
// @grant       GM_xmlhttpRequest
// @connect     *
// @require     https://scriptcat.org/lib/6768/1.0.0/TextSelectionToolbar.js?sha384-WVTzTsZix4/JgD+wbudfVZ0syXZxB6LJQEosxUo0E2YLFuK2nAwLgAxheAWxeP5Q
// ==/UserScript==

(function () {
  'use strict';
  const toolbar = new TextSelectionToolbar();
  toolbar.registerButton({
    id: 'copy',
    icon: '📋',
    title: '复制文本',
    action: (selection) => {
      navigator.clipboard.writeText(selection.text);
    }
  });
})();
```

### 基础引入

将代码直接引入页面或作为模块导入：

```javascript
// 作为模块导入
const toolbar = new TextSelectionToolbar();

// 或带配置项
const toolbar = new TextSelectionToolbar({
  offsetY: 15,
  zIndex: 9999
});
```

### 基础示例

```javascript
// 初始化工具栏
const toolbar = new TextSelectionToolbar();

// 注册一个按钮
toolbar.registerButton({
  id: 'copy',
  icon: '📋',
  title: '复制文本',
  action: (selection) => {
    navigator.clipboard.writeText(selection.text);
  }
});

// 注册多个按钮（按钮组）
toolbar.registerButtonGroup([
  { id: 'highlight', icon: '🖍', title: '高亮', action: (s) => highlight(s.text) },
  { divider: true },
  { id: 'search', icon: '🔍', title: '搜索', action: (s) => search(s.text) },
  { id: 'translate', icon: '🌐', title: '翻译', action: (s) => translate(s.text) }
]);
```

### 使用 SVG 图标

```javascript
toolbar.registerButton({
  id: 'bold',
  icon: '<svg viewBox="0 0 24 24" width="16" height="16"><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.94-4-4.37-4H7v14h7.04c2.1 0 3.96-1.73 3.96-3.87 0-1.54-.97-2.87-2.4-3.34z"/></svg>',
  title: '加粗',
  action: (selection) => {
    document.execCommand('bold');
  }
});
```

### 事件监听

```javascript
toolbar.on('show', (selection) => {
  console.log('工具栏显示了，选中文本：', selection.text);
});

toolbar.on('hide', () => {
  console.log('工具栏隐藏了');
});

toolbar.on('buttonClick', (data) => {
  console.log('点击了按钮：', data.buttonId);
});
```

### 销毁工具栏

```javascript
// 使用完毕后销毁，清理所有 DOM 和事件
toolbar.destroy();
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `container` | string / HTMLElement | `null` | 监听文本选择的容器，默认为整个文档 |
| `maxButtons` | number | `10` | 最大按钮数量 |
| `showDelay` | number | `100` | 显示延迟（毫秒），等待选区稳定 |
| `hideDelay` | number | `300` | 隐藏延迟（毫秒） |
| `offsetX` | number | `0` | 水平偏移量 |
| `offsetY` | number | `10` | 垂直偏移量（相对于选区） |
| `zIndex` | number | `10000` | 工具栏层级 |

## API 方法

### 按钮管理

| 方法 | 说明 |
|------|------|
| `registerButton(config)` | 注册单个按钮，返回工具栏实例支持链式调用 |
| `registerButtonGroup(configs)` | 批量注册按钮和分隔线 |
| `addDivider()` | 添加分隔线 |
| `removeButton(id)` | 移除指定按钮 |
| `updateButton(id, config)` | 更新按钮配置 |
| `getButton(id)` | 获取单个按钮信息 |
| `getAllButtons()` | 获取所有按钮列表 |
| `clearButtons()` | 清空所有按钮 |

### 状态控制

| 方法 | 说明 |
|------|------|
| `show()` | 显示工具栏（需当前有选中文本） |
| `hide()` | 隐藏工具栏 |
| `toggle()` | 切换显示/隐藏状态 |
| `getSelection()` | 获取当前选中的文本和相关信息 |
| `setOptions(options)` | 更新配置选项 |

### 事件系统

| 方法 | 说明 |
|------|------|
| `on(event, callback)` | 监听事件 |
| `off(event, callback)` | 移除事件监听 |

### 生命周期

| 方法 | 说明 |
|------|------|
| `destroy()` | 销毁组件，清理所有 DOM 和事件 |

## 按钮配置

注册按钮时传入的配置对象：

```javascript
{
  id: 'unique_id',        // 按钮唯一标识符（必填）
  icon: '📌',             // 钮图标（支持 emoji、SVG、HTML）
  title: '固定到顶部',    // 鼠标悬停时显示的提示文字
  action: (selection) => { // 点击回调函数
    // selection 包含:
    // - text: 选中的文本内容
    // - selection: 原生 Selection 对象
    // - range: 选区的 Range 对象
  }
}
```

## 支持的事件

| 事件名 | 回调参数 | 触发时机 |
|--------|----------|----------|
| `show` | selection | 工具栏显示时 |
| `hide` | 无 | 工具栏隐藏时 |
| `buttonClick` | { button, selection, buttonId } | 点击工具栏按钮时 |
| `destroy` | 无 | 组件销毁时 |

## 样式定制

组件会注入默认样式，但可以通过覆盖 CSS 类来自定义外观：

```css
/* 自定义按钮样式 */
.text-toolbar-btn {
  background: #f5f5f5;
  color: #333;
}

/* 自定义悬停效果 */
.text-toolbar-btn:hover {
  background: #e0e0e0;
  color: #000;
}

/* 自定义激活效果 */
.text-toolbar-btn:active {
  background: #d0d0d0;
  transform: scale(0.98);
}

/* 自定义分隔线样式 */
.text-toolbar-divider {
  background: #ccc;
}
```

## 浏览器兼容

组件使用原生 JavaScript 实现，兼容所有现代浏览器：

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |

> ⚠️ 不支持 IE 浏览器。
