# LineLoadingProgress - 页面顶部加载进度条组件

轻量级页面顶部加载进度条，模拟 NProgress / YouTube 加载条效果。

## 目录

- [LineLoadingProgress - 页面顶部加载进度条组件](#lineloadingprogress---页面顶部加载进度条组件)
  - [目录](#目录)
  - [简介](#简介)
  - [特性](#特性)
  - [安装与引入](#安装与引入)
    - [脚本猫](#脚本猫)
    - [直接引入](#直接引入)
    - [Node.js](#nodejs)
    - [AMD](#amd)
  - [快速开始](#快速开始)
  - [配置选项](#配置选项)
  - [API 参考](#api-参考)
  - [示例代码](#示例代码)
    - [基础用法](#基础用法)
    - [自定义样式](#自定义样式)
    - [手动控制进度](#手动控制进度)
    - [配合异步请求](#配合异步请求)
  - [浏览器兼容](#浏览器兼容)
  - [版本历史](#版本历史)
  - [许可证](#许可证)

---

## 简介

LineLoadingProgress 是一个零依赖的页面顶部加载进度条组件。使用浏览器原生 `<progress>` 元素实现，提供类似 NProgress 的 trickle（自动递进）效果，可通过简单 API 启动、递增、完成或隐藏进度条。

## 特性

- **零依赖** — 纯原生 JavaScript，使用 `<progress>` 元素
- **Trickle 模式** — 自动递进模拟真实加载体验
- **链式调用** — 所有方法返回 `this`，支持 `bar.start().inc().done()`
- **可配置** — 颜色、高度、速度、z-index 等均可自定义
- **可选 Spinner** — 可开启右上角旋转指示器
- **UMD 模块** — 支持 AMD / CommonJS / 全局变量

## 安装与引入

### 脚本猫

```javascript
// ==UserScript==
// @name         我的脚本
// @require      // @require https://scriptcat.org/lib/6778/1.0.0/LineLoadingProgress.js?sha384-gqSe2bIi84WjDuED2nD9xHWuxy+H/bNmSUTx7CxN2NlaW1uo12XFRv6sK0IV327L
// ==/UserScript==

(function () {
  'use strict';
  const bar = new LineLoadingProgress();
  bar.start();
})();
```

### 直接引入

```html
<script src="LineLoadingProgress.js"></script>
<script>
  const bar = new LineLoadingProgress();
  bar.start();
</script>
```

### Node.js

```javascript
const LineLoadingProgress = require('./LineLoadingProgress.js');
// Node.js 无 DOM，仅可用于单元测试
```

### AMD

```javascript
define(['LineLoadingProgress'], function (LineLoadingProgress) {
  const bar = new LineLoadingProgress();
  return bar;
});
```

## 快速开始

```javascript
// 创建并启动
const bar = new LineLoadingProgress();
bar.start();  // 从 8% 开始，自动 trickle 递进

// 标记完成
bar.done();   // 快速推到 100%，淡出消失

// 链式调用
new LineLoadingProgress().start().done();
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `color` | string | `'#35a935'` | 进度条颜色 |
| `height` | string | `'2px'` | 进度条高度 |
| `zIndex` | number | `1000` | z-index |
| `trickle` | boolean | `true` | 是否自动 trickle |
| `trickleSpeed` | number | `400` | trickle 间隔(ms) |
| `trickleSize` | number | `0.02` | 每次 trickle 增量 |
| `minimum` | number | `0.08` | 最小进度值（避免 0% 看不到） |
| `maximum` | number | `1.0` | 最大进度值 |
| `speed` | number | `300` | 进度变化动画时长(ms) |
| `easing` | string | `'ease'` | CSS easing 函数 |
| `parentId` | string | `'wx_process'` | 进度条 DOM id |
| `showSpinner` | boolean | `false` | 是否显示右上角旋转 spinner |
| `spinnerColor` | string | `'#35a935'` | spinner 颜色 |

> **注意**：配置修改对已创建实例立即生效（`configure` 方法会动态更新 DOM 样式）。

## API 参考

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `start()` | 无 | `this` | 启动进度条（从 `minimum` 开始，自动 trickle） |
| `inc(amount?)` | `number` 增量（默认 `trickleSize`） | `this` | 递增进度，进度越大增量越小 |
| `set(n)` | `number` 进度值 | `this` | 手动设置进度值 |
| `done()` | 无 | `this` | 标记完成，淡出消失 |
| `hide()` | 无 | `this` | 直接隐藏移除 |
| `getProgress()` | 无 | `number | null` | 获取当前进度值 |
| `configure(opts)` | `Partial<Options>` | `this` | 动态更新配置 |
| `destroy()` | 无 | `this` | 销毁实例，移除所有 DOM 和定时器 |

## 示例代码

### 基础用法

```javascript
const bar = new LineLoadingProgress();

// 启动 → 自动 trickle → 完成
bar.start();

// 模拟加载完成
setTimeout(() => bar.done(), 3000);
```

### 自定义样式

```javascript
// 蓝色进度条，3px 高，带 spinner
const bar = new LineLoadingProgress({
  color: '#29d',
  height: '3px',
  showSpinner: true,
  spinnerColor: '#29d',
});

bar.start();
```

### 手动控制进度

```javascript
const bar = new LineLoadingProgress({ trickle: false });

bar.set(0.1);   // 10%
bar.set(0.3);   // 30%
bar.set(0.7);   // 70%
bar.done();     // 100% → 淡出
```

### 配合异步请求

```javascript
const bar = new LineLoadingProgress();

async function loadData() {
  bar.start();
  try {
    const response = await fetch('/api/data');
    bar.inc(0.3);
    const data = await response.json();
    bar.done();
    return data;
  } catch (err) {
    bar.hide();  // 出错时直接隐藏
    throw err;
  }
}
```

## 浏览器兼容

| 环境 | 支持版本 |
|------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |
| Node.js | 仅可用于非渲染场景（无 DOM） |

> 使用 `<progress>` 元素和 CSS transition 实现，需浏览器环境。脚本猫环境完全兼容。

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2024-06-24 | 从油猴脚本重构为纯 JS UMD 库，新增 trickle/inc/done/configure 等方法 |

## 许可证

[MIT License](../../LICENSE)
