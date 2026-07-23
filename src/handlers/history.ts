import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "📜 History", data: "history:show", order: 20 });

const composer = new Composer<Ctx>();

function getSettings(ctx: Ctx) {
  if (!ctx.session.settings) ctx.session.settings = { enabled: true, tone: "Neutral" };
  return ctx.session.settings;
}

function ensureData(ctx: Ctx): void {
  if (!ctx.session.msgIds) ctx.session.msgIds = [];
  if (!ctx.session.messages) ctx.session.messages = {};
}

function trimOld(ctx: Ctx): void {
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  let ids = ctx.session.msgIds ?? [];
  const msgs = { ...(ctx.session.messages ?? {}) };
  const kept: string[] = [];
  for (const id of ids) {
    const m = msgs[id];
    if (m && m.timestamp >= cutoff) {
      kept.push(id);
    } else if (id in msgs) {
      delete msgs[id];
    }
  }
  ctx.session.msgIds = kept;
  ctx.session.messages = msgs;
  ctx.session = { ...ctx.session };
}

const back = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("history", async (ctx) => {
  ensureData(ctx);
  trimOld(ctx);
  const ids = ctx.session.msgIds ?? [];
  const msgs = ctx.session.messages ?? {};
  const recent = ids
    .map((id) => msgs[id])
    .filter((m): m is NonNullable<typeof m> => !!m)
    .slice(0, 10);
  if (recent.length === 0) {
    await ctx.reply("No history yet. Send a message to generate suggestions.");
    return;
  }
  let body = "Last 30 days:\n\n";
  for (const m of recent) {
    const when = new Date(m.timestamp).toISOString().slice(0, 16).replace("T", " ");
    const short = m.text.length > 40 ? m.text.slice(0, 37) + "…" : m.text;
    body += `[${when}] ${m.sender}: "${short}"\n`;
    for (const a of m.actions) {
      const flag = a.copied_flag ? "copied" : "sent";
      const ch = a.chosen_reply.length > 30 ? a.chosen_reply.slice(0, 27) + "…" : a.chosen_reply;
      body += `  → ${flag}: "${ch}"\n`;
    }
    body += "\n";
  }
  await ctx.reply(body.trim());
});

composer.callbackQuery("history:show", async (ctx) => {
  await ctx.answerCallbackQuery();
  ensureData(ctx);
  trimOld(ctx);
  const ids = ctx.session.msgIds ?? [];
  const msgs = ctx.session.messages ?? {};
  const recent = ids
    .map((id) => msgs[id])
    .filter((m): m is NonNullable<typeof m> => !!m)
    .slice(0, 10);
  if (recent.length === 0) {
    await ctx.editMessageText("No history yet. Send a message to generate suggestions.", { reply_markup: back });
    return;
  }
  let body = "Last 30 days:\n\n";
  for (const m of recent) {
    const when = new Date(m.timestamp).toISOString().slice(0, 16).replace("T", " ");
    const short = m.text.length > 40 ? m.text.slice(0, 37) + "…" : m.text;
    body += `[${when}] ${m.sender}: "${short}"\n`;
    for (const a of m.actions) {
      const flag = a.copied_flag ? "copied" : "sent";
      const ch = a.chosen_reply.length > 30 ? a.chosen_reply.slice(0, 27) + "…" : a.chosen_reply;
      body += `  → ${flag}: "${ch}"\n`;
    }
    body += "\n";
  }
  await ctx.editMessageText(body.trim(), { reply_markup: back });
});

export default composer;
