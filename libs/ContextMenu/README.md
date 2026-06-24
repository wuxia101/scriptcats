# ContextMenu.js - 右键上下文菜单组件库

一个轻量级、可扩展的原生 JavaScript 右键上下文菜单组件库。

## 目录

- [ContextMenu.js - 右键上下文菜单组件库](#contextmenujs---右键上下文菜单组件库)
  - [目录](#目录)
  - [特性](#特性)
  - [安装与引入](#安装与引入)
    - [脚本猫](#脚本猫)
    - [直接引入](#直接引入)
    - [Node.js](#nodejs)
    - [AMD](#amd)
  - [快速开始](#快速开始)
  - [构造函数](#构造函数)
  - [API 文档](#api-文档)
    - [register(config)](#registerconfig)
    - [divider()](#divider)
    - [submenu(text, callback)](#submenutext-callback)
    - [show(x, y)](#showx-y)
    - [hide()](#hide)
    - [clear()](#clear)
    - [update(id, updates)](#updateid-updates)
    - [remove(id)](#removeid)
    - [getClipboardText()](#getclipboardtext)
    - [destroy()](#destroy)
  - [MenuInfo 对象](#menuinfo-对象)
  - [示例代码](#示例代码)
    - [基础用法](#基础用法)
    - [条件显示](#条件显示)
    - [禁用菜单项](#禁用菜单项)
  - [键盘快捷键](#键盘快捷键)
  - [浏览器兼容](#浏览器兼容)
  - [许可证](#许可证)

---

## 特性

- **完全替换原生菜单** — 拦截浏览器原生右键事件，显示自定义菜单
- **零依赖** — 纯原生 JavaScript 实现，无需任何外部库
- **支持子菜单** — 可嵌套多级子菜单，自动处理边界溢出
- **快捷键支持** — 显示快捷键提示，支持键盘导航
- **丰富样式** — 现代暗色玻璃态设计，流畅动画
- **灵活配置** — 支持禁用、动态显示、回调函数等
- **UMD 模块** — 支持 CommonJS、AMD 和全局变量

## 安装与引入

### 脚本猫

```javascript
// ==UserScript==
// @name         我的脚本
// @require      https://scriptcat.org/lib/6773/1.0.0/ContextMenu.js?sha384-mdmVdKGRRasmncKLqEoD+xJ1hr5NUpkR70c3V8/8kaQ/SJFc1wDkzQq2oVEDXiwp
// ==/UserScript==

(function () {
  'use strict';
  const menu = new ContextMenu();
  menu.register({ id: 'copy', text: '复制' });
})();
```

> 在脚本猫环境中，`ContextMenu` 会自动挂载到全局 `window` 对象，直接 `new ContextMenu()` 即可使用。

### 直接引入

```html
<script src="ContextMenu.js"></script>
<script>
  const menu = new ContextMenu();
  menu.register({ id: 'copy', text: '复制' });
</script>
```

### Node.js

```javascript
const ContextMenu = require('./ContextMenu.js');
// Node.js 环境无 DOM，仅可用于单元测试等非渲染场景
```

### AMD

```javascript
define(['ContextMenu'], function (ContextMenu) {
  const menu = new ContextMenu();
  return menu;
});
```

## 快速开始

```javascript
// 创建菜单实例
const menu = new ContextMenu();

// 注册菜单项
menu.register({
  id: 'copy',
  text: '复制',
  icon: '📋',
  shortcut: 'Ctrl+C',
  onClick: (info) => {
    console.log('选中文本:', info.selectionText);
  }
});

// 添加分隔线
menu.divider();

// 添加子菜单
menu.submenu('更多操作', (sub) => {
  sub.register({ id: 'save', text: '保存' });
  sub.register({ id: 'share', text: '分享' });
});

// 链式调用
menu
  .register({ id: 'print', text: '打印' })
  .divider()
  .register({ id: 'exit', text: '退出' });
```

## 构造函数

```javascript
const menu = new ContextMenu(options);
```

**可选配置项：**

| 选项 | 类型 | 默认值 | 描述 |
|------|------|--------|------|
| `zIndex` | number | `2147483647` | 菜单的 z-index |
| `offsetX` | number | `0` | X 轴偏移量 |
| `offsetY` | number | `2` | Y 轴偏移量 |
| `menuClass` | string | `'cm-menu'` | 菜单容器 CSS 类名 |
| `itemClass` | string | `'cm-item'` | 菜单项 CSS 类名 |
| `hoverDelay` | number | `100` | 子菜单展开延迟(ms) |
| `fadeIn` | boolean | `true` | 是否启用淡入动画 |
| `animationDuration` | number | `150` | 动画时长(ms) |

## API 文档

### register(config)

注册一个新的菜单项，支持链式调用。

```javascript
menu.register({
  id: 'unique-id',           // 唯一标识符
  text: '菜单文本',            // 显示文本
  icon: '📌',                 // 图标（支持 emoji 或 HTML）
  shortcut: 'Ctrl+S',         // 快捷键提示
  disabled: false,           // 是否禁用
  visible: true,             // 是否可见（支持函数）
  onClick: (info) => {}       // 点击回调
});
```

**config 参数：**

| 属性 | 类型 | 必填 | 描述 |
|------|------|------|------|
| `id` | string | 是 | 菜单项唯一 ID |
| `text` | string | 是 | 显示文本 |
| `icon` | string | 否 | 图标（emoji 或 HTML） |
| `shortcut` | string | 否 | 快捷键提示文本 |
| `disabled` | boolean | 否 | 是否禁用该菜单项 |
| `visible` | boolean \| Function | 否 | 是否显示，函数接收 `MenuInfo` 对象 |
| `onClick` | Function | 否 | 点击回调，接收 `MenuInfo` 对象 |
| `submenu` | Function | 否 | 子菜单配置回调 |

### divider()

添加分隔线，支持链式调用。

```javascript
menu.divider();
```

### submenu(text, callback)

创建子菜单，支持嵌套。

```javascript
menu.submenu('子菜单标题', (sub) => {
  sub.register({ id: 'item1', text: '选项1' });
  sub.register({ id: 'item2', text: '选项2' });

  // 支持嵌套子菜单
  sub.submenu('二级子菜单', (nested) => {
    nested.register({ id: 'nested1', text: '嵌套选项1' });
  });
});
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `text` | string | 子菜单显示文本 |
| `callback` | Function | 子菜单配置回调，参数为子菜单实例 |

### show(x, y)

手动在指定坐标显示菜单。

```javascript
menu.show(100, 200);
```

### hide()

隐藏菜单。

```javascript
menu.hide();
```

### clear()

清空所有菜单项。

```javascript
menu.clear();
```

### update(id, updates)

更新指定菜单项的属性。

```javascript
menu.update('my-item', {
  text: '新文本',
  disabled: true
});
```

| 参数 | 类型 | 描述 |
|------|------|------|
| `id` | string | 菜单项 ID |
| `updates` | Object | 需更新的属性（支持 `text`、`icon`、`disabled`、`visible`、`onClick`） |

### remove(id)

移除指定菜单项。

```javascript
menu.remove('my-item');
```

### getClipboardText()

获取剪贴板文本内容（异步）。

```javascript
const text = await menu.getClipboardText();
```

### destroy()

销毁菜单实例，移除所有事件监听和 DOM 元素。

```javascript
menu.destroy();
```

## MenuInfo 对象

回调函数中接收的 `info` 对象包含以下属性：

| 属性 | 类型 | 描述 |
|------|------|------|
| `x` | number | 鼠标点击 X 坐标 |
| `y` | number | 鼠标点击 Y 坐标 |
| `target` | Element | 触发右键点击的元素 |
| `selectionText` | string | 当前选中的文本 |
| `clipboardText` | string | 剪贴板内容 |
| `href` | string | 如果是链接元素，获取 href |
| `tagName` | string | 触发元素的标签名 |
| `className` | string | 触发元素的 className |
| `id` | string | 触发元素的 id |

```javascript
{
  x: number,              // 鼠标点击X坐标
  y: number,              // 鼠标点击Y坐标
  target: Element,        // 触发右键点击的元素
  selectionText: string,  // 选中的文本
  clipboardText: string,  // 剪贴板内容
  href: string,           // 如果是链接元素，获取href
  tagName: string,        // 触发元素的标签名
  className: string,      // 触发元素的className
  id: string              // 触发元素的id
}
```

## 示例代码

### 基础用法

```javascript
const menu = new ContextMenu();

menu.register({
  id: 'copy',
  text: '复制',
  onClick: () => document.execCommand('copy')
});

menu.register({
  id: 'paste',
  text: '粘贴',
  onClick: async () => {
    const text = await menu.getClipboardText();
    console.log(text);
  }
});

menu.register({
  id: 'cut',
  text: '剪切',
  onClick: () => document.execCommand('cut')
});
```

### 条件显示

```javascript
// 只有选中文本时才显示
menu.register({
  id: 'search',
  text: '搜索',
  visible: (info) => info.selectionText.length > 0,
  onClick: (info) => {
    window.open(`https://google.com/search?q=${info.selectionText}`);
  }
});

// 只有右键点击链接时显示
menu.register({
  id: 'open-link',
  text: '打开链接',
  visible: (info) => !!info.href,
  onClick: (info) => {
    window.open(info.href);
  }
});
```

### 禁用菜单项

```javascript
menu.register({
  id: 'delete',
  text: '删除',
  disabled: true,
  onClick: () => {}
});

// 动态启用
setTimeout(() => {
  menu.update('delete', { disabled: false });
}, 3000);
```

## 键盘快捷键

| 按键 | 行为 |
|------|------|
| `Esc` | 关闭菜单 |
| `↑` / `↓` | 上下导航 |
| `Enter` | 执行选中项 |
| `→` | 打开子菜单 |
| `←` | 返回上级菜单 |

## 浏览器兼容

| 环境 | 支持版本 |
|------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |
| Node.js | 仅可用于非渲染场景（无 DOM） |

> ContextMenu 依赖 DOM API，仅在有浏览器环境的场景中可正常渲染。脚本猫环境完全兼容。

## 许可证

[MIT License](../../LICENSE)
