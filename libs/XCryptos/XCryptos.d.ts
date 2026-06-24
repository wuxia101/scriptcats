/**
 * XCryptos - MD5 / HMAC-MD5 / WebCrypto Hash 加密工具库 类型声明
 *
 * @version 1.1.0
 * @author wuxia
 */

/** XCryptos 配置选项 */
interface XCryptosConfig {
  /** hex 输出大小写：0 = 小写（默认），1 = 大写 */
  hexcase?: number;
  /** Base64 填充字符，默认 ''（无填充），标准 Base64 用 '=' */
  b64pad?: string;
  /** 字符编码位宽：8 = ASCII 模式，16 = Unicode 模式（默认） */
  chrsz?: number;
}

/** WebCrypto 支持的哈希算法 */
type HashAlgorithm = 'SHA-1' | 'SHA-256' | 'SHA-384' | 'SHA-512';

declare namespace XCryptos {
  // ─── MD5 ────────────────────────────

  /**
   * 计算 MD5 哈希，返回十六进制字符串（默认小写）
   * @param s - 输入字符串
   * @returns 32 位 hex 字符串
   */
  function hex_md5(s: string): string;

  /**
   * 计算 MD5 哈希，返回 Base64 字符串
   * @param s - 输入字符串
   * @returns Base64 编码字符串
   */
  function b64_md5(s: string): string;

  /**
   * 计算 MD5 哈希，返回原始字符串（原始二进制字符）
   * @param s - 输入字符串
   * @returns 原始字符串
   */
  function str_md5(s: string): string;

  // ─── HMAC-MD5 ────────────────────────────

  /**
   * 计算 HMAC-MD5，返回十六进制字符串
   * @param key - HMAC 密钥
   * @param data - 输入数据
   * @returns 32 位 hex 字符串
   */
  function hex_hmac_md5(key: string, data: string): string;

  /**
   * 计算 HMAC-MD5，返回 Base64 字符串
   * @param key - HMAC 密钥
   * @param data - 输入数据
   * @returns Base64 编码字符串
   */
  function b64_hmac_md5(key: string, data: string): string;

  /**
   * 计算 HMAC-MD5，返回原始字符串
   * @param key - HMAC 密钥
   * @param data - 输入数据
   * @returns 原始字符串
   */
  function str_hmac_md5(key: string, data: string): string;

  // ─── WebCrypto Hash ────────────────────────────

  /**
   * 使用 WebCrypto API 计算哈希（SHA-1/256/384/512），
   * 不可用时降级为非加密数字哈希，返回 'fallback_' 前缀字符串
   *
   * @param text - 输入文本
   * @param algorithm - 哈希算法，默认 'SHA-256'
   * @returns hex 格式哈希字符串，降级时为 'fallback_' + 数字
   */
  function computeHash(text: string, algorithm?: HashAlgorithm): Promise<string>;

  // ─── 工具 ────────────────────────────

  /**
   * MD5 自检测试，验证算法实现正确性
   * @returns true 表示 MD5 实现正确
   */
  function md5_vm_test(): boolean;

  /**
   * 更新配置选项
   * @param options - 配置项
   */
  function configure(options: XCryptosConfig): void;
}

declare const XCryptos: XCryptos;

export = XCryptos;
