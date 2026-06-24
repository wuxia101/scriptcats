# XUtils - 通用工具函数库

## 目录

- [简介](#简介)
- [特性](#特性)
- [安装与引入](#安装与引入)
  - [脚本猫](#脚本猫)
  - [直接引入](#直接引入)
  - [Node.js](#nodejs)
  - [AMD](#amd)
- [快速开始](#快速开始)
- [API 参考](#api-参考)
  - [类型检测](#类型检测)
  - [文件操作](#文件操作)
  - [延时与超时](#延时与超时)
  - [字符串工具](#字符串工具)
  - [Cookie 操作](#cookie-操作)
  - [数值工具](#数值工具)
  - [日期与温度](#日期与温度)
  - [DOM 操作](#dom-操作)
  - [数据转换](#数据转换)
  - [函数工具](#函数工具)
- [浏览器兼容](#浏览器兼容)
- [版本历史](#版本历史)
- [许可证](#许可证)

---

## 简介

XUtils 是一个纯 JavaScript 编写的通用工具函数库，无任何外部依赖。提供了日常开发中常用的工具函数，涵盖类型检测、文件操作、延时控制、字符串处理、Cookie 操作、数值计算、日期温度转换、DOM 操作、数据转换及函数包装等场景。

## 特性

- **零依赖**：纯 JavaScript 实现，无需任何第三方库
- **UMD 模块**：支持 AMD / CommonJS / 全局变量三种引入方式
- **兼容性好**：支持所有现代浏览器及 Node.js 环境
- **函数式设计**：每个函数独立可用，按需调用
- **类型安全**：完善的参数校验，异常输入不会崩溃

## 安装与引入

### 脚本猫

在油猴脚本或脚本猫中通过 `@require` 引入：

```javascript
// ==UserScript==
// @name         我的脚本
// @require      https://scriptcat.org/lib/xxxx/XUtils.js
// ==/UserScript==

(function () {
  'use strict';
  // XUtils 作为全局变量可用
  XUtils.sleep(1000).then(() => console.log('1秒后'));
})();
```

### 直接引入

通过 `<script>` 标签引入，XUtils 将挂载为全局变量 `window.XUtils`：

```html
<script src="XUtils.js"></script>
<script>
  XUtils.downloadText('hello.txt', 'Hello World!');
</script>
```

### Node.js

```javascript
const XUtils = require('./XUtils.js');

XUtils.average(1, 2, 3, 4); // 2.5
```

> **注意**：`downloadText`、`getCookie`、`setCookie`、`createScriptElement`、`removeClassElement` 等依赖 DOM/BOM 的函数在 Node.js 环境中不可用。

### AMD

```javascript
define(['XUtils'], function (XUtils) {
  XUtils.reverse('hello'); // 'olleh'
});
```

## 快速开始

```javascript
// 延时等待
await XUtils.sleep(2000);

// 下载文本文件
XUtils.downloadText('data.csv', XUtils.jsonToCsv([{ name: '张三', age: 25 }]));

// 超时执行异步函数
const result = await XUtils.timeoutFunc(fetchData, 3000);

// Cookie 操作
XUtils.setCookie('token', 'abc123', 7);
const token = XUtils.getCookie('token');

// HTML 编解码
const escaped = XUtils.HTMLEnCode('<div class="box">内容</div>');
const original = XUtils.HTMLDeCode(escaped);

// 一次性函数
const init = XUtils.toOnceFn(() => console.log('只执行一次'));
init(); // 输出日志
init(); // 不再执行
```

## API 参考

### 类型检测

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `isPromise(o)` | `* o` — 待检测值 | `boolean` | 判断值是否为 Promise 对象，支持原生 Promise 及 WrapperPromise |
| `isAsyncFunction(o)` | `* o` — 待检测值 | `boolean` | 判断值是否为异步函数（async function） |

```javascript
XUtils.isPromise(fetch('/api'));       // true
XUtils.isPromise(null);                // false
XUtils.isAsyncFunction(async () => {}); // true
XUtils.isAsyncFunction(() => {});       // false
```

### 文件操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `downloadText(fileName, content)` | `string fileName` — 文件名<br>`string content` — 文件内容 | 无 | 触发浏览器下载文本文件 |

```javascript
XUtils.downloadText('log.txt', '操作日志内容...');
XUtils.downloadText('data.csv', XUtils.jsonToCsv(data));
```

### 延时与超时

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `sleep(ms)` | `number ms` — 延时毫秒数 | `Promise<void>` | 延时等待，配合 `await` 使用 |
| `timeoutFunc(fn, timeout)` | `Function fn` — 同步或异步函数<br>`number timeout` — 超时毫秒数（默认 5000） | `Promise<*>` | 带超时执行函数，超时则 reject 并抛出 `Error('timeout')` |

```javascript
// 延时 1 秒
await XUtils.sleep(1000);

// 带超时执行异步请求（3秒超时）
try {
  const data = await XUtils.timeoutFunc(() => fetch('/api').then(r => r.json()), 3000);
} catch (e) {
  console.error('请求超时或出错:', e.message);
}

// 带超时执行同步函数
const result = await XUtils.timeoutFunc(() => heavyComputation(), 5000);
```

### 字符串工具

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `contains(s, a)` | `string s` — 源字符串<br>`string a` — 子串 | `boolean` | 判断源字符串是否包含子串 |
| `reverse(str)` | `string str` — 源字符串 | `string` | 反转字符串 |
| `HTMLEnCode(str)` | `string str` — 源字符串 | `string` | HTML 编码，转义 `&` `<` `>` `"` 及空格 |
| `HTMLDeCode(str)` | `string str` — 源字符串 | `string` | HTML 解码，还原转义字符 |

```javascript
XUtils.contains('hello world', 'world');  // true
XUtils.contains('hello', 'xyz');          // false
XUtils.reverse('hello');                  // 'olleh'
XUtils.HTMLEnCode('<div class="a">');     // '&lt;div&nbsp;class=&quot;a&quot;&gt;'
XUtils.HTMLDeCode('&lt;div&gt;');         // '<div>'
```

### Cookie 操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `getCookie(name)` | `string name` — Cookie 名 | `string | null` | 获取指定 Cookie 的值，不存在则返回 `null` |
| `setCookie(name, value, expiredays)` | `string name` — Cookie 名<br>`string value` — Cookie 值<br>`number expiredays` — 过期天数（可选） | 无 | 设置 Cookie，可指定过期天数 |

```javascript
// 设置 Cookie，7 天过期
XUtils.setCookie('theme', 'dark', 7);

// 设置 Cookie，会话结束即失效
XUtils.setCookie('session_id', 'abc123');

// 获取 Cookie
const theme = XUtils.getCookie('theme');  // 'dark'
const none = XUtils.getCookie('notexist'); // null
```

### 数值工具

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `randomBool()` | 无 | `boolean` | 获取随机布尔值 |
| `isEven(num)` | `number num` | `boolean` | 判断数字是否为偶数 |
| `average(...args)` | `...number args` | `number` | 计算所有参数的平均值 |
| `toFixed(n, fixed)` | `number n` — 数值<br>`number fixed` — 小数位数 | `number` | 保留小数位（截断方式，非四舍五入） |

```javascript
XUtils.randomBool();                    // true 或 false
XUtils.isEven(4);                       // true
XUtils.isEven(3);                       // false
XUtils.average(1, 2, 3, 4);             // 2.5
XUtils.toFixed(25.198726, 2);            // 25.19（截断，非四舍五入）
XUtils.toFixed(25.198726, 4);            // 25.1987
```

### 日期与温度

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `isWeekDay(date)` | `Date date` | `boolean` | 判断日期是否为工作日（周一至周五） |
| `timeFromDate(date)` | `Date date` | `string` | 从日期中提取时间字符串 `HH:MM:SS` |
| `celsiusToFahrenheit(celsius)` | `number celsius` | `number` | 摄氏度转华氏度 |
| `fahrenheitToCelsius(fahrenheit)` | `number fahrenheit` | `number` | 华氏度转摄氏度 |

```javascript
XUtils.isWeekDay(new Date(2024, 0, 8));  // true（周一）
XUtils.isWeekDay(new Date(2024, 0, 6));  // false（周六）
XUtils.timeFromDate(new Date(2024, 0, 1, 17, 30, 0)); // '17:30:00'
XUtils.celsiusToFahrenheit(0);           // 32
XUtils.celsiusToFahrenheit(100);         // 212
XUtils.fahrenheitToCelsius(32);          // 0
XUtils.fahrenheitToCelsius(212);         // 100
```

### DOM 操作

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `createScriptElement(url, callback)` | `string url` — 脚本 URL<br>`Function callback` — 加载完成回调（可选） | 无 | 动态加载外部 JS 脚本，兼容 IE |
| `removeClassElement(selectors, once)` | `string | string[] selectors` — CSS 选择器或数组<br>`boolean once` — 仅移除首个匹配（可选，默认 `false`） | 无 | 移除匹配选择器的 DOM 元素 |

```javascript
// 加载外部脚本
XUtils.createScriptElement('https://cdn.example.com/lib.js', () => {
  console.log('脚本加载完成');
});

// 移除所有匹配元素
XUtils.removeClassElement('.ad-banner');
XUtils.removeClassElement(['.ad-banner', '.popup-overlay']);

// 仅移除第一个匹配元素
XUtils.removeClassElement('.notification', true);
```

### 数据转换

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `jsonToCsv(jsonData)` | `Object[] jsonData` — 对象数组 | `string` | 将 JSON 对象数组转换为 CSV 字符串 |

```javascript
const data = [
  { name: '张三', age: 25, city: '北京' },
  { name: '李四', age: 30, city: '上海' }
];

const csv = XUtils.jsonToCsv(data);
// "name,age,city\n张三,25,北京\n李四,30,上海\n"

// 配合 downloadText 导出 CSV 文件
XUtils.downloadText('users.csv', csv);
```

### 函数工具

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `toOnceFn(fn)` | `Function fn` — 源函数 | `Function` | 创建只执行一次的函数包装，第二次调用不再执行 |

```javascript
// 确保初始化逻辑只执行一次
const init = XUtils.toOnceFn(() => {
  console.log('初始化完成');
});

init(); // 输出 "初始化完成"
init(); // 不再执行，返回 undefined
```

## 浏览器兼容

| 浏览器 | 最低版本 |
|--------|----------|
| Chrome | 60+ |
| Firefox | 55+ |
| Safari | 11+ |
| Edge | 79+ |
| Node.js | 8+ |

> **注意**：依赖 DOM/BOM 的函数（`downloadText`、`getCookie`、`setCookie`、`createScriptElement`、`removeClassElement`）在 Node.js 环境中不可用。其他纯逻辑函数（`sleep`、`isPromise`、`isAsyncFunction`、`reverse`、`average` 等）可在任何 JavaScript 环境中使用。

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.0.0 | 2023-12-10 | 初始版本，从油猴脚本重构为纯 JS 库 |

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE)
