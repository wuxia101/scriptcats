/**
 * LineLoadingProgress - 页面顶部加载进度条组件 类型声明
 *
 * @version 1.0.0
 * @author wuxia
 */

/** LineLoadingProgress 配置选项 */
interface LineLoadingProgressOptions {
  /** 进度条颜色，默认 '#35a935' */
  color?: string;
  /** 进度条高度，默认 '2px' */
  height?: string;
  /** z-index，默认 1000 */
  zIndex?: number;
  /** 是否自动 trickle（增量递进），默认 true */
  trickle?: boolean;
  /** trickle 间隔(ms)，默认 400 */
  trickleSpeed?: number;
  /** 每次 trickle 增量，默认 0.02 */
  trickleSize?: number;
  /** 最小进度值，默认 0.08 */
  minimum?: number;
  /** 最大进度值，默认 1.0 */
  maximum?: number;
  /** 进度变化动画时长(ms)，默认 300 */
  speed?: number;
  /** CSS easing 函数，默认 'ease' */
  easing?: string;
  /** 进度条 DOM id，默认 'wx_process' */
  parentId?: string;
  /** 是否显示右上角旋转 spinner，默认 false */
  showSpinner?: boolean;
  /** spinner 颜色，默认 '#35a935' */
  spinnerColor?: string;
}

declare class LineLoadingProgress {
  /**
   * 创建进度条实例
   * @param options - 配置选项
   */
  constructor(options?: LineLoadingProgressOptions);

  /** 当前配置选项 */
  options: LineLoadingProgressOptions;

  /** 当前进度值，null 表示未开始 */
  status: number | null;

  /**
   * 启动进度条（从 minimum 开始），自动 trickle
   * @returns this（支持链式调用）
   */
  start(): this;

  /**
   * 递增进度（模拟加载进度）
   * @param amount - 递增量，默认 trickleSize
   * @returns this
   */
  inc(amount?: number): this;

  /**
   * 手动设置进度值
   * @param n - 进度值 (0 ~ maximum)
   * @returns this
   */
  set(n: number): this;

  /**
   * 标记完成：快速推进到 100% 后淡出消失
   * @returns this
   */
  done(): this;

  /**
   * 隐藏进度条（直接移除 DOM）
   * @returns this
   */
  hide(): this;

  /**
   * 获取当前进度值
   * @returns 当前进度值，null 表示未开始
   */
  getProgress(): number | null;

  /**
   * 更新配置选项（动态修改颜色/高度等）
   * @param newOptions - 需更新的配置项
   * @returns this
   */
  configure(newOptions: Partial<LineLoadingProgressOptions>): this;

  /**
   * 销毁实例，移除所有 DOM 和定时器
   * @returns this
   */
  destroy(): this;
}

declare const LineLoadingProgress: LineLoadingProgress;

export = LineLoadingProgress;
