/**
 * XUtils - 通用工具函数库 类型声明
 * @version 1.0.0
 * @author tianyuanfeng
 */

declare namespace XUtils {
  // ─── 类型检测 ────────────────────────────

  /** 判断值是否为 Promise 对象 */
  function isPromise(o: any): boolean;

  /** 判断值是否为异步函数 (async function) */
  function isAsyncFunction(o: any): boolean;

  // ─── 文件操作 ────────────────────────────

  /** 触发浏览器下载文本文件 */
  function downloadText(fileName: string, content: string): void;

  // ─── 延时与超时 ────────────────────────────

  /** 延时等待 */
  function sleep(ms: number): Promise<void>;

  /** 带超时的函数执行，超时则 reject Error('timeout') */
  function timeoutFunc<T>(fn: (() => T) | (() => Promise<T>), timeout?: number): Promise<T>;

  // ─── 字符串工具 ────────────────────────────

  /** 判断源字符串是否包含子串 */
  function contains(s: string, a: string): boolean;

  /** 反转字符串 */
  function reverse(str: string): string;

  /** HTML 编码，转义 & < > " 及空格 */
  function HTMLEnCode(str: string): string;

  /** HTML 解码，还原转义字符 */
  function HTMLDeCode(str: string): string;

  // ─── Cookie 操作 ────────────────────────────

  /** 获取 Cookie 值，不存在返回 null */
  function getCookie(name: string): string | null;

  /** 设置 Cookie，可指定过期天数 */
  function setCookie(name: string, value: string, expiredays?: number): void;

  // ─── 数值工具 ────────────────────────────

  /** 获取随机布尔值 */
  function randomBool(): boolean;

  /** 判断数字是否为偶数 */
  function isEven(num: number): boolean;

  /** 计算所有参数的平均值 */
  function average(...args: number[]): number;

  /** 保留小数位（截断，非四舍五入） */
  function toFixed(n: number, fixed: number): number;

  // ─── 日期与温度 ────────────────────────────

  /** 判断日期是否为工作日（周一至周五） */
  function isWeekDay(date: Date): boolean;

  /** 从日期中提取时间字符串 HH:MM:SS */
  function timeFromDate(date: Date): string;

  /** 摄氏度转华氏度 */
  function celsiusToFahrenheit(celsius: number): number;

  /** 华氏度转摄氏度 */
  function fahrenheitToCelsius(fahrenheit: number): number;

  // ─── DOM 操作 ────────────────────────────

  /** 动态加载外部 JS 脚本 */
  function createScriptElement(url: string, callback?: () => void): void;

  /** 移除匹配选择器的 DOM 元素 */
  function removeClassElement(selectors: string | string[], once?: boolean): void;

  // ─── 数据转换 ────────────────────────────

  /** JSON 对象数组转 CSV 字符串 */
  function jsonToCsv(jsonData: Record<string, any>[]): string;

  // ─── 函数工具 ────────────────────────────

  /** 创建只执行一次的函数包装 */
  function toOnceFn<T extends (...args: any[]) => any>(fn: T): (...args: Parameters<T>) => ReturnType<T> | undefined;
}

declare const XUtils: XUtils;

export = XUtils;
