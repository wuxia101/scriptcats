# CNBClient - 脚本猫 CNB API 客户端库

## 目录

- [CNBClient - 脚本猫 CNB API 客户端库](#cnbclient---脚本猫-cnb-api-客户端库)
  - [目录](#目录)
  - [简介](#简介)
  - [特性](#特性)
  - [安装与引入](#安装与引入)
    - [脚本猫](#脚本猫)
    - [直接引入](#直接引入)
  - [快速开始](#快速开始)
  - [API 参考](#api-参考)
    - [Token 管理](#token-管理)
    - [创建 Issue](#创建-issue)
      - [`CNBClient.createIssue(options)`](#cnbclientcreateissueoptions)
    - [底层 API 请求](#底层-api-请求)
      - [`CNBClient.apiRequest(path, options)`](#cnbclientapirequestpath-options)
    - [配置管理](#配置管理)
    - [常量](#常量)
  - [依赖 grants](#依赖-grants)
  - [错误处理](#错误处理)
  - [版本历史](#版本历史)
  - [许可证](#许可证)

---

## 简介

CNBClient 是专为脚本猫环境设计的 CNB API 客户端封装库。提供从 Token 管理到 Issue 创建的一站式支持，Token 通过 `GM_setValue`/`GM_getValue` 自动持久化，无需每次手动传入。

核心流程：

```
GM_setValue('token') → CNBClient.setToken()
                           ↓
CNBClient.createIssue({ title, body, ... })
                           ↓
   apiRequest('repo/-/issues', { POST, body })
                           ↓
            返回 { number, title, url, ... }
```

## 特性

- **Token 持久化**：通过 `GM_setValue`/`GM_getValue` 自动存取，一次配置永久生效
- **零依赖**：仅依赖脚本猫内置 `GM_*` API 和浏览器 `fetch`
- **UMD 模块**：支持 AMD / CommonJS / 全局变量三种引入方式
- **完整校验**：参数合法性检查，标题必填、优先级可选值、assignees/labels 数量限制
- **清晰的错误提示**：token 未配置、API 错误均会抛出明确的 Error

## 安装与引入

### 脚本猫

在用户脚本元数据中添加 `@require`，并确保声明所需的 grants：

```javascript
// ==UserScript==
// @name         我的脚本
// @require      https://scriptcat.org/lib/xxxx/1.0.0/CNBClient.js
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      api.cnb.cool
// ==/UserScript==

(function () {
  'use strict';
  // CNBClient 作为全局变量可用
  CNBClient.setToken('your-access-token');
  CNBClient.createIssue({ title: 'Bug修复' }).then(r => console.log(r.url));
})();
```

### 直接引入

通过 `<script>` 标签引入，CNBClient 将挂载为全局变量 `window.CNBClient`。

> 注意：在普通浏览器环境中 `GM_getValue`/`GM_setValue` 不可用，需要使用 mock（参见 `demo.html`）。

```html
<script src="cnbclient.js"></script>
<script>
  // 需要先 mock GM API 或手动传入 token
  CNBClient.createIssue({
    title: '测试',
    token: 'your-token', // Token 管理
  }).then(console.log);
</script>
```

## 快速开始

```javascript
// 1. 设置 Token（只需执行一次，之后持久化存储）
CNBClient.setToken('your-cnb-access-token');

// 2. 检查 Token 是否已配置
if (!CNBClient.hasToken()) {
  console.log('请先设置 Token');
}

// 3. 创建 Issue（最简形式）
CNBClient.createIssue({ title: '首页加载速度优化' })
  .then(function (result) {
    console.log('Issue 创建成功');
    console.log('编号:', result.number);
    console.log('链接:', result.url);
    console.log('状态:', result.state);
    console.log('作者:', result.author);
  })
  .catch(function (err) {
    console.error('创建失败:', err.message);
  });

// 4. 完整参数示例
CNBClient.createIssue({
  title: '用户登录页面响应式适配',
  body: '## 问题描述\n\n移动端登录按钮错位，需要适配小屏。\n\n### 影响范围\n- iOS Safari\n- Android Chrome',
  labels: ['bug', 'frontend'],
  priority: 'P1',
  assignees: ['zhangsan', 'lisi'],
  startDate: '2026-07-05',
  endDate: '2026-07-12',
  invisible: false,
  workMode: true,
}).then(function (result) {
  console.log('#%s %s → %s', result.number, result.title, result.url);
});
```

## API 参考

### Token 管理

| 方法 | 参数 | 返回值 | 说明 |
|---|---|---|---|
| `setToken(token)` | `string` - access token | `void` | 设置并持久化存储 Token |
| `getToken()` | 无 | `string \| null` | 获取存储的 Token |
| `clearToken()` | 无 | `void` | 清除存储的 Token |
| `hasToken()` | 无 | `boolean` | 检查是否已配置 Token |

### 创建 Issue

#### `CNBClient.createIssue(options)`

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|---|---|---|---|---|
| `title` | `string` | ✅ | - | Issue 标题 |
| `body` | `string` | ❌ | `''` | Issue 内容（支持 Markdown） |
| `assignees` | `string[]` | ❌ | `[]` | 处理人用户名，最多 8 个 |
| `labels` | `string[]` | ❌ | `[]` | 标签，最多 10 个 |
| `priority` | `string` | ❌ | - | 可选: `-2P` `-1P` `P0` `P1` `P2` `P3` |
| `startDate` | `string` | ❌ | - | 开始日期 `YYYY-MM-DD` |
| `endDate` | `string` | ❌ | - | 结束日期 `YYYY-MM-DD` |
| `invisible` | `boolean` | ❌ | `false` | 设为不可见 |
| `workMode` | `boolean` | ❌ | `false` | 开启工作模式 |
| `repo` | `string` | ❌ | `"cnb/npc"` | 仓库路径 |
| `token` | `string` | ❌ | 从存储读取 | 自定义 Token（覆盖存储值） |

**返回值** `Promise<Object>`

| 字段 | 类型 | 说明 |
|---|---|---|
| `number` | `number` | Issue 编号 |
| `title` | `string` | Issue 标题 |
| `state` | `string` | Issue 状态 |
| `url` | `string` | Issue 页面链接 |
| `createdAt` | `string` | 创建时间 ISO 格式 |
| `author` | `string \| null` | 作者用户名 |
| `raw` | `Object` | API 原始响应数据 |

### 底层 API 请求

#### `CNBClient.apiRequest(path, options)`

低级 API 封装，用于调用 `createIssue` 未覆盖的 CNB API。

```javascript
// GET 请求示例
CNBClient.apiRequest('cnb/npc/-/issues', { method: 'GET' })
  .then(function (data) {
    console.log('Issue 列表:', data);
  });

// 自定义 Token
CNBClient.apiRequest('other-repo/-/issues', {
  method: 'POST',
  body: { title: '测试' },
  token: 'custom-token',
});
```

| 参数 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `path` | `string` | ✅ | API 路径（不含 `https://api.cnb.cool/`） |
| `options.method` | `string` | ❌ | HTTP 方法，默认 `GET` |
| `options.body` | `Object` | ❌ | 请求体，自动 JSON 序列化 |
| `options.token` | `string` | ❌ | 覆盖存储的 Token |

### 配置管理

| 方法 | 参数 | 说明 |
|---|---|---|
| `setDefaultRepo(repo)` | `string` - 仓库路径 | 持久化存储默认仓库 |
| `getDefaultRepo()` | 无 | 获取默认仓库路径 |

### 常量

| 常量 | 值 | 说明 |
|---|---|---|
| `CNBClient.DEFAULT_REPO` | `"cnb/npc"` | 默认仓库 |
| `CNBClient.API_BASE` | `"https://api.cnb.cool"` | API 基础地址 |
| `CNBClient.VALID_PRIORITIES` | `["-2P", "-1P", "P0", "P1", "P2", "P3"]` | 合法优先级列表 |

## 依赖 grants

宿主脚本需声明以下 grants：

| Grant | 用途 |
|---|---|
| `@grant GM_getValue` | 读取持久化的 Token 和默认仓库 |
| `@grant GM_setValue` | 写入持久化的 Token 和默认仓库 |
| `@connect api.cnb.cool` | 允许跨域请求 CNB API |

## 错误处理

```javascript
CNBClient.createIssue({ title: '' })
  .catch(function (err) {
    // 参数错误
    console.log(err.message); // "title 是必填项，且不能为空"
  });

CNBClient.createIssue({ title: '测试', priority: 'P99' })
  .catch(function (err) {
    // 优先级无效
    console.log(err.message); // "priority 无效，可选值: -2P, -1P, P0, P1, P2, P3"
  });

CNBClient.createIssue({ title: '测试' }) // 未设置 Token
  .catch(function (err) {
    // Token 未配置
    console.log(err.message); // "未配置 CNB token，请先调用 CNBClient.setToken() 设置"
  });
```

## 版本历史

| 版本 | 日期 | 变更 |
|---|---|---|
| 1.0.0 | 2026-07-03 | 初始版本，支持 createIssue / apiRequest / Token 管理 |

## 许可证

MIT License - 详见源码文件头部注释。