# ContextMenu.js - 右键上下文菜单组件库

## Concept & Vision

一个轻量级、可扩展的原生JavaScript右键菜单组件库，用于替换浏览器原生右键菜单。采用分层架构设计，支持菜单分组、图标、多级子菜单、快捷键提示、禁用状态等企业级功能。API设计简洁直观，链式调用风格。

## Design Language

### 视觉风格
- **主题**: 现代暗色玻璃态（Glassmorphism）风格，带有微妙的毛玻璃效果
- **圆角**: 8px（菜单容器）、6px（菜单项）
- **阴影**: 多层阴影营造深度感

### 色彩系统
```css
--cm-bg: rgba(30, 30, 35, 0.95)          /* 主背景 */
--cm-bg-hover: rgba(80, 120, 200, 0.25)  /* 悬停背景 */
--cm-bg-disabled: rgba(60, 60, 65, 0.5)  /* 禁用项背景 */
--cm-border: rgba(100, 120, 160, 0.3)    /* 边框 */
--cm-text: #e8eaed                        /* 主文本 */
--cm-text-muted: #8b919a                   /* 次要文本 */
--cm-accent: #5c9cf5                      /* 强调色/图标 */
--cm-danger: #f5576c                      /* 危险操作 */
--cm-divider: rgba(100, 120, 160, 0.2)    /* 分隔线 */
```

### 字体
- 主字体: `'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif`
- 字号: 13px（菜单项）、11px（快捷键提示）
- 字重: 400（普通）、500（标题）

### 动画
- 菜单出现: `opacity 0→1, scale 0.95→1`, 150ms ease-out
- 子菜单展开: `opacity 0→1, translateX(-8px→0)`, 120ms ease-out
- 悬停反馈: `background-color 100ms`

## Features

### 核心功能
1. **全局拦截**: 阻止浏览器原生右键菜单，显示自定义菜单
2. **注册菜单项**: 支持文本、图标、回调函数、快捷键
3. **菜单分组**: 使用分隔线组织相关功能
4. **子菜单**: 支持嵌套多级子菜单
5. **条件显示**: 可设置菜单项的可见性条件
6. **状态控制**: 支持禁用/启用单个菜单项
7. **上下文感知**: 可根据触发元素或选中内容显示不同菜单

### API 设计

```javascript
// 创建实例
const menu = new ContextMenu();

// 注册菜单项
menu.register({
  id: 'copy',
  text: '复制',
  icon: '📋',
  shortcut: 'Ctrl+C',
  onClick: (info) => {
    console.log('复制选中文本:', info.selectionText);
  }
});

// 添加分隔线
menu.divider();

// 添加子菜单
menu.submenu('编辑', (sub) => {
  sub.register({ id: 'undo', text: '撤销', icon: '↩', onClick: () => {} });
  sub.register({ id: 'redo', text: '重做', icon: '↪', onClick: () => {} });
});

// 添加禁用项
menu.register({
  id: 'delete',
  text: '删除',
  icon: '🗑',
  disabled: true,
  onClick: () => {}
});

// 条件显示
menu.register({
  id: 'paste',
  text: '粘贴',
  visible: (info) => !!info.clipboardText,
  onClick: () => {}
});

// 显示/隐藏
menu.show(x, y);
menu.hide();

// 销毁
menu.destroy();

// 链式调用
menu.register({...}).register({...}).divider().register({...});
```

### 菜单信息对象 (MenuInfo)
```typescript
{
  x: number,              // 鼠标点击X坐标
  y: number,              // 鼠标点击Y坐标
  target: Element,        // 触发右键点击的元素
  selectionText: string,  // 选中的文本
  clipboardText: string,  // 剪贴板内容
  href: string,           // 如果是链接元素，获取href
  tagName: string,        // 触发元素的标签名
  // ... 可扩展
}
```

## Component Inventory

### ContextMenu.MenuItem
- **状态**: default / hover / disabled / active(点击中)
- **结构**: `[icon?] text [shortcut?] [arrow?]`
- **Hover**: 背景色变化，左侧出现高亮条

### ContextMenu.SubMenu
- 触发方式: hover + delay(100ms) 或 click
- 展开方向: 自动计算，优先右侧，边界溢出时左侧展开
- 指示器: 右侧箭头图标

### ContextMenu.Divider
- 纯视觉分隔，宽度100%，高度1px
- hover状态保持不变

### ContextMenu.ShortcutHint
- 右对齐，灰色文字
- 键盘组合键展示: `Ctrl+Shift+S`

## Technical Approach

### 架构
- **单文件模块**: 所有代码在一个IIFE中，可直接引入
- **类模式**: ES6 Class语法，实例化管理
- **事件委托**: 菜单事件通过document委托
- **动态定位**: 根据视口边界智能调整菜单位置

### 文件结构
```
context-menu/
├── SPEC.md
├── dist/
│   ├── context-menu.js          # 压缩后的UMD版本
│   └── context-menu.min.js
├── examples/
│   └── demo.html                # 演示页面
└── context-menu.js              # 源码（带注释）
```

### 关键实现
1. **contextmenu事件拦截**: `document.addEventListener('contextmenu', handler)`
2. **菜单渲染**: 动态创建DOM，插入到body末尾
3. **位置计算**: `getBoundingClientRect()` + 边界检测
4. **层级管理**: z-index自动递增，支持菜单嵌套
5. **焦点管理**: ESC键关闭菜单，Tab导航

## Keyboard Support

| 按键 | 行为 |
|------|------|
| Esc | 关闭菜单 |
| ↑/↓ | 上下导航 |
| Enter | 执行选中项 |
| → | 打开子菜单 |
| ← | 返回上级菜单 |

## Browser Compatibility

- 现代浏览器（Chrome 60+, Firefox 55+, Safari 11+, Edge 79+）
- 无外部依赖，纯原生实现
- 支持ES6+语法