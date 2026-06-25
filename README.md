# ScriptCats

[脚本猫](https://github.com/scriptscat/scriptcat) Agent 工具集 — 包含用户脚本、纯 JS 工具库和 Agent Skills。

## 目录

- [ScriptCats](#scriptcats)
  - [目录](#目录)
  - [用户脚本](#用户脚本)
  - [工具库 (libs)](#工具库-libs)
    - [XUtils](#xutils)
    - [XHooks](#xhooks)
    - [XCryptos](#xcryptos)
    - [TextSelectionToolbar](#textselectiontoolbar)
  - [Agent Skills](#agent-skills)
  - [项目结构](#项目结构)
  - [许可证](#许可证)

---

## 用户脚本

| 脚本 | 说明 | 安装 |
|------|------|------|
| [OPFS 文件上传助手](https://scriptcat.org/zh-CN/script-show-page/6298) | 通过脚本猫菜单上传文件或文件夹到 OPFS 目录，带美观 UI 界面 | [安装](https://scriptcat.org/zh-CN/script-show-page/6298) |
| [脚本猫发布生成描述助手](https://scriptcat.org/zh-CN/script-show-page/6297) | 在 ScriptCat 发布脚本时，自动根据代码生成描述和更新日志 | [安装](https://scriptcat.org/zh-CN/script-show-page/6297) |
| [SingBox 订阅解析器](https://scriptcat.org/en/script-show-page/6774) | 在 ScriptCat 发布脚本时，自动根据代码生成描述和更新日志 | [安装](https://scriptcat.org/en/script-show-page/6774) |
| [AI 会话面板(智能猫)](https://scriptcat.org/en/script-show-page/6780) | 单文件 ScriptCat AI Agent 面板，支持页面内唤起、发送上下文、复制结果和本地配置 | [安装](https://scriptcat.org/en/script-show-page/6780) |
| [AI 选择工具栏](https://scriptcat.org/en/script-show-page/6787) | 选中文本后显示可配置的 AI 工具栏：问问AI、复制、翻译、朗读、总结 | [安装](https://scriptcat.org/en/script-show-page/6787) |




## 工具库 (libs)

纯 JavaScript 实现的 UMD 工具库，无油猴沙箱依赖，支持脚本猫 `@require`、`<script>` 引入、Node.js 和 AMD 多种方式。

### XUtils

通用工具函数库 — DOM 操作、Cookie 管理、定时器、事件、下载等。

| 方法 | 说明 |
|------|------|
| `waitElement()` | 等待 DOM 元素出现 |
| `getCookie()` / `setCookie()` | Cookie 读写 |
| `timeoutFunc()` | 超时执行函数 |
| `toOnceFn()` | 将函数转为一次性调用 |
| `downloadText()` | 下载文本文件 |

> 📄 [完整文档](./libs/XUtils/README.md)

### XHooks

Web API Hook 工具库 —拦截和监听 `fetch`、`XMLHttpRequest`、`window` 属性等。

| 方法 | 说明 |
|------|------|
| `hookFetch()` | 拦截 fetch 请求 |
| `hookXHR()` | 拦截 XMLHttpRequest |
| `hookWebAPI()` | 拦截 window 上的指定属性 |
| `watchObject()` | 监听对象属性变化 |

> **依赖**：需先加载 XUtils（`window.XUtils`）
>
> 📄 [完整文档](./libs/XHooks/README.md)

### XCryptos

MD5 / HMAC-MD5 / WebCrypto Hash 加密工具库 — 纯算法实现，零依赖。

| 方法 | 说明 |
|------|------|
| `hex_md5()` / `b64_md5()` / `str_md5()` | MD5 哈希（hex / Base64 / raw） |
| `hex_hmac_md5()` 等 | HMAC-MD5 三种格式 |
| `computeHash()` | WebCrypto SHA-1/256/384/512 哈希（异步，含降级 fallback） |
| `configure()` | 配置 hex 大小写、Base64 填充、字符位宽 |

> 📄 [完整文档](./libs/XCryptos/README.md)

### TextSelectionToolbar

文本选择工具栏组件 — 选中文本后弹出自定义操作按钮栏。

| 特性 | 说明 |
|------|------|
| 自定义按钮 | 支持文本/SVG 图标按钮 |
| 动态菜单 | 可根据选中文本动态生成菜单项 |
| 样式可配置 | 位置、颜色、间距均可自定义 |

> 📄 [完整文档](./libs/TextSelectionToolbar/README.md)

## Agent Skills

脚本猫 Agent 技能包，位于 [`skills/scriptcat-skills/`](./skills/scriptcat-skills/)：

| 技能 | 说明 |
|------|------|
| [browser-automation](./skills/scriptcat-skills/browser-automation/) | 页面分析、DOM 操作、表单填写、截图 |
| [scheduled-tasks](./skills/scriptcat-skills/scheduled-tasks/) | 基于 cron 的定时任务调度 |
| [skill-creator](./skills/scriptcat-skills/skill-creator/) | 辅助创建、测试和打包新 Skill |
| [file-parser](./skills/scriptcat-skills/file-parser/) | 解析 Excel/PDF/Word/CSV/PPT 文件 |
| [scriptcat-dev](./skills/scriptcat-skills/scriptcat-dev/) | 脚本猫/油猴脚本开发助手 |
| [synology-office-sheet](./skills/scriptcat-skills/synology-office-sheet/) | 读写群晖 Synology Office 电子表格 |
| [wechat-publisher](./skills/scriptcat-skills/wechat-publisher/) | 微信公众号运营助手 |
| [xiaohongshu-publisher](./skills/scriptcat-skills/xiaohongshu-publisher/) | 小红书运营助手 |

> 📄 [Skills 文档](./skills/scriptcat-skills/README.zh-CN.md)

## 项目结构

```
scriptcats/
├── opfs-uploader.user.js          # OPFS 文件上传助手脚本
├── scriptcat-publish-assistant.user.js  # 发布描述生成助手脚本
├── libs/                          # 纯 JS 工具库
│   ├── XUtils/                    # 通用工具函数
│   │   ├── XUtils.js
│   │   ├── XUtils.d.ts
│   │   └── README.md
│   ├── XHooks/                    # Web API Hook
│   │   ├── XHooks.js
│   │   ├── XHooks.d.ts
│   │   └── README.md
│   ├── XCryptos/                  # 加密工具
│   │   ├── XCryptos.js
│   │   ├── XCryptos.d.ts
│   │   └── README.md
│   └── TextSelectionToolbar/      # 文本选择工具栏
│       ├── TextSelectionToolbar.js
│       ├── TextSelectionToolbar.d.ts
│       └── README.md
├── skills/                        # Agent Skills
│   └── scriptcat-skills/          # 技能包 + 示例
│       ├── browser-automation/
│       ├── scheduled-tasks/
│       ├── skill-creator/
│       ├── file-parser/
│       ├── scriptcat-dev/
│       ├── synology-office-sheet/
│       ├── wechat-publisher/
│       ├── xiaohongshu-publisher/
│       └── examples/
├── docs/                          # 文档与图片
├── LICENSE                        # MIT License
└── README.md
```

## 许可证

[MIT License](./LICENSE) - Copyright (c) 2026 wuxia
