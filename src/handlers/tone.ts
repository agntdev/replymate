import { Composer } from "grammy";
import type { Ctx, Tone } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "🎚️ Tone", data: "tone:cycle", order: 25 });

const composer = new Composer<Ctx>();

function getSettings(ctx: Ctx) {
  if (!ctx.session.settings) {
    ctx.session.settings = { enabled: true, tone: "Neutral" };
  } else {
    ctx.session.settings = { ...ctx.session.settings };
  }
  return ctx.session.settings;
}

const TONES: Tone[] = ["Neutral", "Friendly", "Professional"];

const back = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("tone", async (ctx) => {
  const s = getSettings(ctx);
  const i = (TONES.indexOf(s.tone) + 1) % TONES.length;
  s.tone = TONES[i];
  ctx.session.settings = { ...s };
  ctx.session = { ...ctx.session };
  await ctx.reply(`Tone set to ${s.tone}.`);
});

composer.callbackQuery("tone:cycle", async (ctx) => {
  await ctx.answerCallbackQuery();
  const s = getSettings(ctx);
  const i = (TONES.indexOf(s.tone) + 1) % TONES.length;
  s.tone = TONES[i];
  ctx.session.settings = { ...s };
  ctx.session = { ...ctx.session };
  await ctx.editMessageText(`Tone set to ${s.tone}.`, { reply_markup: back });
});

export default composer;
