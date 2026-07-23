import { Composer } from "grammy";
import type { Ctx, MessageRecord, Tone } from "../bot.js";
import { inlineButton, inlineKeyboard, registerMainMenuItem } from "../toolkit/index.js";

registerMainMenuItem({ label: "💬 Suggest", data: "suggest:info", order: 5 });

const composer = new Composer<Ctx>();

type Suggestion = { text: string; confidence_score: number; tonality: Tone };

function getSettings(ctx: Ctx): { enabled: boolean; tone: Tone } {
  if (!ctx.session.settings) {
    ctx.session.settings = { enabled: true, tone: "Neutral" };
  }
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

function detectIntent(text: string): string {
  const t = text.toLowerCase();
  if (/(^|\b)(hi|hello|hey|good (morning|afternoon|evening|day))(\b|$)/.test(t)) return "greeting";
  if (t.includes("?") || /\b(what|how|why|when|where|who|which|can you|could you)\b/.test(t)) return "question";
  if (/\b(thank|thanks)\b/.test(t)) return "thanks";
  if (/\b(sorry|apolog|mistake|wrong|issue|problem)\b/.test(t)) return "apology";
  if (/\b(please|help|need|could|would you)\b/.test(t)) return "request";
  return "general";
}

function applyTone(base: string, tone: Tone): string {
  if (tone === "Friendly") {
    return base.replace(/[.!?]*$/, "!");
  }
  if (!/[.!?]$/.test(base)) base += ".";
  return base;
}

function getBases(intent: string): string[] {
  if (intent === "greeting") return ["Hello", "Hi there", "Greetings", "Good to hear from you", "Hello, how can I help"];
  if (intent === "question") return ["Good question", "It depends on details", "I will look into that", "Usually it works that way", "More information would help"];
  if (intent === "thanks") return ["You are welcome", "No problem", "Glad to help", "Any time", "Happy to assist"];
  if (intent === "apology") return ["No worries", "Thank you for the note", "I apologize for that", "Let us resolve it", "Appreciate you mentioning it"];
  if (intent === "request") return ["I can help with that", "I will handle it", "Consider it done", "Happy to assist", "I will take care of it"];
  return ["Understood", "Thank you for the note", "I will follow up", "Sounds good", "I agree"];
}

function generateSuggestions(text: string, tone: Tone): Suggestion[] {
  const intent = detectIntent(text);
  const bases = getBases(intent);
  const out: Suggestion[] = [];
  for (let i = 0; i < 5; i++) {
    const base = bases[i % bases.length];
    const styled = applyTone(base, tone);
    out.push({
      text: styled,
      confidence_score: Math.max(0.6, 0.95 - i * 0.07),
      tonality: tone,
    });
  }
  return out;
}

composer.on("message:text", async (ctx, next) => {
  const text = ctx.message.text.trim();
  if (text.startsWith("/")) return next();
  const settings = getSettings(ctx);
  if (!settings.enabled) {
    await ctx.reply("Suggestions paused. Use /enable to activate.");
    return;
  }
  ensureData(ctx);
  trimOld(ctx);
  const tone = settings.tone;
  const suggestions = generateSuggestions(text, tone);
  const msgKey = `${ctx.chat!.id}:${ctx.message!.message_id}`;
  const record: MessageRecord = {
    id: msgKey,
    sender: ctx.from?.username ? `@${ctx.from.username}` : (ctx.from?.first_name || "User"),
    text,
    timestamp: Date.now(),
    chat_type: ctx.chat?.type || "private",
    suggestions,
    actions: [],
  };
  const msgs = { ...(ctx.session.messages ?? {}) };
  msgs[msgKey] = record;
  ctx.session.messages = msgs;
  let ids = [...(ctx.session.msgIds ?? [])];
  if (!ids.includes(msgKey)) ids.unshift(msgKey);
  ctx.session.msgIds = ids;
  ctx.session = { ...ctx.session };
  let body = `Suggestions (${tone}):\n\n`;
  suggestions.forEach((s, i) => {
    const pct = Math.round(s.confidence_score * 100);
    body += `${i + 1}. ${s.text} (${pct}%)\n`;
  });
  body += "\nUse buttons to send or copy.";
  const rows = suggestions.map((s, i) => [
    inlineButton(`📋 ${i + 1}`, `sg|copy|${msgKey}|${i}|${s.text}`),
    inlineButton(`➤ ${i + 1}`, `sg|send|${msgKey}|${i}|${s.text}`),
  ]);
  await ctx.reply(body, { reply_markup: inlineKeyboard(rows) });
});

composer.on("callback_query:data", async (ctx, next) => {
  const d = ctx.callbackQuery.data ?? "";
  if (!d.startsWith("sg|")) return next();
  await ctx.answerCallbackQuery();
  const parts = d.split("|");
  if (parts.length < 5) return;
  const [, act, msgKey, iStr, ...rest] = parts;
  const idx = parseInt(iStr, 10) || 0;
  const sugText = rest.join("|");
  let rec = ctx.session.messages?.[msgKey];
  const chosenText = sugText || (rec && rec.suggestions[idx] ? rec.suggestions[idx].text : "");
  if (!chosenText) {
    await ctx.editMessageText("That suggestion is no longer available.");
    return;
  }
  if (rec) {
    const newActions = [...rec.actions, { chosen_reply: chosenText, copied_flag: act === "copy", timestamp: Date.now() }];
    rec = { ...rec, actions: newActions };
    const msgs = { ...(ctx.session.messages ?? {}) };
    msgs[msgKey] = rec;
    ctx.session.messages = msgs;
    ctx.session = { ...ctx.session };
  }
  const label = act === "copy" ? "Copied" : "Sent";
  await ctx.editMessageText(`${label}: ${chosenText}`);
  if (act !== "copy") {
    await ctx.reply(chosenText);
  }
});

composer.callbackQuery("suggest:info", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Send any message and I will suggest 5 replies. Tap buttons to send or copy. Change tone from menu.");
});

export default composer;
