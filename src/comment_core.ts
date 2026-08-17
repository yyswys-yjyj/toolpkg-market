// @ts-nocheck
// 市场评论写入核心（v1.2.0）
// 链路：读 app 私有 DataStore 提取 GitHub token → POST /market/v2/auth/github 换 market session
//       → create/edit/delete 评论（Authorization: Bearer <session>）
// 数据安全：权限开关（聊天控制栏）关闭时，调用方先创建 pending 记录走询问制，确认后再执行。

const MARKET_API_BASE = "https://api.operit.app";
const GITHUB_AUTH_DATASTORE =
  "/data/data/com.ai.assistance.operit/files/datastore/github_auth_preferences.preferences_pb";
const PENDING_DIR = "/storage/emulated/0/Download/Operit/cleanOnExit/toolpkg_market/pending";
const PERMISSION_ENV = "TOOLPKG_MARKET_COMMENT_PERMISSION";

// GitHub token 格式：ghp_/gho_/ghu_/ghs_/ghr_ / github_pat_
const GITHUB_TOKEN_RE = /gh[pousr]_[A-Za-z0-9]{10,}|github_pat_[A-Za-z0-9_]{20,}/;

export function get_error_message(error) {
  return error instanceof Error ? error.message : "Unknown error";
}

export async function httpJson(options) {
  const res = await Tools.Net.http(options);
  let body = res && (res.content !== undefined ? res.content : (res.toString ? res.toString() : ""));
  if (body === undefined || body === null) body = "";
  body = String(body).replace(/^\s*\d+\|/gm, "");
  const trimmed = body.trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed);
  } catch (e) {
    throw new Error("nonJSON HTTP " + (res && res.statusCode ? res.statusCode : "?") + " : " + trimmed.slice(0, 200));
  }
}

// ---------- GitHub token / Market session ----------

export async function readGithubToken() {
  const r = await Tools.Files.read(GITHUB_AUTH_DATASTORE);
  const raw = r && r.content !== undefined ? String(r.content) : "";
  const m = raw.match(GITHUB_TOKEN_RE);
  if (!m) {
    throw new Error("未找到 GitHub 登录凭据：请先在 Operit 中登录 GitHub");
  }
  return m[0];
}

export async function ensureMarketSession() {
  const token = await readGithubToken();
  const res = await httpJson({
    url: MARKET_API_BASE + "/market/v2/auth/github",
    method: "POST",
    headers: {
      "User-Agent": "Operit-Market-V2",
      "Authorization": "Bearer " + token,
      "Content-Type": "application/json"
    },
    body: "{}"
  });
  if (!res || !res.ok || !res.session) {
    throw new Error("Market 鉴权失败：" + ((res && res.error && res.error.message) || "unknown"));
  }
  return res.session;
}

function marketHeaders(session) {
  return {
    "User-Agent": "Operit-Market-V2",
    "Authorization": "Bearer " + session,
    "Content-Type": "application/json"
  };
}

// ---------- 写操作 ----------

export async function commentCreate(session, entryId, body, parentId) {
  const res = await httpJson({
    url: MARKET_API_BASE + "/market/v2/entries/" + encodeURIComponent(entryId) + "/comments",
    method: "POST",
    headers: marketHeaders(session),
    body: JSON.stringify({ body: body, parentId: parentId || null })
  });
  if (!res || !res.ok) {
    throw new Error(((res && res.error && res.error.message) || "发布评论失败"));
  }
  return res;
}

export async function commentEdit(session, commentId, body) {
  const res = await httpJson({
    url: MARKET_API_BASE + "/market/v2/comments/" + encodeURIComponent(commentId),
    method: "PATCH",
    headers: marketHeaders(session),
    body: JSON.stringify({ body: body })
  });
  if (!res || !res.ok) {
    throw new Error(((res && res.error && res.error.message) || "编辑评论失败"));
  }
  return res;
}

export async function commentDelete(session, commentId) {
  const res = await httpJson({
    url: MARKET_API_BASE + "/market/v2/comments/" + encodeURIComponent(commentId),
    method: "DELETE",
    headers: marketHeaders(session)
  });
  if (!res || !res.ok) {
    throw new Error(((res && res.error && res.error.message) || "删除评论失败"));
  }
  return res;
}

// 按 pending 记录执行真实操作
export async function executeCommentOp(op) {
  const session = await ensureMarketSession();
  if (op.action === "create") return commentCreate(session, op.entryId, op.body, op.parentId);
  if (op.action === "edit") return commentEdit(session, op.commentId, op.body);
  if (op.action === "delete") return commentDelete(session, op.commentId);
  throw new Error("未知操作：" + String(op.action));
}

// ---------- 权限开关（聊天控制栏输入菜单） ----------

export function isPermissionEnabled() {
  if (typeof getEnv !== "function") return false;
  try {
    const v = getEnv(PERMISSION_ENV);
    if (v === "true" || v === "1" || v === "yes" || v === "on") return true;
  } catch (e) {}
  return false;
}

export function setPermissionEnabled(enabled) {
  try {
    Tools.SoftwareSettings.writeEnvironmentVariable(PERMISSION_ENV, String(!!enabled));
  } catch (e) {
    throw new Error("写入权限开关失败：" + get_error_message(e));
  }
}

// ---------- pending 记录（询问制确认） ----------

export function genPendingId() {
  return "c" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 8);
}

async function ensurePendingDir() {
  try {
    await Tools.Files.mkdir(PENDING_DIR, true);
  } catch (e) {}
}

function pendingPath(id) {
  return PENDING_DIR + "/" + id + ".json";
}

export async function createPending(rec) {
  await ensurePendingDir();
  const full = Object.assign({}, rec, { status: "pending", createdAt: new Date().toISOString() });
  await Tools.Files.write(pendingPath(rec.id), JSON.stringify(full));
  return full;
}

export async function readPending(id) {
  if (!id) return null;
  try {
    const r = await Tools.Files.read(pendingPath(id));
    const raw = r && r.content !== undefined ? String(r.content) : "";
    if (!raw.trim()) return null;
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}

export async function updatePending(id, patch) {
  const rec = await readPending(id);
  if (!rec) return null;
  const next = Object.assign({}, rec, patch, { updatedAt: new Date().toISOString() });
  await Tools.Files.write(pendingPath(id), JSON.stringify(next));
  return next;
}

// 生成给用户看的操作摘要
export function summarizeOp(op) {
  const actionText = { create: "发布评论", edit: "编辑评论", delete: "删除评论" }[op.action] || op.action;
  let target = op.entryId || ("#" + (op.commentId || "?"));
  let detail = "";
  if (op.action === "create") {
    detail = "目标：" + target + "，内容：" + String(op.body || "").slice(0, 120);
  } else if (op.action === "edit") {
    detail = "评论 #" + op.commentId + "，新内容：" + String(op.body || "").slice(0, 120);
  } else {
    detail = "评论 #" + op.commentId;
  }
  return { action: actionText, target: target, detail: detail };
}
