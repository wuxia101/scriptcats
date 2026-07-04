# CNBClient.js - 脚本猫 CNB API 客户端库

## Concept & Vision

一个专为脚本猫（ScriptCat）用户脚本环境设计的 CNB API 客户端封装库。核心目标是将复杂的 CNB API 调用简化为几行配置和调用，让用户脚本开发者无需关心 Token 管理、HTTP 请求细节和参数校验，专注于业务逻辑。

## Design Language

### 架构原则
- **单一职责**：每个函数只做一件事
- **Promise 链式**：所有异步操作通过 Promise 返回，统一错误处理
- **持久化无感知**：Token 和配置通过 `GM_setValue`/`GM_getValue` 自动存取
- **防御式编程**：所有公共方法做参数校验，异常输入不会导致静默失败

### API 风格
- **配置对象模式**：`createIssue(options)` 使用单参数 options 对象，明确意图
- **then/catch 风格**：不使用 async/await，确保最大兼容性
- **信息丰富**：返回值除状态码外，还包含 url / number / author 等常用字段

## Features

### 核心功能
1. **Token 管理**：`setToken` / `getToken` / `clearToken` / `hasToken` 四件套
2. **创建 Issue**：完整支持 title / body / labels / priority / assignees / date / invisible / workMode
3. **底层 API 请求**：`apiRequest` 暴露通用请求能力，可扩展更多 API
4. **默认仓库配置**：`setDefaultRepo` / `getDefaultRepo` 持久化默认仓库

### API 设计

```javascript
// ─── Token 管理 ───────────────────
CNBClient.setToken('access-token');      // 一次设置，永久保存
CNBClient.hasToken();                    // 检查是否已配置
CNBClient.getToken();                    // 读取
CNBClient.clearToken();                  // 清除

// ─── 创建 Issue ────────────────────
CNBClient.createIssue({
  title: 'Bug修复',                      // 必填
  body: '## 描述\n问题详情',             // 可选，Markdown
  labels: ['bug', 'urgent'],             // 可选，最多10个
  priority: 'P1',                        // 可选
  assignees: ['user1'],                  // 可选，最多8个
  startDate: '2026-07-05',               // 可选
  endDate: '2026-07-12',                 // 可选
  invisible: false,                      // 可选
  workMode: true,                        // 可选
  repo: 'cnb/npc',           // 可选，默认从存储读
  token: 'override-token',               // 可选，覆盖存储的 Token
}).then(result => { /* ... */ });

// ─── 配置管理 ───────────────────────
CNBClient.setDefaultRepo('my/repo');
CNBClient.getDefaultRepo();             // 'my/repo' 或默认值

// ─── 底层 API ───────────────────────
CNBClient.apiRequest('repo/-/issues', {
  method: 'GET',
  token: 'custom-token',                 // 可选
});

// ─── 常量 ───────────────────────────
CNBClient.DEFAULT_REPO                   // "cnb/npc"
CNBClient.API_BASE                       // "https://api.cnb.cool"
CNBClient.VALID_PRIORITIES               // ["-2P", "-1P", "P0", "P1", "P2", "P3"]
```

### createIssue 返回值

```typescript
{
  number: number;          // Issue 编号
  title: string;           // 标题
  state: string;           // 状态（如 "open"）
  url: string;             // Issue 页面完整链接
  createdAt: string;       // 创建时间 ISO 格式
  author: string | null;   // 作者用户名
  raw: Object;             // API 原始响应
}
```

## Component Inventory

### CNBClient.TokenManager
- **setToken(token)**: 将 access token 写入 `GM_setValue(TOKEN_STORAGE_KEY, token)`
- **getToken()**: 从 `GM_getValue(TOKEN_STORAGE_KEY)` 读取
- **clearToken()**: 将存储键设为 `null`
- **hasToken()**: 封装 `!!getToken()`

### CNBClient.ApiClient
- **apiRequest(path, opts)**: 构建完整 URL → 设置 Bearer Authorization 头 → fetch → 解析 JSON → 错误处理
- 请求头固定：`Accept: application/vnd.cnb.api+json`，`Content-Type: application/json`

### CNBClient.IssueCreator
- **createIssue(options)**: 参数校验 → 构建 payload → 调用 apiRequest → 格式化返回值
- 校验规则：title 必填且非空、priority 在白名单内、assignees ≤8、labels ≤10

### CNBClient.ConfigStore
- **setDefaultRepo(repo)**: 持久化默认仓库
- **getDefaultRepo()**: 读取默认仓库，兜底 `DEFAULT_REPO`

## Technical Approach

### 架构
- **单文件 UMD 模块**：IIFE 工厂函数，支持浏览器全局变量 / AMD / CommonJS
- **无外部依赖**：依赖 `GM_getValue`/`GM_setValue`（脚本猫内置）和 `fetch`（浏览器内置）
- **中间层设计**：`createIssue` → `apiRequest` → `fetch`，每层独立可测

### 文件结构
```
CNBClient/
├── SPEC.md              # 本文件
├── README.md            # 用户文档
├── demo.html            # 演示页面
└── cnbclient.js         # 库源码
```

### 数据流
```
用户调用 setToken(token)
  → GM_setValue('cnb_access_token', token)     // 持久化

用户调用 createIssue(options)
  → 参数校验（title 必填、priority 合法、数量限制）
  → obj → { title, body, assignees, labels, ... }
  → apiRequest('repo/-/issues', { method: 'POST', body: obj })
      → token = options.token || getToken()
      → fetch(url, { Authorization: Bearer token, ... })
      → response.json()
      → if (!response.ok) throw Error
      → return responseData
  → 格式化: { number, title, state, url, createdAt, author, raw }
```

### 关键实现
1. **UMD 包装**：三重环境检测（AMD → CommonJS → 全局变量）
2. **Token 兜底**：`options.token || getToken()` 实现覆盖机制
3. **配置持久化**：`GM_setValue` 写入，`GM_getValue` 读取加兜底
4. **错误透传**：校验错误直接 throw，API 错误从 response 提取 errmsg

## Error Cases

| 场景 | 错误信息 |
|---|---|
| title 为空 | `title 是必填项，且不能为空` |
| priority 无效 | `priority 无效，可选值: -2P, -1P, P0, P1, P2, P3` |
| assignees 超限 | `assignees 最多 8 个` |
| labels 超限 | `labels 最多 10 个` |
| Token 未配置 | `未配置 CNB token，请先调用 CNBClient.setToken() 设置` |
| API 返回错误 | `CNB API 请求失败: {errmsg}` |

## Browser Compatibility

- 脚本猫环境（完整支持，GM_* API 可用）
- 现代浏览器 Chrome 60+ / Firefox 55+ / Safari 11+ / Edge 79+
- 普通浏览器需 mock GM_getValue / GM_setValue（参考 demo.html）