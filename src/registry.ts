// @ts-nocheck
// ToolPkg 宿主入口（manifest.main = dist/registry.js）
// 注册：
// 1) XML 渲染：<comment_confirm>{"id":"..."}</comment_confirm> → 评论操作确认框（xml 才是 Screen）
// 2) 聊天控制栏输入菜单开关：市场评论免确认（权限 true=直接执行 / false=询问制）

import comment_confirm_ui from "./comment_confirm_ui.js";
import {
  readPending,
  isPermissionEnabled,
  setPermissionEnabled,
  summarizeOp
} from "./comment_core.js";

const TOGGLE_ID = "toolpkg_market_comment_perm";

function parseXmlPayload(xmlContent, tag) {
  try {
    const re = new RegExp("<" + tag + "[^>]*>([\\s\\S]*?)</" + tag + ">", "i");
    const m = String(xmlContent || "").match(re);
    if (!m) return null;
    return JSON.parse(m[1].trim());
  } catch (e) {
    return null;
  }
}

async function onConfirmXmlRender(event) {
  const payload = event.eventPayload || {};
  if (payload.tagName !== "comment_confirm") return { handled: false };
  const data = parseXmlPayload(payload.xmlContent, "comment_confirm");
  const id = data && String(data.id || "").trim();
  if (!id) return { handled: true, text: "（评论确认框缺少 id）" };
  const rec = await readPending(id);
  if (!rec) return { handled: true, text: "（评论确认记录不存在或已过期：" + id + "）" };
  const summary = summarizeOp(rec);
  return {
    handled: true,
    composeDsl: {
      screen: comment_confirm_ui,
      state: {
        _id: rec.id,
        _action: rec.action,
        _entryId: rec.entryId,
        _body: rec.body,
        _commentId: rec.commentId,
        _parentId: rec.parentId,
        _status: rec.status,
        _chatId: (typeof getChatId === "function") ? getChatId() : ""
      }
    }
  };
}

async function onInputMenuToggle(event) {
  const payload = event.eventPayload || {};
  const action = String(payload.action || "create");
  const toggleId = String(payload.toggleId || "");
  if (action === "toggle" && toggleId === TOGGLE_ID) {
    const next = !isPermissionEnabled();
    try { setPermissionEnabled(next); } catch (e) {}
  }
  return [
    {
      id: TOGGLE_ID,
      title: "市场评论免确认",
      description: "开启后 AI 可无需确认直接发布/编辑/删除市场评论",
      icon: "comment",
      isChecked: isPermissionEnabled(),
      slot: "general"
    }
  ];
}

function registerToolPkg() {
  try {
    ToolPkg.registerXmlRenderPlugin({
      id: "toolpkg_market_confirm",
      tag: "comment_confirm",
      function: onConfirmXmlRender
    });
    ToolPkg.registerInputMenuTogglePlugin({
      id: "toolpkg_market_perm_toggle",
      function: onInputMenuToggle
    });
  } catch (e) {}
  return true;
}

module.exports = {
  registerToolPkg: registerToolPkg,
  onConfirmXmlRender: onConfirmXmlRender,
  onInputMenuToggle: onInputMenuToggle
};