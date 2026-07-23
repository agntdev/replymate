import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { mainMenuKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

function getSettings(ctx: Ctx) {
  if (!ctx.session.settings) {
    ctx.session.settings = { enabled: true, tone: "Neutral" };
  } else {
    ctx.session.settings = { ...ctx.session.settings };
  }
  return ctx.session.settings;
}

function statusLine(ctx: Ctx): string {
  const s = getSettings(ctx);
  const en = s.enabled ? "enabled" : "paused";
  return `Suggestions: ${en} (${s.tone}).`;
}

const WELCOME = "Reply suggestions bot. Send a message to receive options.";

composer.command("start", async (ctx) => {
  const text = `${WELCOME}\n${statusLine(ctx)}`;
  await ctx.reply(text, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  const text = `${WELCOME}\n${statusLine(ctx)}`;
  await ctx.editMessageText(text, { reply_markup: mainMenuKeyboard() });
});

export default composer;
