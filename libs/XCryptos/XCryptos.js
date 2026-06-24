/**
 * XCryptos - MD5 / HMAC-MD5 / WebCrypto Hash 加密工具库
 *
 * 功能特性:
 * - 纯 JavaScript 实现 MD5 算法，无任何外部依赖
 * - 支持 hex / Base64 / raw string 三种输出格式
 * - 支持 HMAC-MD5（基于密钥的消息认证）
 * - 支持 WebCrypto API 计算 SHA 系列哈希（含降级 fallback）
 * - 可配置大小写、Base64 填充、字符编码位宽
 *
 * @version 1.1.0
 * @author wuxia
 * @license MIT
 */

(function (root, factory) {
  if (typeof define === 'function' && define.amd) {
    define([], factory);
  } else if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.XCryptos = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function () {

  // ─── 配置 ───────────────────────────────────────

  var hexcase = 0;    // 0 = 小写 hex, 1 = 大写 hex
  var b64pad = '';     // Base64 填充字符，默认无填充
  var chrsz = 16;     // 字符编码位宽：8 = ASCII, 16 = Unicode

  /**
   * 更新配置选项
   * @param {Object} options
   * @param {number} [options.hexcase] - 0 小写 / 1 大写
   * @param {string} [options.b64pad] - Base64 填充字符
   * @param {number} [options.chrsz] - 字符位宽 (8 或 16)
   */
  function configure(options) {
    if (options.hexcase !== undefined) hexcase = options.hexcase;
    if (options.b64pad !== undefined) b64pad = options.b64pad;
    if (options.chrsz !== undefined) chrsz = options.chrsz;
  }

  // ─── MD5 公开方法 ───────────────────────────────────────

  /**
   * 计算 MD5 哈希，返回十六进制字符串
   * @param {string} s - 输入字符串
   * @returns {string} MD5 hex 字符串（默认小写）
   */
  function hex_md5(s) {
    return binl2hex(core_md5(str2binl(s), s.length * chrsz));
  }

  /**
   * 计算 MD5 哈希，返回 Base64 字符串
   * @param {string} s - 输入字符串
   * @returns {string} MD5 Base64 字符串
   */
  function b64_md5(s) {
    return binl2b64(core_md5(str2binl(s), s.length * chrsz));
  }

  /**
   * 计算 MD5 哈希，返回原始字符串
   * @param {string} s - 输入字符串
   * @returns {string} MD5 raw 字符串
   */
  function str_md5(s) {
    return binl2str(core_md5(str2binl(s), s.length * chrsz));
  }

  // ─── HMAC-MD5 公开方法 ───────────────────────────────────────

  /**
   * 计算 HMAC-MD5，返回十六进制字符串
   * @param {string} key - HMAC 密钥
   * @param {string} data - 输入数据
   * @returns {string} HMAC-MD5 hex 字符串
   */
  function hex_hmac_md5(key, data) {
    return binl2hex(core_hmac_md5(key, data));
  }

  /**
   * 计算 HMAC-MD5，返回 Base64 字符串
   * @param {string} key - HMAC 密钥
   * @param {string} data - 输入数据
   * @returns {string} HMAC-MD5 Base64 字符串
   */
  function b64_hmac_md5(key, data) {
    return binl2b64(core_hmac_md5(key, data));
  }

  /**
   * 计算 HMAC-MD5，返回原始字符串
   * @param {string} key - HMAC 密钥
   * @param {string} data - 输入数据
   * @returns {string} HMAC-MD5 raw 字符串
   */
  function str_hmac_md5(key, data) {
    return binl2str(core_hmac_md5(key, data));
  }

  /**
   * MD5 自检测试，验证算法实现正确性
   * @returns {boolean} true 表示实现正确
   */
  function md5_vm_test() {
    return hex_md5('abc') === '900150983cd24fb0d6963f7d28e17f72';
  }

  // ─── WebCrypto Hash ───────────────────────────────────────

  /**
   * 支持的 WebCrypto 哈希算法名称
   * @type {string[]}
   */
  var SUPPORTED_ALGORITHMS = [
    'SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'
  ];

  /**
   * 使用 WebCrypto API 计算哈希，不可用时降级为非加密 hash
   *
   * @param {string} text - 输入文本
   * @param {string} [algorithm='SHA-256'] - 哈希算法，支持 SHA-1 / SHA-256 / SHA-384 / SHA-512
   * @returns {Promise<string>} 哈希字符串（hex 格式）；降级时返回 'fallback_' + 数字哈希
   */
  async function computeHash(text, algorithm) {
    if (algorithm === undefined) algorithm = 'SHA-256';

    var cryptoObj = globalThis.crypto || (typeof window !== 'undefined' ? window.crypto : null);

    if (!cryptoObj || !cryptoObj.subtle || !cryptoObj.subtle.digest) {
      console.warn('crypto.subtle 不可用，降级为普通hash');

      // 降级 hash（非加密，仅用于非安全场景）
      var hash = 0;
      for (var i = 0; i < text.length; i++) {
        var chr = text.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
      }

      return 'fallback_' + Math.abs(hash);
    }

    var encoder = new TextEncoder();
    var data = encoder.encode(text);

    var hashBuffer = await cryptoObj.subtle.digest(algorithm, data);

    return Array.from(new Uint8Array(hashBuffer))
      .map(function (b) { return b.toString(16).padStart(2, '0'); })
      .join('');
  }

  // ─── MD5 核心算法 ───────────────────────────────────────

  function core_md5(x, len) {
    x[len >> 5] |= 128 << (len % 32);
    x[((len + 64) >>> 9 << 4) + 14] = len;

    var a = 1732584193;
    var b = -271733879;
    var c = -1732584194;
    var d = 271733878;

    for (var i = 0; i < x.length; i += 16) {
      var olda = a, oldb = b, oldc = c, oldd = d;

      a = md5_ff(a, b, c, d, x[i + 0], 7, -680976936);
      d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
      c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
      b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
      a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
      d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
      c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
      b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
      a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
      d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
      c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
      b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
      a = md5_ff(a, b, c, d, x[i + 12], 7, 1804660682);
      d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
      c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
      b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

      a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
      d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
      c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
      b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
      a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
      d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
      c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
      b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
      a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
      d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
      c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
      b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
      a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
      d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
      c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
      b = md5_gg(b, c, d, a, x[i + 12], 20, -1921207734);

      a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
      d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
      c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
      b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
      a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
      d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
      c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
      b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
      a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
      d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
      c = md5_hh(c, d, a, b, x[i + 3], 16, -722881979);
      b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
      a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
      d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
      c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
      b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

      a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
      d = md5_ii(d, a, b, c, x[i + 7], 10, 11261161415);
      c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
      b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
      a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
      d = md5_ii(d, a, b, c, x[i + 3], 10, -1894446606);
      c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
      b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
      a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
      d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
      c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
      b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
      a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
      d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
      c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
      b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

      a = safe_add(a, olda);
      b = safe_add(b, oldb);
      c = safe_add(c, oldc);
      d = safe_add(d, oldd);
    }

    return [a, b, c, d];
  }

  // ─── MD5 辅助函数 ───────────────────────────────────────

  function md5_cmn(q, a, b, x, s, t) {
    return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
  }

  function md5_ff(a, b, c, d, x, s, t) {
    return md5_cmn((b & c) | (~b & d), a, b, x, s, t);
  }

  function md5_gg(a, b, c, d, x, s, t) {
    return md5_cmn((b & d) | (c & ~d), a, b, x, s, t);
  }

  function md5_hh(a, b, c, d, x, s, t) {
    return md5_cmn(b ^ c ^ d, a, b, x, s, t);
  }

  function md5_ii(a, b, c, d, x, s, t) {
    return md5_cmn(c ^ (b | ~d), a, b, x, s, t);
  }

  // ─── HMAC-MD5 ───────────────────────────────────────

  function core_hmac_md5(key, data) {
    var bkey = str2binl(key);
    if (bkey.length > 16) {
      bkey = core_md5(bkey, key.length * chrsz);
    }

    var ipad = new Array(16);
    var opad = new Array(16);
    for (var i = 0; i < 16; i++) {
      ipad[i] = bkey[i] ^ 909522486;
      opad[i] = bkey[i] ^ 1549556828;
    }

    var hash = core_md5(ipad.concat(str2binl(data)), 512 + data.length * chrsz);
    return core_md5(opad.concat(hash), 512 + 128);
  }

  // ─── 位运算 ───────────────────────────────────────

  function safe_add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF);
    var msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  function bit_rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  // ─── 编码转换 ───────────────────────────────────────

  function str2binl(str) {
    var bin = [];
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < str.length * chrsz; i += chrsz) {
      bin[i >> 5] |= (str.charCodeAt(i / chrsz) & mask) << (i % 32);
    }
    return bin;
  }

  function binl2str(bin) {
    var str = '';
    var mask = (1 << chrsz) - 1;
    for (var i = 0; i < bin.length * 32; i += chrsz) {
      str += String.fromCharCode((bin[i >> 5] >>> (i % 32)) & mask);
    }
    return str;
  }

  function binl2hex(binarray) {
    var hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef';
    var str = '';
    for (var i = 0; i < binarray.length * 4; i++) {
      str += hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xF)
           + hex_tab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xF);
    }
    return str;
  }

  function binl2b64(binarray) {
    var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    var str = '';
    for (var i = 0; i < binarray.length * 4; i += 3) {
      var triplet = (((binarray[i >> 2] >> 8 * (i % 4)) & 0xFF) << 16)
                  | (((binarray[i + 1 >> 2] >> 8 * ((i + 1) % 4)) & 0xFF) << 8)
                  | ((binarray[i + 2 >> 2] >> 8 * ((i + 2) % 4)) & 0xFF);
      for (var j = 0; j < 4; j++) {
        if (i * 8 + j * 6 > binarray.length * 32) {
          str += b64pad;
        } else {
          str += tab.charAt((triplet >> 6 * (3 - j)) & 0x3F);
        }
      }
    }
    return str;
  }

  // ─── 导出 ───────────────────────────────────────

  return {
    // MD5
    hex_md5: hex_md5,
    b64_md5: b64_md5,
    str_md5: str_md5,

    // HMAC-MD5
    hex_hmac_md5: hex_hmac_md5,
    b64_hmac_md5: b64_hmac_md5,
    str_hmac_md5: str_hmac_md5,

    // WebCrypto Hash
    computeHash: computeHash,

    // 自检与配置
    md5_vm_test: md5_vm_test,
    configure: configure,
  };
});
