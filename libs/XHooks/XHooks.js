/**
 * XHooks - Web API Hook 工具库
 *
 * 功能特性:
 * - Hook JSON.parse / JSON.stringify / fetch / XMLHttpRequest / Promise
 * - Proxy 代理 window / document / location 等全局对象
 * - localStorage / sessionStorage setItem/getItem 监听
 * - 可选日志输出，支持通过 localStorage 动态开关
 *
 * 依赖: XUtils（需在 window 对象上预先绑定）
 *
 * @version 1.0.0
 * @author wuxia
 * @license MIT
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.XHooks = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function () {

  // ─── 依赖检测 ───────────────────────────────────────

  const XUtils = (typeof window !== 'undefined' && window.XUtils)
    || (typeof self !== 'undefined' && self.XUtils)
    || (typeof global !== 'undefined' && global.XUtils);

  if (!XUtils) {
    console.error('[XHooks] XUtils 未加载！请先引入 XUtils.js，确保 window.XUtils 可用。');
    return {};
  }

  const isPromise = XUtils.isPromise;
  const isAsyncFunction = XUtils.isAsyncFunction;

  // ─── 内部状态 ───────────────────────────────────────

  // 保存原生 JSON 方法，避免被后续 hook 影响
  const _JSON_stringify = JSON.stringify;
  const _JSON_parse = JSON.parse;

  // Hook 日志开关映射（值由 localStorage 同步）
  const hiddenHookLogMap = {
    '[global.fetch]': false,
    '[JSON.parse]': false,
    '[JSON.stringify]': false,
    '[Promise.resolve]': false,
    '[global.XMLHttpRequest]': false,
    '[global.window]': false,
    '[global.document]': false,
    '[global.location]': false,
    '[global.navigator]': false,
    '[global.history]': false,
    '[global.screen]': false,
    '[global.localStorage]': false,
    '[global.sessionStorage]': false,
  };

  // ─── 内部工具 ───────────────────────────────────────

  function isValidHookParam(param) {
    return !(param === undefined || param === null || param === '' || (Array.isArray(param) && param.length === 0));
  }

  function isValidHookParams(...params) {
    if (!isValidHookParam(params)) return false;
    if (params.some(v => isPromise(v))) return false;
    return true;
  }

  // 同步 hiddenHookLogMap 与 localStorage
  function syncLogMapFromStorage() {
    try {
      Object.keys(hiddenHookLogMap).forEach(key => {
        const stored = localStorage.getItem(key);
        if (stored !== null) {
          hiddenHookLogMap[key] = stored === 'true';
        }
      });
    } catch (e) {
      // localStorage 不可用时静默忽略
    }
  }
  syncLogMapFromStorage();

  // 监听 localStorage setItem/getItem，自动同步开关状态
  function watchLocalStorageForLogMap() {
    try {
      const _origSet = localStorage.setItem;
      const _origGet = localStorage.getItem;

      localStorage.setItem = function (key, value) {
        if (hiddenHookLogMap.hasOwnProperty(key)) {
          hiddenHookLogMap[key] = value === 'true';
        }
        return _origSet.call(localStorage, key, value);
      };

      localStorage.getItem = function (key) {
        const value = _origGet.call(localStorage, key);
        if (hiddenHookLogMap.hasOwnProperty(key) && value !== null) {
          hiddenHookLogMap[key] = value === 'true';
        }
        return value;
      };
    } catch (e) {
      // localStorage 不可用时静默忽略
    }
  }
  watchLocalStorageForLogMap();

  // Promise.withResolvers 兼容性补丁
  if (!Promise.withResolvers) {
    Promise.withResolvers = function () {
      let resolve, reject;
      const promise = new Promise(function (res, rej) {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    };
  }

  // ─── 核心：创建 Hook 函数 ───────────────────────────────

  /**
   * 创建 Hook 包装函数
   * @param {Function} fn - 目标原始函数
   * @param {Function} [pre] - 前置处理，接收参数并返回修改后的参数
   * @param {Function} [post] - 后置处理，接收结果并返回修改后的结果
   * @param {string} [name] - Hook 名称（用于日志标识）
   * @returns {Function}
   */
  function createHookFn(fn, pre, post, name) {
    name = name || '[未定义HookName]';

    const console_pre = function (...params) {
      if (!isValidHookParams(...params)) return params;
      if (hiddenHookLogMap[name] === true) {
        console.info('%c[XHook] [PreHook]%c' + name, 'color:green;background-color:#ccc', 'color:green', ...params);
      }
      return params;
    };

    const console_post = function (param) {
      if (!isValidHookParam(param)) return param;
      if (hiddenHookLogMap[name] === true) {
        console.info('%c[XHook] [PostHook]%c' + name, 'color:blue;background-color:#ccc', 'color:blue', param);
      }
      return param;
    };

    if (isAsyncFunction(fn)) {
      return async function (...args) {
        args = console_pre(...args);
        if (pre) args = pre(...args);
        let res = await fn(...args);
        res = console_post(res);
        if (post) res = post(res);
        return res;
      };
    }

    return function (...args) {
      args = console_pre(...args);
      if (pre) args = pre(...args);
      let res = fn(...args);

      if (!isPromise(res)) {
        res = console_post(res);
        if (post) res = post(res);
        return res;
      }

      // 处理 Promise 返回值
      const { promise, resolve, reject } = Promise.withResolvers();
      res.then(function (...ss) {
        ss = console_post(...ss);
        if (post) ss = post(...ss);
        resolve(...ss);
      }, function (e) {
        reject(e);
      });
      return promise;
    };
  }

  // ─── Hook 方法 ───────────────────────────────────────

  /**
   * Hook JSON.parse
   * @param {Function} [pre] - 前置处理函数
   * @param {Function} [post] - 后置处理函数
   */
  function hookJSONParse(pre, post) {
    JSON.parse = createHookFn(_JSON_parse, pre, post, '[JSON.parse]');
  }

  /**
   * Hook JSON.stringify
   * @param {Function} [pre] - 前置处理函数
   * @param {Function} [post] - 后置处理函数
   */
  function hookJSONStringify(pre, post) {
    JSON.stringify = createHookFn(_JSON_stringify, pre, post, '[JSON.stringify]');
  }

  /**
   * Hook fetch
   * @param {Function} [pre] - 前置处理函数
   * @param {Function} [post] - 后置处理函数
   */
  function hookFetch(pre, post) {
    window.fetch_origin = window.fetch;
    window.fetch = createHookFn(window.fetch, pre, post, '[global.fetch]');
  }

  /**
   * Hook XMLHttpRequest
   * @param {Function} [fn_open] - open 方法前置处理
   * @param {Function} [fn_send_pre] - send 方法前置处理
   * @param {Function} [fn_send_post] - send 方法后置处理（处理 responseText）
   */
  function hookXMLHttpRequest(fn_open, fn_send_pre, fn_send_post) {
    const XMLHttpRequest_origin = window.XMLHttpRequest;

    // 默认日志处理函数
    if (!fn_open) {
      fn_open = function (...params) {
        if (!isValidHookParams(...params)) return params;
        if (hiddenHookLogMap['[global.XMLHttpRequest]'] === true) {
          console.info('%c[XHook] [XMLHttpRequest] [PreHook] [open]', 'color:yellow;background-color:#000', ...params);
        }
        return params;
      };
    }

    if (!fn_send_pre) {
      fn_send_pre = function (...params) {
        if (!isValidHookParams(...params)) return params;
        if (hiddenHookLogMap['[global.XMLHttpRequest]'] === true) {
          console.info('%c[XHook] [XMLHttpRequest] [PreHook] [send]', 'color:blue;background-color:#ccc', ...params);
        }
        return params;
      };
    }

    if (!fn_send_post) {
      fn_send_post = function (params) {
        if (!isValidHookParams(...params)) return params;
        if (hiddenHookLogMap['[global.XMLHttpRequest]'] === true) {
          console.info('%c[XHook] [XMLHttpRequest] [PostHook] [send]' + _JSON_stringify(params), 'color:green;background-color:#ccc', params);
        }
        return params;
      };
    }

    // 封装的 XMLHttpRequest 类
    class WrappedXMLHttpRequest extends XMLHttpRequest_origin {
      open(method, url, async, user, password) {
        if (async === undefined) async = true;
        if (user === undefined) user = null;
        if (password === undefined) password = null;

        const args = fn_open(method, url, async, user, password);
        this._method = args[0] || method;
        this._url = args[1] || url;
        this._async = args[2] !== undefined ? args[2] : async;
        this._user = args[3] !== undefined ? args[3] : user;
        this._password = args[4] !== undefined ? args[4] : password;

        super.open(this._method, this._url, this._async, this._user, this._password);
      }

      send(data) {
        if (data === undefined) data = null;
        const self = this;
        const originalOnReadyStateChange = this.onreadystatechange || function () {};

        this.onreadystatechange = function () {
          try {
            if (self.readyState === XMLHttpRequest.DONE) {
              let responseText = fn_send_post(self.responseText);
              Promise.resolve(responseText).then(function () {
                originalOnReadyStateChange.call(self);
              });
            } else {
              originalOnReadyStateChange.call(self);
            }
          } catch (error) {
            console.error('[XHooks] Error in onreadystatechange:', error);
          }
        };

        data = fn_send_pre(data);
        super.send(data);
      }
    }

    window.XMLHttpRequest_origin = XMLHttpRequest_origin;
    window.XMLHttpRequest = WrappedXMLHttpRequest;
  }

  /**
   * Hook Promise.resolve
   * @param {Function} [fn_resolve_pre] - resolve 前置处理函数
   */
  function hookPromise(fn_resolve_pre) {
    const Promise_origin = window.Promise;

    if (!fn_resolve_pre) {
      fn_resolve_pre = function (...params) {
        if (!isValidHookParams(...params)) return params;
        if (hiddenHookLogMap['[Promise.resolve]'] === true) {
          console.info('%c[XHook] [Promise.resolve]', 'color:blue;background-color:#ccc', ...params);
        }
        return params;
      };
    }

    class WrapperPromise extends Promise_origin {
      constructor(cb) {
        super(function (resolve, reject) {
          cb(function (...params) {
            params = [...fn_resolve_pre(...params)];
            resolve(...params);
          }, reject);
        });
      }

      static resolve(...params) {
        params = [...fn_resolve_pre(...params)];
        return new Promise_origin(function (resolve) { resolve(...params); });
      }
    }

    window.Promise_origin = Promise_origin;
    window.Promise = WrapperPromise;
  }

  /**
   * Hook localStorage/sessionStorage 的 setItem/getItem
   * @param {string} name - 'localStorage' 或 'sessionStorage'
   * @param {string} set - setItem 方法名
   * @param {string} get - getItem 方法名
   */
  function hookStorageSetGet(name, set, get) {
    const storage = window[name];
    if (!storage) return;

    const originalSet = storage[set];
    if (originalSet) {
      storage[set] = function (key, value) {
        if (hiddenHookLogMap['[global.' + name + ']'] === true) {
          console.info('%c[XHook] [' + name + '.' + set + ']%c' + key + ' =%c' + value, 'color:blue;background-color:#ccc', 'color:green', 'color:blue;');
        }
        originalSet.call(storage, key, value);
      };
    }

    const originalGet = storage[get];
    if (originalGet) {
      storage[get] = function (key) {
        const value = originalGet.call(storage, key);
        if (hiddenHookLogMap['[global.' + name + ']'] === true) {
          console.info('%c[XHook] [' + name + '.' + get + ']%c' + key + ' =%c' + value, 'color:blue;background-color:#ccc', 'color:green', 'color:blue;');
        }
        return value;
      };
    }
  }

  /**
   * 创建 Proxy 监听处理器
   * @param {string} hookName - 日志标识名称
   * @returns {ProxyHandler}
   */
  function createWatchHandler(hookName) {
    return {
      set: function (obj, prop, value) {
        console.log('[XHook] [Proxy.set] ' + hookName + '.' + prop, value);
        return Reflect.set(obj, prop, value);
      },
      get: function (target, property, receiver) {
        console.log('[XHook] [Proxy.get] ' + hookName + '.' + property);
        return target[property];
      },
      apply: function (target, thisArg, argumentsList) {
        console.log('[XHook] [Proxy.apply] ' + hookName + ' 参数:', _JSON_stringify(argumentsList));
        const result = Reflect.apply(target, thisArg, argumentsList);
        console.log('[XHook] [Proxy.apply] ' + hookName + ' 返回:', _JSON_stringify(result));
        return result;
      }
    };
  }

  /**
   * Hook Web API 对象（使用 Proxy 代理）
   * 支持的对象名: 'window', 'document', 'location', 'navigator', 'history', 'screen', 'localStorage', 'sessionStorage'
   * @param {...string} names - 要监听的对象名称
   */
  function hookWebAPI(...names) {
    names.filter(v => !!v).forEach(function (name) {
      if (name === 'localStorage' || name === 'sessionStorage') {
        hookStorageSetGet(name, 'setItem', 'getItem');
        return;
      }
      if (name === 'window') {
        try {
          window[name] = new Proxy(window[name], createWatchHandler('[global.' + name + ']'));
        } catch (e) {
          console.warn('[XHooks] 无法 Proxy window:', e.message);
        }
        return;
      }
      const original = window[name];
      if (original) {
        try {
          window[name] = new Proxy(original, createWatchHandler('[global.' + name + ']'));
        } catch (e) {
          console.warn('[XHooks] 无法 Proxy ' + name + ':', e.message);
        }
      }
    });
  }

  // ─── 导出 ───────────────────────────────────────

  return {
    hookJSONParse: hookJSONParse,
    hookJSONStringify: hookJSONStringify,
    hookFetch: hookFetch,
    hookXMLHttpRequest: hookXMLHttpRequest,
    hookPromise: hookPromise,
    hookWebAPI: hookWebAPI,
  };
});
