// ==UserScript==
// @name         SingBox 订阅解析器
// @namespace    https://scriptcat.org/
// @author       wuxia
// @version      0.1.0
// @description  解析订阅sing-box的config.json
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_setClipboard
// @grant        GM_registerMenuCommand
// @connect      *
// ==/UserScript==

(function () {
  "use strict";

  GM_registerMenuCommand("解析订阅生成 sing-box 配置", openPanel);

  function openPanel() {
    const url = prompt("请输入订阅 URL");
    if (!url) return;

    fetchText(url)
      .then((raw) => {
        let outbounds = [];

        if (raw.includes("proxies:")) {
          outbounds = parseClashYamlOutbounds(raw);
        } else {
          const links = extractLinks(raw);

          for (const link of links) {
            try {
              const node = parseNode(link);
              if (node) outbounds.push(node);
            } catch (e) {
              console.warn("解析失败:", link, e);
            }
          }
        }

        if (!outbounds.length) {
          alert("没有解析到可用节点");
          return;
        }

        const config = buildSingBoxConfig(outbounds);
        const json = JSON.stringify(config, null, 2);

        console.log(json);
        GM_setClipboard(json);

        if (
          confirm(
            `解析成功 ${outbounds.length} 个节点，已复制到剪贴板。是否下载 config.json？`,
          )
        ) {
          downloadText("config.json", json);
        }
      })
      .catch((err) => {
        alert("订阅拉取失败：" + err.message);
      });
  }

  function fetchText(url) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "GET",
        url,
        timeout: 15000,
        headers: {
          "User-Agent": "ClashforWindows/0.20.39",
          Accept: "*/*",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
        onload: (res) => {
          if (res.status >= 200 && res.status < 300) {
            resolve(res.responseText);
          } else {
            reject(
              new Error(
                `HTTP ${res.status}\n${res.responseText?.slice(0, 300) || ""}`,
              ),
            );
          }
        },
        onerror: () => reject(new Error("网络错误")),
        ontimeout: () => reject(new Error("请求超时")),
      });
    });
  }

  function extractLinks(raw) {
    console.log("订阅原始内容前500字符:", raw.slice(0, 500));

    let text = raw.trim();

    const decoded = tryBase64DecodeLoose(text);
    if (decoded && decoded.includes("://")) {
      console.log("base64 解码后前500字符:", decoded.slice(0, 500));
      text = decoded;
    }

    const links = [];

    // 不要只按行切，直接全局提取
    const reg =
      /(vmess|vless|trojan|ss|ssr|hy2|hysteria2|tuic):\/\/[^\s"'<>]+/g;
    let m;
    while ((m = reg.exec(text)) !== null) {
      links.push(m[0].trim());
    }

    console.log("提取到链接数量:", links.length);
    console.log("前几个链接:", links.slice(0, 5));

    return links;
  }

  function tryBase64DecodeLoose(input) {
    try {
      let s = input.trim();

      // 去掉所有换行和空白
      s = s.replace(/\s+/g, "");

      // URL-safe base64
      s = s.replace(/-/g, "+").replace(/_/g, "/");

      while (s.length % 4) s += "=";

      const binary = atob(s);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    } catch (e) {
      console.warn("base64 解码失败:", e);
      return null;
    }
  }

  function parseNode(link) {
    if (link.startsWith("vmess://")) return parseVmess(link);
    if (link.startsWith("vless://")) return parseVless(link);
    if (link.startsWith("trojan://")) return parseTrojan(link);
    if (link.startsWith("ss://")) return parseShadowsocks(link);
    return null;
  }

  function parseVmess(link) {
    const body = link.slice("vmess://".length);
    const jsonText = tryBase64Decode(body);
    if (!jsonText) throw new Error("vmess base64 decode failed");

    const v = JSON.parse(jsonText);

    const outbound = {
      type: "vmess",
      tag: safeTag(v.ps || v.add),
      server: v.add,
      server_port: Number(v.port),
      uuid: v.id,
      security: v.scy || "auto",
      alter_id: Number(v.aid || 0),
    };

    if (v.tls === "tls") {
      outbound.tls = {
        enabled: true,
        server_name: v.sni || v.host || v.add,
      };
    }

    if (v.net === "ws") {
      outbound.transport = {
        type: "ws",
        path: v.path || "/",
        headers: v.host ? { Host: v.host } : {},
      };
    }

    return outbound;
  }

  function parseVless(link) {
    const u = new URL(link);
    const params = u.searchParams;

    const outbound = {
      type: "vless",
      tag: safeTag(decodeURIComponent(u.hash.slice(1)) || u.hostname),
      server: u.hostname,
      server_port: Number(u.port || 443),
      uuid: u.username,
    };

    const flow = params.get("flow");
    if (flow) outbound.flow = flow;

    const security = params.get("security");
    if (security === "tls" || security === "reality") {
      outbound.tls = {
        enabled: true,
        server_name: params.get("sni") || params.get("host") || u.hostname,
      };

      if (security === "reality") {
        outbound.tls.reality = {
          enabled: true,
          public_key: params.get("pbk") || "",
          short_id: params.get("sid") || "",
        };
        outbound.tls.utls = {
          enabled: true,
          fingerprint: params.get("fp") || "chrome",
        };
      }
    }

    const type = params.get("type");
    if (type === "ws") {
      outbound.transport = {
        type: "ws",
        path: params.get("path") || "/",
        headers: params.get("host") ? { Host: params.get("host") } : {},
      };
    }

    if (type === "grpc") {
      outbound.transport = {
        type: "grpc",
        service_name: params.get("serviceName") || "",
      };
    }

    return outbound;
  }

  function parseTrojan(link) {
    const u = new URL(link);
    const params = u.searchParams;

    return {
      type: "trojan",
      tag: safeTag(decodeURIComponent(u.hash.slice(1)) || u.hostname),
      server: u.hostname,
      server_port: Number(u.port || 443),
      password: u.username,
      tls: {
        enabled: true,
        server_name: params.get("sni") || u.hostname,
      },
    };
  }

  function parseShadowsocks(link) {
    let body = link.slice("ss://".length);
    let name = "ss-node";

    const hashIndex = body.indexOf("#");
    if (hashIndex >= 0) {
      name = decodeURIComponent(body.slice(hashIndex + 1));
      body = body.slice(0, hashIndex);
    }

    const atIndex = body.indexOf("@");

    let method, password, serverPart;

    if (atIndex >= 0) {
      const userInfo = body.slice(0, atIndex);
      serverPart = body.slice(atIndex + 1);

      const decodedUser =
        tryBase64Decode(userInfo) || decodeURIComponent(userInfo);
      const split = decodedUser.indexOf(":");
      method = decodedUser.slice(0, split);
      password = decodedUser.slice(split + 1);
    } else {
      const decoded = tryBase64Decode(body);
      const splitAt = decoded.indexOf("@");
      const userInfo = decoded.slice(0, splitAt);
      serverPart = decoded.slice(splitAt + 1);

      const split = userInfo.indexOf(":");
      method = userInfo.slice(0, split);
      password = userInfo.slice(split + 1);
    }

    const [server, port] = serverPart.split(":");

    return {
      type: "shadowsocks",
      tag: safeTag(name),
      server,
      server_port: Number(port),
      method,
      password,
    };
  }

  function buildSingBoxConfig(nodes) {
    const nodeTags = nodes.map((n) => n.tag);

    return {
      outbounds: [
        {
          type: "selector",
          tag: "proxy",
          outbounds: ["auto", ...nodeTags],
          default: "auto",
        },
        {
          type: "urltest",
          tag: "auto",
          outbounds: nodeTags,
          url: "https://cp.cloudflare.com/generate_204",
          interval: "3m",
          tolerance: 50,
        },
        ...nodes,
      ],
    };
  }

  function tryBase64Decode(input) {
    try {
      let s = input.trim();
      s = s.replace(/-/g, "+").replace(/_/g, "/");
      while (s.length % 4) s += "=";

      const binary = atob(s);
      const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
      return new TextDecoder("utf-8").decode(bytes);
    } catch {
      return null;
    }
  }

  function safeTag(name) {
    return String(name || "node")
      .replace(/[^\w\u4e00-\u9fa5.-]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60);
  }

  function downloadText(filename, text) {
    const blob = new Blob([text], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);
  }

  function parseClashYamlOutbounds(raw) {
    const lines = raw.split(/\r?\n/);

    const proxies = [];
    let inProxies = false;
    let current = null;

    for (const line of lines) {
      const rawLine = line;
      const trimmed = rawLine.trim();

      if (!trimmed || trimmed.startsWith("#")) continue;

      if (trimmed === "proxies:") {
        inProxies = true;
        continue;
      }

      if (!inProxies) continue;

      // 到下一个顶级字段结束
      if (/^[a-zA-Z0-9_-]+:/.test(rawLine)) {
        break;
      }

      // 节点开始：-
      if (/^\s*-\s*$/.test(rawLine)) {
        if (current && Object.keys(current).length > 0) {
          proxies.push(current);
        }
        current = {};
        continue;
      }

      // 节点开始：- name: xxx
      if (/^\s*-\s+/.test(rawLine)) {
        if (current && Object.keys(current).length > 0) {
          proxies.push(current);
        }
        current = {};
        parseYamlKeyValue(trimmed.slice(1).trim(), current);
        continue;
      }

      if (current && trimmed.includes(":")) {
        parseYamlKeyValue(trimmed, current);
      }
    }

    if (current && Object.keys(current).length > 0) {
      proxies.push(current);
    }

    console.log("Clash proxies 原始数量:", proxies.length);
    console.log("前3个 Clash proxy:", proxies.slice(0, 3));

    return proxies
      .filter((p) => p && p.type && p.server && p.port)
      .map(clashProxyToSingBoxOutbound)
      .filter(Boolean);
  }

  function parseYamlKeyValue(line, obj) {
    const index = line.indexOf(":");
    if (index < 0) return;

    const key = line.slice(0, index).trim();
    let value = line.slice(index + 1).trim();

    if (!key) return;

    value = unquoteYamlValue(value);

    if (value === "") {
      obj[key] = {};
      return;
    }

    if (value === "true") value = true;
    else if (value === "false") value = false;
    else if (/^\d+$/.test(value)) value = Number(value);

    obj[key] = value;
  }

  function unquoteYamlValue(value) {
    if (
      (value.startsWith("'") && value.endsWith("'")) ||
      (value.startsWith('"') && value.endsWith('"'))
    ) {
      return value.slice(1, -1);
    }
    return value;
  }
  function clashProxyToSingBoxOutbound(p) {
    const tag = safeTag(p.name || p.server);

    switch (p.type) {
      case "ss":
        return {
          type: "shadowsocks",
          tag,
          server: p.server,
          server_port: Number(p.port),
          method: p.cipher,
          password: String(p.password || ""),
        };

      case "trojan":
        return {
          type: "trojan",
          tag,
          server: p.server,
          server_port: Number(p.port),
          password: String(p.password || ""),
          tls: {
            enabled: true,
            server_name: p.sni || p.server,
            insecure: Boolean(p["skip-cert-verify"]),
          },
        };

      case "vmess":
        return {
          type: "vmess",
          tag,
          server: p.server,
          server_port: Number(p.port),
          uuid: p.uuid,
          security: p.cipher || "auto",
          alter_id: Number(p.alterId || p["alter-id"] || 0),
          tls: p.tls
            ? {
                enabled: true,
                server_name: p.servername || p.sni || p.server,
                insecure: Boolean(p["skip-cert-verify"]),
              }
            : undefined,
          transport: clashTransportToSingBox(p),
        };

      case "vless": {
        const outbound = {
          type: "vless",
          tag,
          server: p.server,
          server_port: Number(p.port),
          uuid: p.uuid,
        };

        if (p.flow) outbound.flow = p.flow;

        if (p.tls || p.network === "reality" || p.reality) {
          outbound.tls = {
            enabled: true,
            server_name: p.servername || p.sni || p.server,
            insecure: Boolean(p["skip-cert-verify"]),
          };
        }

        if (p["reality-opts"]) {
          outbound.tls = outbound.tls || { enabled: true };
          outbound.tls.reality = {
            enabled: true,
            public_key: p["reality-opts"]["public-key"] || "",
            short_id: p["reality-opts"]["short-id"] || "",
          };
        }

        const transport = clashTransportToSingBox(p);
        if (transport) outbound.transport = transport;

        return outbound;
      }

      case "hysteria2":
      case "hy2":
        return {
          type: "hysteria2",
          tag,
          server: p.server,
          server_port: Number(p.port),
          password: String(p.password || ""),
          tls: {
            enabled: true,
            server_name: p.sni || p.server,
            insecure: Boolean(p["skip-cert-verify"]),
          },
        };

      case "tuic":
        return {
          type: "tuic",
          tag,
          server: p.server,
          server_port: Number(p.port),
          uuid: p.uuid,
          password: String(p.password || ""),
          congestion_control:
            p["congestion-controller"] || p["congestion-control"] || "cubic",
          tls: {
            enabled: true,
            server_name: p.sni || p.server,
            insecure: Boolean(p["skip-cert-verify"]),
          },
        };

      case "anytls":
        return {
          type: "anytls",
          tag,
          server: p.server,
          server_port: Number(p.port),
          password: String(p.password || ""),
          tls: {
            enabled: true,
            server_name: p.sni || p.server,
            insecure: Boolean(p["skip-cert-verify"]),
          },
        };

      default:
        console.warn("暂不支持 Clash 节点类型:", p.type, p);
        return null;
    }
  }
  function clashTransportToSingBox(p) {
    const network = p.network || p.net;

    if (network === "ws") {
      return {
        type: "ws",
        path: p["ws-opts"]?.path || p.path || "/",
        headers: {
          Host: p["ws-opts"]?.headers?.Host || p.host || p.server,
        },
      };
    }

    if (network === "grpc") {
      return {
        type: "grpc",
        service_name:
          p["grpc-opts"]?.["grpc-service-name"] || p.serviceName || "",
      };
    }

    return undefined;
  }
})();
