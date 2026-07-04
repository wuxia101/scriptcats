/**
 * CNBClient - 脚本猫 CNB API 客户端库
 *
 * 功能特性:
 * - 创建 CNB Issue（标题/内容/标签/优先级/处理人/日期/可见性）
 * - 按 keyword 搜索 Issue（模糊匹配标题和内容）
 * - 判断指定 keyword 的 Issue 是否已存在
 * - Token 持久化存储（GM_getValue/GM_setValue）
 * - 底层 API 请求封装
 * - 自定义默认仓库配置
 *
 * 依赖 grants（宿主脚本需声明）:
 *   @grant GM_getValue
 *   @grant GM_setValue
 *   @grant GM_xmlhttpRequest
 *   @connect api.cnb.cool
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
    root.CNBClient = factory();
  }
})(typeof self !== 'undefined' ? self : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : this, function () {

  // ─── 配置 ───────────────────────────────────────────────

  const DEFAULT_REPO = "cnb/npc";
  const API_BASE = "https://api.cnb.cool";
  const TOKEN_STORAGE_KEY = "cnb_access_token";
  const VALID_PRIORITIES = ["-2P", "-1P", "P0", "P1", "P2", "P3"];

  // ─── Token 管理 ─────────────────────────────────────────

  /**
   * 获取存储的 access token
   * @returns {string|null}
   */
  function getToken() {
    try {
      return GM_getValue(TOKEN_STORAGE_KEY, null);
    } catch (e) {
      console.warn('[CNBClient] 读取 token 失败: ' + e.message);
      return null;
    }
  }

  /**
   * 持久化存储 access token
   * @param {string} token - access token
   */
  function setToken(token) {
    try {
      GM_setValue(TOKEN_STORAGE_KEY, token);
    } catch (e) {
      console.warn('[CNBClient] 保存 token 失败: ' + e.message);
    }
  }

  /**
   * 清除存储的 token
   */
  function clearToken() {
    try {
      GM_setValue(TOKEN_STORAGE_KEY, null);
    } catch (e) {
      console.warn('[CNBClient] 清除 token 失败: ' + e.message);
    }
  }

  /**
   * 检查是否已配置 token
   * @returns {boolean}
   */
  function hasToken() {
    return !!getToken();
  }

  // ─── API 请求 ───────────────────────────────────────────

  /**
   * 发送 CNB API 请求
   * @param {string} path - API 路径（不含 API_BASE）
   * @param {Object} [options] - 请求选项
   * @param {string} [options.method='GET'] - HTTP 方法
   * @param {Object} [options.params] - URL 查询参数，会自动 encodeURIComponent 并拼接
   * @param {Object} [options.body] - 请求体，会自动 JSON.stringify
   * @param {string} [options.token] - 自定义 token，不传则从存储读取
   * @returns {Promise<Object>}
   */
  function apiRequest(path, options) {
    var opts = options || {};
    var method = opts.method || 'GET';
    var params = opts.params;
    var body = opts.body;
    var token = opts.token;

    var accessToken = token || getToken();
    if (!accessToken) {
      throw new Error('未配置 CNB token，请先调用 CNBClient.setToken() 设置');
    }

    var url = API_BASE + '/' + path;

    // 拼接查询参数
    if (params) {
      var qs = Object.keys(params)
        .filter(function (k) { return params[k] !== undefined && params[k] !== null && params[k] !== ''; })
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params[k]); })
        .join('&');
      if (qs) {
        url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
      }
    }

    return new Promise(function (resolve, reject) {
      var xhrOpts = {
        url: url,
        method: method,
        headers: {
          Authorization: 'Bearer ' + accessToken,
          Accept: 'application/vnd.cnb.api+json',
          'Content-Type': 'application/json',
        },
        responseType: 'text',
        onload: function (response) {
          try {
            var responseData = JSON.parse(response.responseText);
            if (response.status < 200 || response.status >= 300) {
              var errMsg = responseData.errmsg || responseData.message || ('HTTP ' + response.status);
              reject(new Error('CNB API 请求失败: ' + errMsg));
              return;
            }
            resolve(responseData);
          } catch (e) {
            reject(new Error('CNB API 响应解析失败: ' + e.message));
          }
        },
        onerror: function (response) {
          reject(new Error('CNB API 网络请求失败: HTTP ' + (response && response.status || 'unknown')));
        },
        ontimeout: function () {
          reject(new Error('CNB API 请求超时'));
        },
      };

      if (body) {
        xhrOpts.data = JSON.stringify(body);
      }

      GM_xmlhttpRequest(xhrOpts);
    });
  }

  // ─── Issue 操作 ─────────────────────────────────────────

  /**
   * 创建 CNB Issue
   * @param {Object} options - 创建选项
   * @param {string} options.title - Issue 标题（必填）
   * @param {string} [options.body] - Issue 内容（支持 Markdown）
   * @param {string[]} [options.assignees] - 处理人列表（用户名，最多8个）
   * @param {string[]} [options.labels] - 标签列表（最多10个）
   * @param {string} [options.priority] - 优先级: -2P, -1P, P0, P1, P2, P3
   * @param {string} [options.startDate] - 开始日期 YYYY-MM-DD
   * @param {string} [options.endDate] - 结束日期 YYYY-MM-DD
   * @param {boolean} [options.invisible] - 是否不可见
   * @param {boolean} [options.workMode] - 是否开启工作模式
   * @param {string} [options.repo] - 仓库路径，默认 cnb/npc
   * @param {string} [options.token] - 自定义 token，默认从存储读取
   * @returns {Promise<Object>} 创建结果 { number, title, state, url, createdAt, author, raw }
   */
  function createIssue(options) {
    var opts = options || {};
    var title = opts.title;
    var body = opts.body || '';
    var assignees = opts.assignees || [];
    var labels = opts.labels || [];
    var priority = opts.priority;
    var startDate = opts.startDate;
    var endDate = opts.endDate;
    var invisible = opts.invisible || false;
    var workMode = opts.workMode || false;
    var repo = opts.repo || DEFAULT_REPO;
    var token = opts.token;

    // 参数校验
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('title 是必填项，且不能为空');
    }

    if (priority && VALID_PRIORITIES.indexOf(priority) === -1) {
      throw new Error('priority 无效，可选值: ' + VALID_PRIORITIES.join(', '));
    }

    if (assignees.length > 8) {
      throw new Error('assignees 最多 8 个');
    }

    if (labels.length > 10) {
      throw new Error('labels 最多 10 个');
    }

    // 构建请求体
    var payload = {
      title: title.trim(),
      body: body,
      assignees: assignees,
      labels: labels,
    };

    if (priority) payload.priority = priority;
    if (startDate) payload.start_date = startDate;
    if (endDate) payload.end_date = endDate;
    if (invisible) payload.invisible = true;
    if (workMode) payload.work_mode = true;

    // 发送请求
    return apiRequest(repo + '/-/issues', {
      method: 'POST',
      body: payload,
      token: token,
    }).then(function (responseData) {
      return {
        number: responseData.number,
        title: responseData.title,
        state: responseData.state,
        url: 'https://cnb.cool/' + repo + '/-/issues/' + responseData.number,
        createdAt: responseData.created_at,
        author: responseData.author ? responseData.author.username : null,
        raw: responseData,
      };
    });
  }

  /**
   * 搜索 Issue（按 keyword 模糊匹配标题和内容）
   * @param {Object} options - 搜索选项
   * @param {string} options.keyword - 搜索关键词（必填）
   * @param {number} [options.page=1] - 页码
   * @param {number} [options.perPage=20] - 每页数量
   * @param {string} [options.state] - 状态过滤: open / closed
   * @param {string} [options.priority] - 优先级过滤
   * @param {string} [options.labels] - 标签过滤（逗号分隔）
   * @param {string} [options.assignee] - 处理人过滤
   * @param {string} [options.repo] - 仓库路径，默认 cnb/npc
   * @param {string} [options.token] - 自定义 token
   * @returns {Promise<Object>} { items: Array, total: number, page: number, perPage: number }
   */
  function searchIssues(options) {
    var opts = options || {};
    var keyword = opts.keyword;
    var repo = opts.repo || DEFAULT_REPO;
    var token = opts.token;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      throw new Error('keyword 是必填项，且不能为空');
    }

    var params = {
      keyword: keyword.trim(),
      page: opts.page || 1,
      per_page: opts.perPage || 20,
    };

    if (opts.state) params.state = opts.state;
    if (opts.priority) params.priority = opts.priority;
    if (opts.labels) params.labels = opts.labels;
    if (opts.assignee) params.assignee = opts.assignee;

    return apiRequest(repo + '/-/issues', {
      method: 'GET',
      params: params,
      token: token,
    }).then(function (data) {
      // 兼容数组和分页对象两种返回格式
      if (Array.isArray(data)) {
        return {
          items: data,
          total: data.length,
          page: params.page,
          perPage: params.per_page,
        };
      }
      return {
        items: data.items || data.data || data || [],
        total: data.total || data.total_count || (Array.isArray(data.items) ? data.items.length : 0),
        page: data.page || params.page,
        perPage: data.per_page || data.perPage || params.per_page,
      };
    });
  }

  /**
   * 判断指定 keyword 对应的 Issue 是否已存在
   * @param {Object} options - 查询选项
   * @param {string} options.keyword - 搜索关键词（必填，如一个 URL、标题片段等）
   * @param {string} [options.state] - 仅检测特定状态的 Issue: open / closed
   * @param {string} [options.repo] - 仓库路径，默认 cnb/npc
   * @param {string} [options.token] - 自定义 token
   * @returns {Promise<boolean>}
   */
  function issueExists(options) {
    var opts = options || {};
    var keyword = opts.keyword;

    if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0) {
      throw new Error('keyword 是必填项，且不能为空');
    }

    return searchIssues({
      keyword: keyword,
      state: opts.state,
      repo: opts.repo || DEFAULT_REPO,
      token: opts.token,
      perPage: 1,
    }).then(function (result) {
      return result.total > 0;
    });
  }

  // ─── 配置管理 ───────────────────────────────────────────

  /**
   * 设置默认仓库（持久化）
   * @param {string} repo - 仓库路径，如 "cnb/npc"
   */
  function setDefaultRepo(repo) {
    try {
      GM_setValue('cnb_default_repo', repo);
    } catch (e) {
      console.warn('[CNBClient] 保存默认仓库失败: ' + e.message);
    }
  }

  /**
   * 获取默认仓库
   * @returns {string}
   */
  function getDefaultRepo() {
    try {
      return GM_getValue('cnb_default_repo', DEFAULT_REPO);
    } catch (e) {
      return DEFAULT_REPO;
    }
  }

  // ─── 导出 ───────────────────────────────────────────────

  return {
    // Token 管理
    getToken:       getToken,
    setToken:       setToken,
    clearToken:     clearToken,
    hasToken:       hasToken,

    // 配置
    setDefaultRepo: setDefaultRepo,
    getDefaultRepo: getDefaultRepo,
    DEFAULT_REPO:   DEFAULT_REPO,
    API_BASE:       API_BASE,
    VALID_PRIORITIES: VALID_PRIORITIES,

    // API 请求（底层）
    apiRequest: apiRequest,

    // Issue 操作
    createIssue: createIssue,
    searchIssues: searchIssues,
    issueExists: issueExists,
  };
});