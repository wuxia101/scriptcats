/**
 * XUtils - 通用工具函数库
 *
 * 功能特性:
 * - 文件下载、延时等待、超时控制
 * - Cookie 操作、HTML 编解码
 * - 字符串/数值/日期/温度常用工具
 * - JSON 转 CSV、DOM 元素移除
 * - 一次性函数、异步/Promise 检测
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
    root.XUtils = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function () {

  // ─── 类型检测 ───────────────────────────────────────

  /**
   * 判断是否为 Promise 对象
   * @param {*} o - 待检测值
   * @returns {boolean}
   */
  function isPromise(o) {
    if (!o) return false;
    if (typeof o.then === 'function') return true;
    if (o instanceof Promise) return true;
    if (Object.prototype.toString.call(o) === '[object Promise]') return true;
    if (o[Symbol.toStringTag] === 'Promise') return true;
    if (o[Symbol.toStringTag] === 'WrapperPromise') return true;
    return false;
  }

  /**
   * 判断是否为异步函数
   * @param {*} o - 待检测值
   * @returns {boolean}
   */
  function isAsyncFunction(o) {
    if (typeof o !== 'function') return false;
    if (Object.prototype.toString.call(o) === '[object AsyncFunction]') return true;
    if (o[Symbol.toStringTag] === 'AsyncFunction') return true;
    return false;
  }

  // ─── 文件操作 ───────────────────────────────────────

  /**
   * 下载文本文件
   * @param {string} fileName - 文件名
   * @param {string} content - 文件内容
   */
  function downloadText(fileName, content) {
    const a = document.createElement('a');
    a.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(content);
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  // ─── 延时与超时 ───────────────────────────────────────

  /**
   * 延时等待
   * @param {number} ms - 延时毫秒数
   * @returns {Promise<void>}
   */
  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 带超时的函数执行，超时后 Promise 被 reject
   * @param {Function} fn - 要执行的函数（同步或异步）
   * @param {number} [timeout=5000] - 超时毫秒数
   * @returns {Promise<*>}
   */
  function timeoutFunc(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('timeout')), timeout || 5000);
      if (!isAsyncFunction(fn)) {
        try {
          const result = fn();
          clearTimeout(timer);
          resolve(result);
        } catch (e) {
          clearTimeout(timer);
          reject(e);
        }
        return;
      }
      fn().then(result => {
        clearTimeout(timer);
        resolve(result);
      }).catch(e => {
        clearTimeout(timer);
        reject(e);
      });
    });
  }

  // ─── 字符串工具 ───────────────────────────────────────

  /**
   * 判断字符串是否包含子串
   * @param {string} s - 源字符串
   * @param {string} a - 子串
   * @returns {boolean}
   */
  function contains(s, a) {
    return s && a ? s.indexOf(a) > -1 : false;
  }

  /**
   * 反转字符串
   * @param {string} str - 源字符串
   * @returns {string}
   */
  function reverse(str) {
    return str.split('').reverse().join('');
  }

  /**
   * HTML 编码（转义特殊字符）
   * @param {string} str - 源字符串
   * @returns {string}
   */
  function HTMLEnCode(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/ /g, '&nbsp;')
      .replace(/"/g, '&quot;');
  }

  /**
   * HTML 解码（还原特殊字符）
   * @param {string} str - 源字符串
   * @returns {string}
   */
  function HTMLDeCode(str) {
    return str
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&nbsp;/g, ' ')
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&');
  }

  // ─── Cookie 操作 ───────────────────────────────────────

  /**
   * 获取 Cookie 值
   * @param {string} name - Cookie 名
   * @returns {string|null}
   */
  function getCookie(name) {
    if (document.cookie.length > 0) {
      const start = document.cookie.indexOf(name + '=');
      if (start !== -1) {
        const end = document.cookie.indexOf(';', start + name.length + 1);
        return unescape(document.cookie.substring(
          start + name.length + 1,
          end === -1 ? document.cookie.length : end
        ));
      }
    }
    return null;
  }

  /**
   * 设置 Cookie 值
   * @param {string} name - Cookie 名
   * @param {string} value - Cookie 值
   * @param {number} [expiredays] - 过期天数
   */
  function setCookie(name, value, expiredays) {
    const exdate = new Date();
    exdate.setDate(exdate.getDate() + expiredays);
    let content = name + '=' + escape(value);
    if (expiredays != null) {
      content += '; expires=' + exdate.toGMTString();
    }
    document.cookie = content;
  }

  // ─── 数值工具 ───────────────────────────────────────

  /**
   * 获取随机布尔值
   * @returns {boolean}
   */
  function randomBool() {
    return Math.random() >= 0.5;
  }

  /**
   * 判断数字是否为偶数
   * @param {number} num
   * @returns {boolean}
   */
  function isEven(num) {
    return num % 2 === 0;
  }

  /**
   * 获取所有参数的平均值
   * @param {...number} args
   * @returns {number}
   */
  function average(...args) {
    return args.reduce((a, b) => a + b) / args.length;
  }

  /**
   * 保留小数点（非四舍五入，截断）
   * @param {number} n - 数值
   * @param {number} fixed - 小数位数
   * @returns {number}
   */
  function toFixed(n, fixed) {
    return ~~(Math.pow(10, fixed) * n) / Math.pow(10, fixed);
  }

  // ─── 日期与温度 ───────────────────────────────────────

  /**
   * 判断日期是否为工作日
   * @param {Date} date
   * @returns {boolean}
   */
  function isWeekDay(date) {
    return date.getDay() % 6 !== 0;
  }

  /**
   * 从日期对象中获取时间字符串 (HH:MM:SS)
   * @param {Date} date
   * @returns {string}
   */
  function timeFromDate(date) {
    return date.toTimeString().slice(0, 8);
  }

  /**
   * 摄氏度转华氏度
   * @param {number} celsius
   * @returns {number}
   */
  function celsiusToFahrenheit(celsius) {
    return (celsius * 9) / 5 + 32;
  }

  /**
   * 华氏度转摄氏度
   * @param {number} fahrenheit
   * @returns {number}
   */
  function fahrenheitToCelsius(fahrenheit) {
    return ((fahrenheit - 32) * 5) / 9;
  }

  // ─── DOM 操作 ───────────────────────────────────────

  /**
   * 动态加载外部 JS 脚本
   * @param {string} url - 脚本 URL
   * @param {Function} [callback] - 加载完成回调
   */
  function createScriptElement(url, callback) {
    const script = document.createElement('script');
    const fn = callback || function () {};
    script.type = 'text/javascript';

    if (script.readyState) {
      // IE 兼容
      script.onreadystatechange = function () {
        if (script.readyState === 'loaded' || script.readyState === 'complete') {
          script.onreadystatechange = null;
          fn();
        }
      };
    } else {
      script.onload = function () {
        fn();
      };
    }

    script.src = url;
    document.getElementsByTagName('head')[0].appendChild(script);
  }

  /**
   * 移除指定 CSS 选择器的 DOM 元素
   * @param {string|string[]} selectors - CSS 选择器或选择器数组
   * @param {boolean} [once=false] - true 时只移除第一个匹配元素
   */
  function removeClassElement(selectors, once) {
    const remove = function (selector) {
      const elements = once
        ? document.querySelector(selector)
        : document.querySelectorAll(selector);

      if (!elements) return;

      if (elements.remove) {
        elements.remove();
      } else if (elements.forEach) {
        elements.forEach(e => e.remove());
      }
    };

    if (typeof selectors === 'string') {
      remove(selectors);
    } else if (Array.isArray(selectors)) {
      for (const selector of selectors) {
        remove(selector);
      }
    }
  }

  // ─── 数据转换 ───────────────────────────────────────

  /**
   * JSON 数组转 CSV 字符串
   * @param {Object[]} jsonData - 对象数组
   * @returns {string}
   */
  function jsonToCsv(jsonData) {
    if (!Array.isArray(jsonData) || jsonData.length === 0) return '';

    const keys = Object.keys(jsonData[0]);
    let result = keys.join(',') + '\n';

    jsonData.forEach(row => {
      let csvRow = '';
      keys.forEach((key, index) => {
        let value = String(row[key]).replace(/"/g, '""');
        if (value.indexOf(',') !== -1 || value.indexOf('\n') !== -1) {
          value = '"' + value + '"';
        }
        csvRow += index > 0 ? ',' + value : value;
      });
      result += csvRow + '\n';
    });

    return result;
  }


  // ─── 函数工具 ───────────────────────────────────────

  /**
   * 创建只执行一次的函数包装
   * @param {Function} fn - 源函数
   * @returns {Function}
   */
  function toOnceFn(fn) {
    let shot = false;
    return function (...args) {
      if (shot) return;
      shot = true;
      return fn(...args);
    };
  }

  // ─── 导出 ───────────────────────────────────────

  return {
    // 类型检测
    isPromise,
    isAsyncFunction,

    // 文件操作
    downloadText,

    // 延时与超时
    sleep,
    timeoutFunc,

    // 字符串工具
    contains,
    reverse,
    HTMLEnCode,
    HTMLDeCode,

    // Cookie 操作
    getCookie,
    setCookie,

    // 数值工具
    randomBool,
    isEven,
    average,
    toFixed,

    // 日期与温度
    isWeekDay,
    timeFromDate,
    celsiusToFahrenheit,
    fahrenheitToCelsius,

    // DOM 操作
    createScriptElement,
    removeClassElement,

    // 数据转换
    jsonToCsv,

    // 函数工具
    toOnceFn,
  };
});
