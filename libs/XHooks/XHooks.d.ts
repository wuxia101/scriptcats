/**
 * XHooks - Web API Hook 工具库 类型声明
 * 依赖: XUtils（需在 window 对象上预先绑定）
 *
 * @version 1.0.0
 * @author tianyuanfeng
 */

// ─── Hook 回调类型 ────────────────────────────

/** 前置 Hook 回调：接收原始参数，返回修改后的参数数组 */
type PreHookFn = (...args: any[]) => any[];

/** 后置 Hook 回调：接收原始结果，返回修改后的结果 */
type PostHookFn = (result: any) => any;

/** XMLHttpRequest open 方法前置回调 */
type XHROpenHookFn = (
  method: string,
  url: string,
  async: boolean,
  user?: string | null,
  password?: string | null
) => [string, string, boolean, string | null, string | null];

// ─── XHooks 接口 ────────────────────────────

declare namespace XHooks {
  /**
   * Hook JSON.parse
   * @param pre - 前置处理，接收 [text, reviver]，返回修改后的参数数组。null 则使用默认日志处理
   * @param post - 后置处理，接收解析结果对象。null 则使用默认日志处理
   */
  function hookJSONParse(pre: PreHookFn | null, post: PostHookFn | null): void;

  /**
   * Hook JSON.stringify
   * @param pre - 前置处理，接收 [value, replacer, space]，返回修改后的参数数组
   * @param post - 后置处理，接收序列化后的字符串
   */
  function hookJSONStringify(pre: PreHookFn | null, post: PostHookFn | null): void;

  /**
   * Hook fetch
   * 原始 fetch 备份在 window.fetch_origin
   * @param pre - 前置处理，接收 [url, options]，返回修改后的参数数组
   * @param post - 后置处理，接收 Response 对象
   */
  function hookFetch(pre: PreHookFn | null, post: PostHookFn | null): void;

  /**
   * Hook XMLHttpRequest
   * 原始类备份在 window.XMLHttpRequest_origin
   * @param fn_open - open 方法前置回调，接收 [method, url, async, user, password]
   * @param fn_send_pre - send 方法前置回调，接收发送数据
   * @param fn_send_post - send 方法后置回调，接收 responseText
   */
  function hookXMLHttpRequest(
    fn_open?: XHROpenHookFn | null,
    fn_send_pre?: PreHookFn | null,
    fn_send_post?: PostHookFn | null
  ): void;

  /**
   * Hook Promise.resolve
   * 原始 Promise 备份在 window.Promise_origin
   * @param fn_resolve_pre - resolve 前置回调，接收 resolve 值数组，返回修改后的值数组
   */
  function hookPromise(fn_resolve_pre?: PreHookFn | null): void;

  /**
   * Hook Web API 对象（使用 Proxy 代理）
   * 支持: 'window' | 'document' | 'location' | 'navigator' | 'history' | 'screen' | 'localStorage' | 'sessionStorage'
   * @param names - 要代理的对象名称
   */
  function hookWebAPI(...names: WebAPIName[]): void;
}

// ─── WebAPI 名称类型 ────────────────────────────

type WebAPIName =
  | 'window'
  | 'document'
  | 'location'
  | 'navigator'
  | 'history'
  | 'screen'
  | 'localStorage'
  | 'sessionStorage';

// ─── 全局扩展（Hook 备份的原始对象）────────────────────────

interface Window {
  /** hookFetch 备份的原始 fetch 函数 */
  fetch_origin?: typeof fetch;
  /** hookXMLHttpRequest 备份的原始 XMLHttpRequest 类 */
  XMLHttpRequest_origin?: typeof XMLHttpRequest;
  /** hookPromise 备份的原始 Promise 类 */
  Promise_origin?: PromiseConstructor;
  XHooks: XHooks;
}

declare const XHooks: XHooks;

export = XHooks;
