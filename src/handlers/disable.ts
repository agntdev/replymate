import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "⏸️ Disable", data: "disable:do", order: 15 });

const composer = new Composer<Ctx>();

function getSettings(ctx: Ctx) {
  if (!ctx.session.settings) {
    ctx.session.settings = { enabled: true, tone: "Neutral" };
  } else {
    ctx.session.settings = { ...ctx.session.settings };
  }
  return ctx.session.settings;
}

const back = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("disable", async (ctx) => {
  const s = getSettings(ctx);
  const msg = s.enabled ? "Suggestions disabled." : "Suggestions already paused.";
  s.enabled = false;
  ctx.session.settings = { ...s };
  ctx.session = { ...ctx.session };
  await ctx.reply(msg);
});

composer.callbackQuery("disable:do", async (ctx) => {
  await ctx.answerCallbackQuery();
  const s = getSettings(ctx);
  const msg = s.enabled ? "Suggestions disabled." : "Suggestions already paused.";
  s.enabled = false;
  ctx.session.settings = { ...s };
  ctx.session = { ...ctx.session };
  await ctx.editMessageText(msg, { reply_markup: back });
});

export default composer;
