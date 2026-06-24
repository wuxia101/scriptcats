# XCryptos - MD5 / HMAC-MD5 / WebCrypto Hash 加密工具库

## 目录

- [XCryptos - MD5 / HMAC-MD5 / WebCrypto Hash 加密工具库](#xcryptos---md5--hmac-md5--webcrypto-hash-加密工具库)
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
    - [MD5 哈希](#md5-哈希)
    - [HMAC-MD5](#hmac-md5)
    - [WebCrypto Hash](#webcrypto-hash)
    - [自检测试](#自检测试)
    - [配置方法](#配置方法)
  - [输出格式说明](#输出格式说明)
  - [浏览器兼容](#浏览器兼容)
  - [版本历史](#版本历史)
  - [许可证](#许可证)

---

## 简介

XCryptos 是一个纯 JavaScript 实现的加密工具库，无任何外部依赖。支持三大核心功能：

1. **MD5 哈希** — 纯 JS 实现，支持 hex / Base64 / raw 三种输出格式
2. **HMAC-MD5** — 基于密钥的消息认证码
3. **WebCrypto Hash** — 通过浏览器 `crypto.subtle` 计算 SHA-1/256/384/512 哈希，不可用时自动降级

## 特性

- **零依赖**：纯 JavaScript 实现 MD5 算法，无需任何第三方库
- **三种输出格式**：hex / Base64 / raw string
- **HMAC-MD5**：支持基于密钥的消息认证码
- **WebCrypto Hash**：支持 SHA-1 / SHA-256 / SHA-384 / SHA-512，含降级 fallback
- **可配置**：hex 大小写、Base64 填充、字符位宽均可调整
- **自检测试**：内置 `md5_vm_test()` 验证算法正确性
- **UMD 模块**：支持 AMD / CommonJS / 全局变量三种引入方式

## 安装与引入

### 脚本猫

```javascript
// ==UserScript==
// @name         我的脚本
// @require      https://scriptcat.org/lib/6772/1.0.0/XCryptos.js?sha384-3391l45K1ezgTV2RV2X7Y10V7G5klii49+M+Y8rH3SO7qGuazNnTgdZiDgEwN10Q
// ==/UserScript==

(function () {
  'use strict';
  const hash = XCryptos.hex_md5('hello world');
  console.log(hash); // 5eb63bbbe01eeed093cb22bb8f5acdc3
})();
```

### 直接引入

```html
<script src="XCryptos.js"></script>
<script>
  console.log(XCryptos.hex_md5('abc'));
</script>
```

### Node.js

```javascript
const XCryptos = require('./XCryptos.js');

XCryptos.hex_md5('password'); // '5f4dcc3b5aa765d61d8327deb882cf99'
```

### AMD

```javascript
define(['XCryptos'], function (XCryptos) {
  return XCryptos.hex_md5('data');
});
```

## 快速开始

```javascript
// MD5 哈希 - hex 输出（最常用）
XCryptos.hex_md5('hello');    // '5d41402abc4b2a76b9719d911017c592'

// MD5 哈希 - Base64 输出
XCryptos.b64_md5('hello');    // 'XUFAK4LK8LF4E8CR'

// HMAC-MD5 - 带密钥的哈希
XCryptos.hex_hmac_md5('secret_key', 'message'); // '...'

// WebCrypto Hash - SHA-256（默认）
XCryptos.computeHash('hello').then(h => console.log(h));

// WebCrypto Hash - SHA-512
XCryptos.computeHash('hello', 'SHA-512').then(h => console.log(h));

// 自检测试
XCryptos.md5_vm_test();       // true

// 配置大写 hex 输出
XCryptos.configure({ hexcase: 1 });
XCryptos.hex_md5('hello');    // '5D41402ABC4B2A76B9719D911017C592'
```

## 配置选项

| 选项 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `hexcase` | number | `0` | hex 输出大小写：`0` = 小写，`1` = 大写 |
| `b64pad` | string | `''` | Base64 填充字符：`''` = 无填充，`'='` = 标准 Base64 |
| `chrsz` | number | `16` | 字符编码位宽：`8` = ASCII 模式（单字节），`16` = Unicode 模式（双字节） |

> **注意**：配置修改是全局生效的，会影响后续所有计算结果。

```javascript
// 切换为标准 Base64 输出（带 '=' 填充）
XCryptos.configure({ b64pad: '=' });

// 切换为 ASCII 模式（仅处理单字节字符）
XCryptos.configure({ chrsz: 8 });

// 同时修改多项配置
XCryptos.configure({ hexcase: 1, b64pad: '=', chrsz: 8 });
```

## API 参考

### MD5 哈希

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `hex_md5(s)` | `string s` — 输入字符串 | `string` (32字符) | MD5 hex 哈希（默认小写） |
| `b64_md5(s)` | `string s` — 输入字符串 | `string` | MD5 Base64 哈希 |
| `str_md5(s)` | `string s` — 输入字符串 | `string` (16字符) | MD5 原始字符串哈希 |

```javascript
XCryptos.hex_md5('abc');      // '900150983cd24fb0d6963f7d28e17f72'
XCryptos.hex_md5('');         // 'd41d8cd98f00b204e9800998ecf8427e'
XCryptos.b64_md5('abc');      // 'kZ1m7EmYIVCA0o0JUD0VYA'
XCryptos.str_md5('abc');      // 原始二进制字符串（16字符）
```

### HMAC-MD5

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `hex_hmac_md5(key, data)` | `string key` — 密钥<br>`string data` — 数据 | `string` (32字符) | HMAC-MD5 hex 输出 |
| `b64_hmac_md5(key, data)` | `string key` — 密钥<br>`string data` — 数据 | `string` | HMAC-MD5 Base64 输出 |
| `str_hmac_md5(key, data)` | `string key` — 密钥<br>`string data` — 数据 | `string` (16字符) | HMAC-MD5 原始字符串输出 |

```javascript
XCryptos.hex_hmac_md5('key', 'data');   // '...'
XCryptos.b64_hmac_md5('key', 'data');   // '...'
XCryptos.str_hmac_md5('key', 'data');   // 原始字符串
```

> **典型用途**：API 签名验证、消息完整性校验、密码存储（需配合盐值）。

### WebCrypto Hash

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `computeHash(text, algorithm?)` | `string text` — 输入文本<br>`string algorithm` — 哈希算法（默认 `'SHA-256'`） | `Promise<string>` | 使用 WebCrypto API 计算 SHA 系列哈希 |

**支持的算法**：`'SHA-1'`、`'SHA-256'`、`'SHA-384'`、`'SHA-512'`

```javascript
// SHA-256（默认）
const hash256 = await XCryptos.computeHash('hello world');
console.log(hash256); // 'b94d27b9934d3e08a52e52d7da7dabfac484efe37a5380ee9088f7ace2efcde9'

// SHA-512
const hash512 = await XCryptos.computeHash('hello world', 'SHA-512');
console.log(hash512); // 128字符 hex

// SHA-1（已不推荐用于安全场景）
const hash1 = await XCryptos.computeHash('hello', 'SHA-1');

// 降级场景（crypto.subtle 不可用时，如非 HTTPS 页面）
const fallback = await XCryptos.computeHash('hello');
console.log(fallback); // 'fallback_99162322' — 仅适用于非安全场景
```

> **注意**：
> - `computeHash` 是异步方法，返回 `Promise<string>`
> - `crypto.subtle` 仅在安全上下文（HTTPS / localhost）中可用，非安全环境将自动降级
> - 降级哈希使用简单数值算法，**不可用于密码存储或安全校验**
> - MD5 和 SHA 系列的区别：MD5 产出 32 字符 hex（128 bit），SHA-256 产出 64 字符 hex（256 bit）

### 自检测试

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `md5_vm_test()` | 无 | `boolean` | 验证 MD5 实现正确性，`true` = 算法正确 |

```javascript
if (!XCryptos.md5_vm_test()) {
  console.error('XCryptos MD5 实现异常！');
}
```

### 配置方法

| 方法 | 参数 | 返回值 | 说明 |
|------|------|--------|------|
| `configure(options)` | `XCryptosConfig options` | `void` | 更新全局配置 |

```javascript
XCryptos.configure({ hexcase: 1 });      // hex 大写输出
XCryptos.configure({ b64pad: '=' });      // 标准 Base64 填充
XCryptos.configure({ chrsz: 8 });         // ASCII 编码模式
XCryptos.configure({ hexcase: 0, chrsz: 8 }); // 多项配置
```

## 输出格式说明

| 格式 | 方法 | 长度 | 示例（输入 `'abc'`） | 说明 |
|------|------|------|---------------------|------|
| hex | `hex_md5` | 32字符 | `900150983cd24fb0d6963f7d28e17f72` | 十六进制，最常用格式 |
| Base64 | `b64_md5` | ~22字符 | `kZ1m7EmYIVCA0o0JUD0VYA` | Base64 编码，适合传输 |
| raw | `str_md5` | 16字符 | 不可打印字符 | 原始二进制，适合二次编码 |
| SHA-256 hex | `computeHash` | 64字符 | `ba7816bf...`（SHA-256） | WebCrypto 计算，异步返回 |
| SHA-512 hex | `computeHash('SHA-512')` | 128字符 | 128字符 hex | 更强安全性 |
| fallback | `computeHash`（降级） | ~20字符 | `fallback_99162322` | 非加密降级，不用于安全场景 |

## 浏览器兼容

| 环境 | 支持 |
|------|------|
| Chrome | 全版本 |
| Firefox | 全版本 |
| Safari | 全版本 |
| Edge | 全版本 |
| Node.js | 全版本 |

> XCryptos MD5 部分使用纯数学运算实现，不依赖任何 DOM/BOM API，可在任何 JavaScript 环境中运行。
>
> `computeHash` 依赖 `crypto.subtle`（WebCrypto API），仅在安全上下文（HTTPS / localhost）中可用；不可用时自动降级为数值哈希。

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| 1.1.0 | 2024-06-24 | 新增 `computeHash()` WebCrypto SHA 系列哈希，含降级 fallback |
| 1.0.0 | 2023-12-10 | 初始版本，从油猴脚本重构为纯 JS 库 |

## 许可证

MIT License - 详见 [LICENSE](../../LICENSE)
