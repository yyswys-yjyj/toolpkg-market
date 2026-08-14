// @ts-nocheck
/* METADATA
{
  "name": "toolpkg_market",
  "display_name": {
    "zh": "工具包市场",
    "en": "Toolpkg Market"
  },
  "description": {
    "zh": "让 AI 逛 Operit 市场（只读）：搜索包、查看详情/数据、查看评论、浏览榜单。市场接口只读兼容官方 Agent API 与 market/v2 快照。",
    "en": "Let AI browse the Operit market (read-only): search packages, inspect details/stats, view comments, and browse rankings. Read-only market endpoints compatible with the official Agent API and market/v2 snapshots."
  },
  "category": "Chat",
  "tools": [
    {
      "name": "market_search",
      "description": {
        "zh": "搜索 Operit 市场包（按关键词）。返回匹配包的列表（id/标题/类型/作者/简介/下载量等）。\n参数：\n- q（必填）：搜索关键词。\n- type（可选）：限定类型，可选 all / mcp / skill / package / script。不传或传 all 时不限定。\n- limit（可选）：返回条数上限（字符串数字，默认 10，最大 50）。",
        "en": "Search Operit market packages by keyword. Returns a list of matching packages (id/title/type/author/summary/downloads).\nParams:\n- q (required): search keyword.\n- type (optional): filter by type, all / mcp / skill / package / script. Omit or all for no filter.\n- limit (optional): max results (numeric string, default 10, max 50)."
      },
      "parameters": [
        {
          "name": "q",
          "description": {
            "zh": "搜索关键词",
            "en": "Search keyword"
          },
          "type": "string",
          "required": true
        },
        {
          "name": "type",
          "description": {
            "zh": "类型过滤：all/mcp/skill/package/script",
            "en": "Type filter: all/mcp/skill/package/script"
          },
          "type": "string",
          "required": false
        },
        {
          "name": "limit",
          "description": {
            "zh": "条数上限（字符串数字，默认10，最大50）",
            "en": "Max results (numeric string, default 10, max 50)"
          },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "market_detail",
      "description": {
        "zh": "查看单个市场包的完整详情、数据与安装计划。返回基本信息 + 下载量/点赞等数据 + 版本/资源（含 asset sha256 与运行时包id）。",
        "en": "View full details, stats and asset info of one market package. Returns basic info + downloads/likes stats + versions/assets (with sha256 and runtime package id)."
      },
      "parameters": [
        {
          "name": "type",
          "description": {
            "zh": "包类型：mcp/skill/package/script",
            "en": "Package type: mcp/skill/package/script"
          },
          "type": "string",
          "required": true
        },
        {
          "name": "id",
          "description": {
            "zh": "包 id",
            "en": "Package id"
          },
          "type": "string",
          "required": true
        },
        {
          "name": "with_install_plan",
          "description": {
            "zh": "是否拉取安装计划（true/false，默认false）",
            "en": "Fetch install plan? (true/false, default false)"
          },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "market_comments",
      "description": {
        "zh": "查看一个市场包的评论列表（只读）。\n参数：\n- entry_id（必填）：市场条目 id（详情里的 id）。\n- page（可选）：页码（字符串数字，默认 1）。",
        "en": "View the comment list of a market package (read-only).\nParams:\n- entry_id (required): market entry id.\n- page (optional): page number (numeric string, default 1)."
      },
      "parameters": [
        {
          "name": "entry_id",
          "description": {
            "zh": "市场条目 id",
            "en": "Market entry id"
          },
          "type": "string",
          "required": true
        },
        {
          "name": "page",
          "description": {
            "zh": "页码（字符串数字，默认1）",
            "en": "Page number (numeric string, default 1)"
          },
          "type": "string",
          "required": false
        }
      ]
    },
    {
      "name": "market_top",
      "description": {
        "zh": "查看 Operit 市场榜单（按下载量/点赞/更新时间排序）。\n参数：\n- metric（可选）：排序依据，downloads / likes / updated，默认 downloads。\n- type（可选）：类型过滤，all / mcp / skill / package / script，默认 all。\n- page（可选）：页码（字符串数字，默认 1）。",
        "en": "View Operit market rankings (sorted by downloads/likes/update time).\nParams:\n- metric (optional): sort key, downloads / likes / updated, default downloads.\n- type (optional): type filter, all / mcp / skill / package / script, default all.\n- page (optional): page number (numeric string, default 1)."
      },
      "parameters": [
        {
          "name": "metric",
          "description": {
            "zh": "排序：downloads/likes/updated",
            "en": "Sort: downloads/likes/updated"
          },
          "type": "string",
          "required": false
        },
        {
          "name": "type",
          "description": {
            "zh": "类型过滤：all/mcp/skill/package/script",
            "en": "Type filter: all/mcp/skill/package/script"
          },
          "type": "string",
          "required": false
        },
        {
          "name": "page",
          "description": {
            "zh": "页码（字符串数字，默认1）",
            "en": "Page (numeric string, default 1)"
          },
          "type": "string",
          "required": false
        }
      ]
    }
  ]
}
*/


const MARKET_API_BASE = "https://api.operit.app";
const MARKET_STATIC_BASE = "https://static.operit.app";
const SANDBOX_EXTERNAL_DIR = "/sdcard/Android/data/com.ai.assistance.operit/files/packages";
const MARKET_CACHE_DIR = "/storage/emulated/0/Download/Operit/cleanOnExit/toolpkg_market";
const MARKET_CACHE_FILE = "search_index.json";
const MARKET_CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 小时缓存
const MARKET_SEARCH_PAGES = 4; // 榜单每排序抓前 4 页

function get_error_message(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

function parseBool(value, def) {
  if (value === undefined || value === null || value === "") return def;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "on"].indexOf(s) >= 0) return true;
  if (["false", "0", "no", "off"].indexOf(s) >= 0) return false;
  return def;
}

function parseNum(value, def, max) {
  if (value === undefined || value === null || value === "") return def;
  const n = Number(value);
  if (!isFinite(n) || n < 0) return def;
  let result = Math.floor(n);
  if (max !== null && max !== undefined && result > max) result = max;
  return result;
}

function normalizeType(value) {
  const t = String(value || "").trim().toLowerCase();
  if (["mcp", "skill", "package", "script", "all"].indexOf(t) >= 0) return t;
  return "all";
}

function fnv1a32Hex(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
  }
  return h.toString(16);
}

function marketShard(id) {
  return fnv1a32Hex(String(id || "")).slice(0, 2);
}

function stripLinePrefixes(text) {
  if (!text) return text;
  return String(text).replace(/^\s*\d+\|/gm, "");
}

async function httpJson(options) {
  const res = await Tools.Net.http(options);
  let body = res && (res.content !== undefined ? res.content : (res.toString ? res.toString() : ""));
  if (body === undefined || body === null) body = "";
  body = stripLinePrefixes(String(body));
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    throw new Error("nonJSON HTTP" + (res && res.statusCode ? res.statusCode : "?") + " : " + trimmed.slice(0, 200));
  }
}

async function httpGetJson(url) {
  return httpJson({ url: url, method: "GET", responseType: "json", follow_redirects: true });
}

async function fetchAgentDetail(type, id) {
  const url = MARKET_API_BASE + "/market-stats/agent/items/" + encodeURIComponent(type) + "/" + encodeURIComponent(id);
  return httpGetJson(url);
}

async function fetchAgentInstallPlan(type, id) {
  const url = MARKET_API_BASE + "/market-stats/agent/items/" + encodeURIComponent(type) + "/" + encodeURIComponent(id) + "/install-plan";
  return httpGetJson(url);
}

async function agentSearch(q, type, limit) {
  let url = MARKET_API_BASE + "/market-stats/agent/search?q=" + encodeURIComponent(q) + "&limit=" + limit;
  if (type && type !== "all") url += "&type=" + encodeURIComponent(type);
  return httpGetJson(url);
}

async function fetchV2Entry(entryId) {
  const shard = marketShard(entryId);
  const url = MARKET_STATIC_BASE + "/market/v2/entries/" + shard + ".json";
  const data = await httpGetJson(url);
  if (data && data.entriesById && data.entriesById[entryId]) return data.entriesById[entryId];
  if (data && data.entries && data.entries[entryId]) return data.entries[entryId];
  return data;
}

async function fetchV2Comments(entryId, page) {
  const url = MARKET_STATIC_BASE + "/market/v2/comments/" + encodeURIComponent(entryId) + "/page-" + page + ".json";
  try {
    return await httpGetJson(url);
  } catch (e) {
    return { items: [], page: page, total: 0 };
  }
}

function v2SortKey(metric) {
  const m = String(metric || "downloads").trim().toLowerCase();
  if (m === "likes") return "likes";
  if (m === "updated" || m === "updatedAt") return "updated";
  return "downloads";
}

async function fetchList(pathSegments) {
  const url = MARKET_STATIC_BASE + "/market/v2/lists/" + pathSegments.join("/");
  return httpGetJson(url);
}

function listPathSegments(type, sort, page) {
  const segs = [];
  if (type && type !== "all") {
    segs.push("type", type, sort, "page-" + page + ".json");
  } else {
    segs.push("all", sort, "page-" + page + ".json");
  }
  return segs;
}

function unwrapEntry(entry) {
  if (!entry) return null;
  if (entry.item && entry.item.id) return entry.item;
  if (entry.entry && entry.entry.id) return entry.entry;
  return entry;
}

function summarizeEntry(entry) {
  const e = unwrapEntry(entry);
  if (!e || !e.id) return null;
  const stats = e.stats || {};
  return {
    type: e.type || "",
    id: e.id || "",
    title: e.title || "",
    description: e.description || "",
    author: (e.publisher && (e.publisher.login || e.publisher.id)) || (e.author && e.author.login) || e.publisherId || "",
    downloads: e.downloads || e.downloadCount || stats.downloads || 0,
    likes: stats.likes || 0,
    updatedAt: e.updatedAt || e.publishedAt || null,
    categoryId: e.categoryId || "",
    stateCode: e.stateCode || "",
    featured: !!e.featured
  };
}

function summarizeDetail(entry, installPlan, viaAgent) {
  const e = unwrapEntry(entry);
  if (!e || !e.id) return null;
  const asset = Array.isArray(e.assets) && e.assets.length ? e.assets[0] : null;
  const latest = e.latestVersion || (Array.isArray(e.versions) && e.versions.length ? e.versions[0] : null);
  return {
    type: e.type || "",
    id: e.id || "",
    title: e.title || "",
    description: e.description || "",
    detail: e.detail || "",
    author: (e.publisher && (e.publisher.login || e.publisher.id)) || (e.author && e.author.login) || e.publisherId || "",
    categoryId: e.categoryId || "",
    stateCode: e.stateCode || "",
    createdAt: e.createdAt || null,
    updatedAt: e.updatedAt || null,
    publishedAt: e.publishedAt || null,
    source: e.source || null,
    stats: {
      downloads: e.downloads || e.downloadCount || (e.stats && e.stats.downloads) || 0,
      likes: (e.stats && e.stats.likes) || 0,
      lastDownloadAt: (e.stats && e.stats.lastDownloadAt) || null
    },
    versions: (Array.isArray(e.versions) ? e.versions : []).map(function (v) {
      return { id: v.id, version: v.version, runtimePackageId: v.runtimePackageId, publishedAt: v.publishedAt, stateCode: v.stateCode };
    }),
    latestVersion: latest ? { id: latest.id, version: latest.version, runtimePackageId: latest.runtimePackageId, publishedAt: latest.publishedAt } : null,
    asset: asset ? { id: asset.id, name: asset.name || asset.assetName, kind: asset.kind, sha256: asset.sha256 } : null,
    installPlan: installPlan || null,
    viaAgent: !!viaAgent
  };
}

async function ensureExternalDir() {
  await Tools.Files.mkdir(SANDBOX_EXTERNAL_DIR, true, "android");
}

// ---- cleanOnExit 搜索缓存 ----
async function ensureCacheDir() {
  await Tools.Files.mkdir(MARKET_CACHE_DIR, true, "android");
}

async function cacheExists() {
  const r = await Tools.Files.exists(MARKET_CACHE_DIR + "/" + MARKET_CACHE_FILE, "android");
  return !!(r && r.exists);
}

// 读搜索索引缓存；无效/过期返回 null
async function readSearchCache() {
  try {
    if (!(await cacheExists())) return null;
    const res = await Tools.Files.read({ path: MARKET_CACHE_DIR + "/" + MARKET_CACHE_FILE, environment: "android" });
    if (!res || !res.content) return null;
    const text = stripLinePrefixes(String(res.content));
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.items)) return null;
    if (!data.fetchedAt || (Date.now() - data.fetchedAt) > MARKET_CACHE_TTL_MS) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// 合并两份条目数组，按 id 去重
function mergeItems(a, b) {
  const seen = {};
  const out = [];
  const arrays = [a, b];
  for (const arr of arrays) {
    if (!Array.isArray(arr)) continue;
    for (const it of arr) {
      const id = it && it.id;
      if (!id || seen[id]) continue;
      seen[id] = 1;
      out.push(it);
    }
  }
  return out;
}

// 写入搜索索引缓存（原子写：先写 tmp 再 move）
async function writeSearchCache(items) {
  try {
    await ensureCacheDir();
    const payload = { fetchedAt: Date.now(), items: items || [] };
    const tmpPath = MARKET_CACHE_DIR + "/" + MARKET_CACHE_FILE + ".tmp";
    const finalPath = MARKET_CACHE_DIR + "/" + MARKET_CACHE_FILE;
    await Tools.Files.write(tmpPath, JSON.stringify(payload), false, "android");
    await Tools.Files.move(tmpPath, finalPath, "android");
  } catch (e) {
    /* 缓存写失败不阻塞主流程 */
  }
}

// 读取搜索索引中的条目数组（惰性：命中返回 items，未命中则网络构建并写缓存，返回 items 或 null）
async function getIndexItems() {
  let cache = await readSearchCache();
  if (cache && Array.isArray(cache.items) && cache.items.length) {
    return { items: cache.items, fromCache: true };
  }
  cache = await buildSearchIndex();
  if (cache && Array.isArray(cache.items) && cache.items.length) {
    await writeSearchCache(cache.items);
    return { items: cache.items, fromCache: false };
  }
  return { items: [], fromCache: false };
}

// 读取单个包详情缓存；无效/过期返回 null
async function readDetailCache(id) {
  try {
    const path = MARKET_CACHE_DIR + "/detail_" + String(id).replace(/[^A-Za-z0-9_\-.]/g, "_") + ".json";
    const r = await Tools.Files.exists(path, "android");
    if (!(r && r.exists)) return null;
    const res = await Tools.Files.read({ path: path, environment: "android" });
    if (!res || !res.content) return null;
    const data = JSON.parse(stripLinePrefixes(String(res.content)));
    if (!data || !data.detail) return null;
    if (!data.fetchedAt || (Date.now() - data.fetchedAt) > MARKET_CACHE_TTL_MS) return null;
    return data;
  } catch (e) {
    return null;
  }
}

// 写入单个包详情缓存（原子写）
async function writeDetailCache(id, detailObj) {
  try {
    await ensureCacheDir();
    const name = String(id).replace(/[^A-Za-z0-9_\-.]/g, "_");
    const payload = { fetchedAt: Date.now(), detail: detailObj };
    const tmpPath = MARKET_CACHE_DIR + "/detail_" + name + ".tmp";
    const finalPath = MARKET_CACHE_DIR + "/detail_" + name + ".json";
    await Tools.Files.write(tmpPath, JSON.stringify(payload), false, "android");
    await Tools.Files.move(tmpPath, finalPath, "android");
  } catch (e) {
    /* 缓存写失败不阻塞主流程 */
  }
}

// 构建搜索索引：网络拉取多排序榜单并合并（供本机缓存）
async function buildSearchIndex() {
  const all = [];
  const sortKeys = ["downloads", "likes", "updated"];
  const typeKey = "all";
  for (let si = 0; si < sortKeys.length; si++) {
    for (let pi = 1; pi <= MARKET_SEARCH_PAGES; pi++) {
      let pageData = null;
      try {
        const segs = listPathSegments(typeKey, sortKeys[si], pi);
        pageData = await fetchList(segs);
      } catch (e) { break; }
      const items = (pageData && pageData.items) || [];
      if (!items.length) break;
      for (const item of items) {
        const e = item && item.id ? item : (item.entry || item);
        if (e && e.id) all.push(e);
      }
    }
  }
  return { items: mergeItems([], all) };
}

async function market_search(params) {
  try {
    const q = String((params && params.q) || "").trim();
    if (!q) {
      complete({ success: false, message: "缺少必填参数 q（搜索关键词）" });
      return;
    }
    const type = normalizeType(params && params.type);
    const limit = parseNum(params && params.limit, 10, 50);
    const keyword = q.toLowerCase();
    const found = [];

    // 1. 优先读 cleanOnExit 搜索索引缓存（首次或过期才会网络拉取）
    let cache = await readSearchCache();
    let fromCache = !!cache;
    if (!cache) {
      cache = await buildSearchIndex();
      await writeSearchCache(cache && cache.items);
      fromCache = false; // 本次由网络构建缓存，不算"来自缓存"
    }
    const catalog = (cache && Array.isArray(cache.items)) ? cache.items : [];

    // 2. 本地过滤（关键词 + 类型）
    for (const item of catalog) {
      const e = item && item.id ? item : (item.entry || item);
      if (!e || !e.id) continue;
      if (type && type !== "all" && String(e.type || "").toLowerCase() !== type) continue;
      const hay = ((e.title || "") + " " + (e.description || "") + " " + (e.detail || "")).toLowerCase();
      if (hay.indexOf(keyword) >= 0) {
        const s = summarizeEntry(e);
        if (s && !found.some(function (f) { return f.id === s.id; })) found.push(s);
      }
      if (found.length >= limit) break;
    }
    complete({
      success: true,
      message: "市场搜索完成：关键词「" + q + "」匹配 " + found.length + " 条（type=" + type + "，" + (fromCache ? "来自缓存" : "来自网络") + "）。",
      data: { keyword: q, type: type, limit: limit, total: found.length, items: found, fromCache: fromCache }
    });
  } catch (e) {
    complete({ success: false, message: "搜索失败： " + get_error_message(e) });
  }
}

async function market_detail(params) {
  try {
    const type = normalizeType(params && params.type);
    if (type === "all") {
      complete({ success: false, message: "market_detail 需要具体的包类型（mcp/skill/package/script）作为 type 参数" });
      return;
    }
    const id = String((params && params.id) || "").trim();
    if (!id) {
      complete({ success: false, message: "缺少必填参数 id" });
      return;
    }
    const withInstallPlan = parseBool(params && params.with_install_plan, false);

    // 优先读详情缓存（市场数据近两天刷新，详情可缓存；仅当需要安装计划时不命中缓存）
    const cached = withInstallPlan ? null : await readDetailCache(id);
    if (cached && cached.detail) {
      complete({
        success: true,
        message: "市场包详情：「" + (cached.detail.title || id) + "」（来自缓存）",
        data: cached.detail
      });
      return;
    }

    const hasId = function (e) {
      return !!(e && (e.id || (e.item && e.item.id) || (e.entry && e.entry.id)));
    };
    let entry = null;
    let viaAgent = false;
    try {
      entry = await fetchAgentDetail(type, id);
      viaAgent = true;
    } catch (e) { /* 回退静态快照 */ }
    if (!hasId(entry)) {
      const v2 = await fetchV2Entry(id);
      if (hasId(v2)) entry = v2;
    }
    if (!hasId(entry)) {
      complete({ success: false, message: "未找到市场条目：type=" + type + " id=" + id });
      return;
    }
    let installPlan = null;
    if (withInstallPlan) {
      try {
        const planResp = await fetchAgentInstallPlan(type, id);
        installPlan = (planResp && (planResp.installPlan || planResp.plan)) || planResp;
      } catch (e) { installPlan = null; }
    }
    const detailObj = summarizeDetail(entry, installPlan, viaAgent);
    if (detailObj && !withInstallPlan) {
      await writeDetailCache(id, detailObj);
    }
    complete({
      success: true,
      message: "市场包详情：「" + (detailObj.title || id) + "」（来自网络" + (withInstallPlan ? "+安装计划" : "") + "）",
      data: detailObj
    });
  } catch (e) {
    complete({ success: false, message: "加载详情失败： " + get_error_message(e) });
  }
}

async function market_comments(params) {
  try {
    const entryId = String((params && params.entry_id) || "").trim();
    if (!entryId) {
      complete({ success: false, message: "缺少必填参数 entry_id" });
      return;
    }
    const page = parseNum(params && params.page, 1);
    const data = await fetchV2Comments(entryId, page);
    const rawItems = (data && data.items) || [];
    const comments = rawItems.map(function (c) {
      return {
        id: c.id,
        parentId: c.parentId || null,
        author: (c.author && (c.author.login || c.author.id)) || "",
        body: c.body || "",
        createdAt: c.createdAt || null
      };
    });
    complete({
      success: true,
      message: "评论列表：共 " + comments.length + " 条（entry=" + entryId + " page=" + page + "）",
      data: { entryId: entryId, page: page, total: (data && data.total) || comments.length, comments: comments }
    });
  } catch (e) {
    complete({ success: false, message: "加载评论失败： " + get_error_message(e) });
  }
}

async function market_top(params) {
  try {
    const metric = String((params && params.metric) || "downloads").trim().toLowerCase();
    const type = normalizeType(params && params.type);
    const page = parseNum(params && params.page, 1);
    const sort = v2SortKey(metric);

    // 读共享搜索索引缓存（榜单数据已缓存在 cleanOnExit），未命中才网络构建
    const idx = await getIndexItems();
    const catalog = idx.items || [];
    const fromCache = idx.fromCache;

    // 本地过滤类型
    let pool = catalog;
    if (type && type !== "all") {
      pool = pool.filter(function (it) {
        const e = it && it.id ? it : (it.entry || it);
        return e && String(e.type || "").toLowerCase() === type;
      });
    }

    // 本地排序（downloads / likes / updated）
    const sorted = pool.slice().sort(function (a, b) {
      const ea = a && a.id ? a : (a.entry || a);
      const eb = b && b.id ? b : (b.entry || b);
      let va, vb;
      if (sort === "likes") {
        va = (ea.stats && ea.stats.likes) || 0;
        vb = (eb.stats && eb.stats.likes) || 0;
      } else if (sort === "updated") {
        va = new Date(ea.updatedAt || ea.publishedAt || 0).getTime();
        vb = new Date(eb.updatedAt || eb.publishedAt || 0).getTime();
      } else {
        va = ea.downloads || ea.downloadCount || 0;
        vb = eb.downloads || eb.downloadCount || 0;
      }
      return vb - va;
    });

    // 分页（每页 100，与官方一致）
    const pageSize = 100;
    const start = (page - 1) * pageSize;
    const pageItems = sorted.slice(start, start + pageSize);
    const summary = pageItems.map(summarizeEntry).filter(Boolean);

    complete({
      success: true,
      message: "市场榜单（排序=" + sort + " type=" + type + " page=" + page + "，" + (fromCache ? "来自缓存" : "来自网络") + "）：共 " + summary.length + " 条（本地索引 " + sorted.length + " 条）。",
      data: { metric: sort, type: type, page: page, total: sorted.length, items: summary, fromCache: fromCache }
    });
  } catch (e) {
    complete({ success: false, message: "加载榜单失败： " + get_error_message(e) });
  }
}

exports.market_search = market_search;
exports.market_detail = market_detail;
exports.market_comments = market_comments;
exports.market_top = market_top;
