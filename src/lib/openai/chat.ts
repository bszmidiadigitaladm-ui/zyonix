import { getOpenAI } from "@/lib/openai/client";
import { CHAT_DISCLAIMER } from "@/lib/safety/crisis-resources";
import type { ChatRole } from "@/lib/types/database.types";

const CHAT_MODEL = "gpt-4.1-mini";

const SYSTEM_PROMPT =
  "You are a warm, biblically-grounded companion for reflection and prayer. You offer " +
  "encouragement rooted in Scripture, gentle questions, and short prayers when invited. " +
  `You are explicitly NOT a therapist or counselor — ${CHAT_DISCLAIMER} ` +
  "Keep replies concise (3-6 sentences), avoid clinical or diagnostic language, and never " +
  "give medical, legal, or psychological advice. If a user seems to want professional help, " +
  "gently encourage them to seek it, without being pushy.";

export interface ChatTurn {
  role: ChatRole;
  content: string;
}

export async function generateSpiritualChatReply(history: ChatTurn[]): Promise<string> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    max_tokens: 400,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI did not return a chat reply");
  return text;
}
