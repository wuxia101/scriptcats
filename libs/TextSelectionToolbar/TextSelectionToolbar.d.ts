/**
 * TextSelectionToolbar - 文本选择工具栏组件
 *
 * @version 1.0.0
 * @author ScriptCat
 */

/** 选区信息 */
interface SelectionInfo {
  text: string;
  selection: Selection;
  range: Range;
}

/** 按钮配置 */
interface ButtonConfig {
  /** 按钮唯一 ID（必填） */
  id: string;
  /** 按钮图标（支持 emoji、SVG 字符串、HTML 字符串） */
  icon?: string;
  /** 按钮标题（hover 提示文字，showTitle 为 true 时在按钮内显示） */
  title?: string;
  /** 是否在按钮上同时显示 title 文字，默认跟随全局 options.showTitle */
  showTitle?: boolean;
  /** 点击回调函数 */
  action?: (selection: SelectionInfo) => void;
}

/** 按钮组配置项（支持按钮或分隔线） */
interface ButtonGroupItem extends ButtonConfig {
  /** 是否为分隔线 */
  divider?: boolean;
}

/** 工具栏配置选项 */
interface ToolbarOptions {
  /** 监听文本选择的容器 CSS 选择器，默认整个文档 */
  container?: string | null;
  /** 最大按钮数量 */
  maxButtons?: number;
  /** 显示延迟（毫秒），等待选区稳定 */
  showDelay?: number;
  /** 隐藏延迟（毫秒） */
  hideDelay?: number;
  /** 水平偏移量 */
  offsetX?: number;
  /** 垂直偏移量（相对于选区） */
  offsetY?: number;
  /** 工具栏层级 */
  zIndex?: number;
  /** 全局默认是否在按钮上显示 title 文字（可被按钮级 showTitle 覆盖） */
  showTitle?: boolean;
}

/** 按钮内部数据 */
interface ButtonData {
  id: string;
  icon: string;
  title: string;
  showTitle: boolean;
  action: (selection: SelectionInfo) => void;
}

/** 按钮点击事件数据 */
interface ButtonClickEventData {
  button: ButtonData;
  selection: SelectionInfo;
  buttonId: string;
}

/** 事件类型 */
type ToolbarEventName = 'show' | 'hide' | 'buttonClick' | 'destroy';

/** 事件回调类型映射 */
interface ToolbarEventCallbacks {
  show: (selection: SelectionInfo) => void;
  hide: () => void;
  buttonClick: (data: ButtonClickEventData) => void;
  destroy: () => void;
}

declare class TextSelectionToolbar {
  /** 实例计数 */
  static instanceCount: number;

  /** 实例唯一 ID */
  id: string;

  /** 配置选项 */
  options: ToolbarOptions;

  /** 注册的按钮列表 */
  buttons: ButtonData[];

  /** 工具栏是否可见 */
  isVisible: boolean;

  /** 当前选区信息 */
  currentSelection: SelectionInfo | null;

  /** 显示定时器 */
  showTimer: ReturnType<typeof setTimeout> | null;

  /** 隐藏定时器 */
  hideTimer: ReturnType<typeof setTimeout> | null;

  /** 工具栏 DOM 元素 */
  toolbar: HTMLDivElement;

  /** 按钮容器 DOM 元素 */
  buttonContainer: HTMLDivElement;

  /** 监听目标元素 */
  listenTarget: HTMLElement;

  /** 事件监听器存储 */
  eventListeners: Partial<Record<ToolbarEventName, Function[]>>;

  /**
   * 创建工具栏实例
   * @param options - 配置选项
   */
  constructor(options?: ToolbarOptions);

  // ==================== 按钮管理 ====================

  /**
   * 注册单个按钮，支持链式调用
   * @param config - 按钮配置
   */
  registerButton(config: ButtonConfig): this;

  /**
   * 批量注册按钮和分隔线，支持链式调用
   * @param configs - 按钮配置数组
   */
  registerButtonGroup(configs: ButtonGroupItem[]): this;

  /**
   * 添加分隔线，支持链式调用
   */
  addDivider(): this;

  /**
   * 移除指定按钮，支持链式调用
   * @param buttonId - 按钮 ID
   */
  removeButton(buttonId: string): this;

  /**
   * 更新按钮配置，支持链式调用
   * @param buttonId - 按钮 ID
   * @param config - 新的配置
   */
  updateButton(buttonId: string, config: Partial<ButtonConfig>): this;

  /**
   * 获取单个按钮信息
   * @param buttonId - 按钮 ID
   */
  getButton(buttonId: string): ButtonData | undefined;

  /**
   * 获取所有按钮列表
   */
  getAllButtons(): ButtonData[];

  /**
   * 清空所有按钮，支持链式调用
   */
  clearButtons(): this;

  // ==================== 状态控制 ====================

  /**
   * 显示工具栏（需当前有选中文本），支持链式调用
   */
  show(): this;

  /**
   * 隐藏工具栏，支持链式调用
   */
  hide(): this;

  /**
   * 切换显示/隐藏状态，支持链式调用
   */
  toggle(): this;

  /**
   * 获取当前选中的文本和相关信息
   */
  getSelection(): SelectionInfo | null;

  /**
   * 更新配置选项，支持链式调用
   * @param options - 新的配置选项
   */
  setOptions(options: Partial<ToolbarOptions>): this;

  // ==================== 事件系统 ====================

  /**
   * 监听事件，支持链式调用
   * @param event - 事件名
   * @param callback - 回调函数
   */
  on<E extends ToolbarEventName>(event: E, callback: ToolbarEventCallbacks[E]): this;

  /**
   * 移除事件监听，支持链式调用
   * @param event - 事件名
   * @param callback - 回调函数
   */
  off<E extends ToolbarEventName>(event: E, callback: ToolbarEventCallbacks[E]): this;

  // ==================== 生命周期 ====================

  /**
   * 销毁组件，清理所有 DOM 和事件监听
   */
  destroy(): this;
}

export = TextSelectionToolbar;
export as namespace TextSelectionToolbar;
