// @ts-nocheck
// 市场评论操作确认框 UI（v1.2.0）
// 由 <comment_confirm>{"id":"..."}</comment_confirm> XML 触发渲染（onConfirmXmlRender 传入 state）
// 用户点「确认」→ pending 文件 status=approved，并发消息唤醒 AI 执行；
// 点「驳回」→ status=rejected，AI 放弃。

const PENDING_DIR = "/storage/emulated/0/Download/Operit/cleanOnExit/toolpkg_market/pending";

function stripLinePrefixes(text) {
  if (!text) return text;
  return String(text).replace(/^\s*\d+\|/gm, "");
}

export default function Screen(ctx: any): any {
  var primary = ctx.MaterialTheme.colorScheme.primary;
  var onSurface = ctx.MaterialTheme.colorScheme.onSurface;
  var onSurfaceVariant = ctx.MaterialTheme.colorScheme.onSurfaceVariant;
  var surfaceVariant = ctx.MaterialTheme.colorScheme.surfaceVariant;
  var onPrimary = ctx.MaterialTheme.colorScheme.onPrimary;
  var error = "rgba(244,67,54,1)";
  var okGreen = "rgba(76,175,80,1)";

  var idState = ctx.useState("_id", "");
  var actionState = ctx.useState("_action", "");
  var entryIdState = ctx.useState("_entryId", "");
  var bodyState = ctx.useState("_body", "");
  var commentIdState = ctx.useState("_commentId", "");
  var parentIdState = ctx.useState("_parentId", "");
  var statusState = ctx.useState("_status", "pending");
  var chatIdState = ctx.useState("_chatId", "");
  var busyState = ctx.useState("_busy", false);
  var errorMsgState = ctx.useState("_errorMsg", "");

  var id = idState[0];
  var action = actionState[0];
  var entryId = entryIdState[0];
  var body = bodyState[0];
  var commentId = commentIdState[0];
  var parentId = parentIdState[0];
  var status = statusState[0];
  var chatId = chatIdState[0];
  var busy = busyState[0];
  var errorMsg = errorMsgState[0];

  var actionLabel = { create: "发布评论", edit: "编辑评论", delete: "删除评论" }[action] || action;

  function actionDesc(): string {
    if (action === "create") {
      return "在 " + (entryId || "?") + " 下" + (parentId ? "回复评论 #" + parentId : "发布新评论") + "：";
    }
    if (action === "edit") {
      return "编辑评论 #" + (commentId || "?") + "，新内容：";
    }
    if (action === "delete") {
      return "删除评论 #" + (commentId || "?") + "（不可恢复）";
    }
    return "";
  }

  function statusText(): string {
    if (status === "approved") return "已确认，AI 将执行该操作";
    if (status === "rejected") return "已驳回，操作不会执行";
    if (status === "done") return "已完成";
    if (status === "failed") return "执行失败：" + (errorMsg || "");
    return "等待确认…";
  }

  function statusColor(): string {
    if (status === "approved" || status === "done") return okGreen;
    if (status === "rejected") return error;
    if (status === "failed") return error;
    return onSurfaceVariant;
  }

  async function resolveStatus(nextStatus: string): Promise<boolean> {
    try {
      var path = PENDING_DIR + "/" + id + ".json";
      var raw = await ctx.callTool("read_file", { path: path });
      var content = raw && raw.content !== undefined ? stripLinePrefixes(raw.content) : "";
      var rec = content ? JSON.parse(content) : { id: id };
      rec.status = nextStatus;
      rec.updatedAt = new Date().toISOString();
      await ctx.callTool("write_file", { path: path, content: JSON.stringify(rec) });
      statusState[1](nextStatus);
      return true;
    } catch (e) {
      errorMsgState[1](String(e && e.message || e));
      return false;
    }
  }

  async function sendNotify(text: string) {
    try {
      await Tools.Chat.sendMessage(text, chatId || undefined, undefined, undefined, { runtime: "main" });
    } catch (e) {}
  }

  async function onConfirm() {
    if (busy || status !== "pending") return;
    busyState[1](true);
    var ok = await resolveStatus("approved");
    busyState[1](false);
    if (ok) {
      await sendNotify("✅ 已确认市场评论操作 #" + id + "（" + actionLabel + "），AI 可以执行了。");
    }
  }

  async function onReject() {
    if (busy || status !== "pending") return;
    busyState[1](true);
    var ok = await resolveStatus("rejected");
    busyState[1](false);
    if (ok) {
      await sendNotify("🚫 已驳回市场评论操作 #" + id + "（" + actionLabel + "），请勿执行。");
    }
  }

  return ctx.UI.Column({ spacing: 12, padding: { horizontal: 16, top: 16, bottom: 24 } }, [
    ctx.UI.Row({ spacing: 6, verticalAlignment: "centerVertically" }, [
      ctx.UI.Icon({ name: "comment", size: 22, tint: primary }),
      ctx.UI.Text({ text: "市场评论操作确认", style: "titleLarge", color: primary }),
    ]),
    ctx.UI.Card({ fillMaxWidth: true, containerColor: surfaceVariant }, [
      ctx.UI.Column({ padding: 16, spacing: 8 }, [
        ctx.UI.Row({ spacing: 6, verticalAlignment: "centerVertically" }, [
          ctx.UI.Text({ text: actionLabel, style: "titleSmall", color: onSurface }),
          ctx.UI.Text({ text: "#" + id, style: "labelSmall", color: onSurfaceVariant }),
        ]),
        ctx.UI.Text({ text: actionDesc(), style: "bodyMedium", color: onSurface }),
        body && action !== "delete"
          ? ctx.UI.Text({ text: "「" + body + "」", style: "bodySmall", color: onSurfaceVariant })
          : null,
        ctx.UI.Divider({ thickness: 0.5, color: onSurfaceVariant }),
        ctx.UI.Row({ spacing: 6, verticalAlignment: "centerVertically" }, [
          ctx.UI.Text({ text: statusText(), style: "labelMedium", color: statusColor() }),
        ]),
        errorMsg ? ctx.UI.Text({ text: "操作失败：" + errorMsg, style: "bodySmall", color: error }) : null,
      ]),
    ]),
    status === "pending"
      ? ctx.UI.Row({ spacing: 8, padding: { top: 4 } }, [
          ctx.UI.Button({
            onClick: onConfirm,
            weight: 1,
            containerColor: okGreen,
            content: busy
              ? ctx.UI.CircularProgressIndicator({ strokeWidth: 2, color: onPrimary })
              : ctx.UI.Text({ text: "确认执行", style: "labelMedium", color: onPrimary }),
          }),
          ctx.UI.OutlinedButton({
            onClick: onReject,
            weight: 1,
            content: ctx.UI.Text({ text: "驳回", style: "labelLarge", color: error }),
          }),
        ])
      : null,
  ]);
}