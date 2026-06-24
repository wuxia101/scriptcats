# XHooks - Web API Hook 工具库

## 目录

- [简介](#简介)
- [特性](#特性)
- [依赖](#依赖)
- [安装与引入](#安装与引入)
  - [脚本猫](#脚本猫)
  - [直接引入](#直接引入)
  - [Node.js](#nodejs)
  - [AMD](#amd)
- [快速开始](#快速开始)
- [Hook 机制说明](#hook-机制说明)
  - [前置处理（pre）](#前置处理pre)
  - [后置处理（post）](#后置处理post)
  - [日志开关](#日志开关)
- [API 参考](#api-参考)
  - [hookJSONParse](#hookjsonparse)
  - [hookJSONStringify](#hookjsonstringify)
  - [hookFetch](#hookfetch)
  - [hookXMLHttpRequest](#hookxmlhttprequest)
  - [hookPromise](#hookpromise)
  - [hookWebAPI](#hookwebapi)
- [注意事项](#注意事项)
- [浏览器兼容](#浏览器兼容)
- [版本历史](#版本历史)
- [许可证](#许可证)

---

## 简介

XHooks 是一个 Web API Hook 工具库，可以对浏览器原生 API 进行拦截和改造。支持 Hook `JSON.parse`、`JSON.stringify`、`fetch`、`XMLHttpRequest`、`Promise` 以及通过 Proxy 代理 `window`、`document`、`location` 等全局对象。所有 Hook 均提供前置/后置回调，并内置可选的日志输出功能。

## 特性

- **零依赖（运行时）**：仅需 `window.XUtils` 预先加载
- **前置/后置回调**：每个 Hook 支持 `pre`（修改参数）和 `post`（修改结果）
- **异步兼容**：自动识别同步函数、异步函数和 Promise 返回值
- **日志开关**：通过 `localStorage` 动态开启/关闭各 Hook 的日志输出
- **Proxy 代理**：支持对全局对象进行 `set/get/apply` 全方位监听
- **无污染销毁**：原生方法备份在 `_origin` 属性上，可随时恢复

## 依赖

XHooks 依赖 [XUtils](../XUtils/README.md) 库，需确保在引入 XHooks 之前 `window.XUtils` 已可用：

```html
<script src="XUtils.js"></script>
<script src="XHooks.js"></script>
```

若 XUtils 未加载，XHooks 会在控制台输出错误提示并返回空对象：

```
[XHooks] XUtils 未加载！请先引入 XUtils.js，确保 window.XUtils 可用。
```

## 安装与引入

### 脚本猫

```javascript
// ==UserScript==
// @name         我的脚本
// @require      https://scriptcat.org/lib/xxxx/XUtils.js
// @require      https://scriptcat.org/lib/xxxx/XHooks.js
// ==/UserScript==

(function () {
  'use strict';
  XHooks.hookFetch(
    (url, options) => { console.log('fetch 请求:', url); return [url, options]; },
    (response) => { console.log('fetch 响应:', response); return response; }
  );
})();
```

### 直接引入

```html
<script src="XUtils.js"></script>
<script src="XHooks.js"></script>
<script>
  XHooks.hookJSONParse(null, (data) => {
    console.log('JSON.parse 结果:', data);
    return data;
  });
</script>
```

### Node.js

> **注意**：XHooks 的核心功能依赖浏览器 DOM/BOM API，在 Node.js 环境中大部分 Hook 方法不可用。

```javascript
const XUtils = require('./XUtils.js');
global.XUtils = XUtils; // 需手动挂载到全局
const XHooks = require('./XHooks.js');
```

### AMD

```javascript
define(['XUtils', 'XHooks'], function (XUtils, XHooks) {
  XHooks.hookFetch();
});
```

## 快速开始

```javascript
// 1. Hook fetch —— 拦截请求和响应
XHooks.hookFetch(
  (url, options) => {
    console.log('发起请求:', url);
    return [url, options]; // 可修改参数
  },
  (response) => {
    console.log('收到响应:', response.status);
    return response; // 可修改结果
  }
);

// 2. Hook JSON.parse —— 监听解析结果
XHooks.hookJSONParse(null, (data) => {
  console.log('解析完成:', data);
  return data;
});

// 3. Hook XMLHttpRequest —— 监听网络请求
XHooks.hookXMLHttpRequest();

// 4. Hook Web API —— Proxy 代理全局对象
XHooks.hookWebAPI('document', 'location');

// 5. 开启日志 —— 通过 localStorage 控制开关
localStorage.setItem('[global.fetch]', 'true');  // 开启 fetch 日志
localStorage.setItem('[JSON.parse]', 'true');     // 开启 JSON.parse 日志
```

## Hook 机制说明

### 前置处理（pre）

`pre` 回调在原始函数执行**之前**被调用，接收原始参数，返回修改后的参数：

```javascript
// pre 函数签名
function pre(...args) {
  // args 为原始参数数组
  // 返回新的参数数组（将传递给原始函数）
  return [modifiedArg1, modifiedArg2, ...];
}
```

### 后置处理（post）

`post` 回调在原始函数执行**之后**被调用，接收原始结果，返回修改后的结果：

```javascript
// post 函数签名
function post(result) {
  // result 为原始函数返回值
  // 返回修改后的结果
  return modifiedResult;
}
```

### 日志开关

每个 Hook 都有对应的 localStorage 键名，将其值设为 `'true'` 即可开启该 Hook 的日志输出：

| localStorage 键 | 对应 Hook |
|-----------------|-----------|
| `[global.fetch]` | fetch |
| `[JSON.parse]` | JSON.parse |
| `[JSON.stringify]` | JSON.stringify |
| `[Promise.resolve]` | Promise |
| `[global.XMLHttpRequest]` | XMLHttpRequest |
| `[global.window]` | window Proxy |
| `[global.document]` | document Proxy |
| `[global.location]` | location Proxy |
| `[global.navigator]` | navigator Proxy |
| `[global.history]` | history Proxy |
| `[global.screen]` | screen Proxy |
| `[global.localStorage]` | localStorage |
| `[global.sessionStorage]` | sessionStorage |

```javascript
// 开启 fetch 请求日志
localStorage.setItem('[global.fetch]', 'true');

// 关闭 fetch 请求日志
localStorage.setItem('[global.fetch]', 'false');
```

日志格式示例：
```
[XHook] [PreHook] [global.fetch] https://api.example.com/data
[XHook] [PostHook] [global.fetch] Response {status: 200}
```

## API 参考

### hookJSONParse

Hook `JSON.parse`，拦截 JSON 解析过程。

```javascript
XHooks.hookJSONParse(pre, post)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `pre` | `PreHookFn \| null` | 前置处理，接收 `[text, reviver]` 参数，返回修改后的参数数组。传 `null` 则使用默认日志处理 |
| `post` | `PostHookFn \| null` | 后置处理，接收解析结果对象，返回修改后的结果。传 `null` 则使用默认日志处理 |

```javascript
// 监听所有 JSON.parse 调用
XHooks.hookJSONParse(null, (data) => {
  if (data && data.token) {
    console.log('发现 token:', data.token);
  }
  return data;
});
```

### hookJSONStringify

Hook `JSON.stringify`，拦截 JSON 序列化过程。

```javascript
XHooks.hookJSONStringify(pre, post)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `pre` | `PreHookFn \| null` | 前置处理，接收 `[value, replacer, space]` 参数 |
| `post` | `PostHookFn \| null` | 后置处理，接收序列化后的字符串 |

```javascript
// 过滤敏感字段
XHooks.hookJSONStringify(null, (result) => {
  return result.replace(/"password":"[^"]*"/g, '"password":"***"');
});
```

### hookFetch

Hook `fetch`，拦截网络请求和响应。原始 fetch 备份在 `window.fetch_origin`。

```javascript
XHooks.hookFetch(pre, post)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `pre` | `PreHookFn \| null` | 前置处理，接收 `[url, options]` 参数 |
| `post` | `PostHookFn \| null` | 后置处理，接收 Response 对象 |

```javascript
// 修改请求 URL
XHooks.hookFetch(
  (url, options) => {
    if (url.startsWith('/api/')) {
      url = 'https://proxy.example.com' + url;
    }
    return [url, options];
  },
  null
);

// 恢复原始 fetch
window.fetch = window.fetch_origin;
```

### hookXMLHttpRequest

Hook `XMLHttpRequest`，拦截 XHR 的 `open` 和 `send` 方法。原始类备份在 `window.XMLHttpRequest_origin`。

```javascript
XHooks.hookXMLHttpRequest(fn_open, fn_send_pre, fn_send_post)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn_open` | `XHROpenHookFn \| null` | `open` 方法前置处理，接收 `[method, url, async, user, password]`，返回修改后的参数数组 |
| `fn_send_pre` | `PreHookFn \| null` | `send` 方法前置处理，接收发送的数据 |
| `fn_send_post` | `PostHookFn \| null` | `send` 方法后置处理，接收 `responseText` |

```javascript
// 监听 XHR 请求 URL
XHooks.hookXMLHttpRequest(
  (method, url, async, user, password) => {
    console.log(`XHR ${method} ${url}`);
    return [method, url, async, user, password];
  }
);

// 修改响应内容
XHooks.hookXMLHttpRequest(
  null,
  null,
  (responseText) => {
    try {
      const data = JSON.parse(responseText);
      data.intercepted = true;
      return JSON.stringify(data);
    } catch (e) {
      return responseText;
    }
  }
);

// 恢复原始 XMLHttpRequest
window.XMLHttpRequest = window.XMLHttpRequest_origin;
```

### hookPromise

Hook `Promise.resolve`，拦截 Promise resolve 值。原始 Promise 备份在 `window.Promise_origin`。

```javascript
XHooks.hookPromise(fn_resolve_pre)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `fn_resolve_pre` | `PreHookFn \| null` | resolve 前置处理，接收 resolve 的值数组，返回修改后的值数组 |

```javascript
// 监听 Promise resolve
XHooks.hookPromise((...values) => {
  console.log('Promise resolve:', values);
  return values;
});

// 恢复原始 Promise
window.Promise = window.Promise_origin;
```

> **注意**：Hook Promise 可能影响所有基于 Promise 的异步操作，建议仅在调试场景使用。

### hookWebAPI

使用 Proxy 代理全局对象，监听属性读写和方法调用。

```javascript
XHooks.hookWebAPI(...names)
```

| 参数 | 类型 | 说明 |
|------|------|------|
| `...names` | `string` | 要代理的对象名称，支持：`'window'`、`'document'`、`'location'`、`'navigator'`、`'history'`、`'screen'`、`'localStorage'`、`'sessionStorage'` |

- `localStorage` 和 `sessionStorage` 仅 Hook `setItem/getItem`
- 其他对象使用 Proxy 进行 `set/get/apply` 全方位监听
- `window` 对象在某些浏览器中可能无法被 Proxy，失败时会输出 `console.warn`

```javascript
// 监听 document 属性访问
XHooks.hookWebAPI('document');
// 日志: [XHook] [Proxy.get] document.title

// 监听 localStorage 写入
XHooks.hookWebAPI('localStorage');
// 日志: [XHook] [localStorage.setItem] myKey = myValue

// 同时监听多个对象
XHooks.hookWebAPI('document', 'location', 'navigator');
```

## 注意事项

1. **执行顺序**：所有 Hook 应在目标 API 被调用之前执行，推荐在 `document-start` 或页面加载初期调用
2. **恢复原始方法**：各 Hook 都会将原始方法/类备份到 `window.xxx_origin`，可随时恢复
3. **Hook Promise 风险**：`hookPromise` 会替换全局 `Promise` 类，可能影响所有异步操作，建议仅在调试时使用
4. **Proxy window**：部分浏览器不允许 Proxy `window` 对象，XHooks 会 try-catch 并输出警告
5. **localStorage 监听**：XHooks 会自动 Hook `localStorage.setItem/getItem` 来同步日志开关状态

## 浏览器兼容

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |

> **注意**：`Promise.withResolvers` 需要 Chrome 119+ / Firefox 119+ / Safari 17.4+。XHooks 内置了兼容补丁，低版本浏览器可正常使用。

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2023-12-10 | 初始版本，从油猴脚本重构为纯 JS 库 |

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE)
