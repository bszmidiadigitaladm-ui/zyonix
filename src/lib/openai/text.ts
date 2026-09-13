import { getOpenAI } from "@/lib/openai/client";

const CAPTION_MODEL = "gpt-4.1-mini";

export async function generateCaption(params: {
  occasion: string;
  verseReference?: string;
  format: "feed" | "story" | "carousel";
}): Promise<string> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: CAPTION_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You write short, warm, encouraging Instagram captions for a Christian content " +
          "brand. Captions are 2-4 sentences, include 1-3 relevant hashtags, and never sound " +
          "preachy or salesy. Reply with the caption text only, no quotation marks.",
      },
      {
        role: "user",
        content:
          `Write a caption for a ${params.format} post about "${params.occasion}"` +
          (params.verseReference ? `, referencing ${params.verseReference}.` : "."),
      },
    ],
    max_tokens: 220,
  });

  const text = response.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("OpenAI did not return caption text");
  return text;
}

export async function generateDevotional(params: {
  date: string;
}): Promise<{ title: string; body: string; scriptureReference: string }> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: CAPTION_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You write short daily Christian devotionals: a title, a 3-5 paragraph reflection " +
          "grounded in a specific Bible verse, and the verse reference. Reply as strict JSON: " +
          '{"title": string, "body": string, "scripture_reference": string}. No markdown fences.',
      },
      {
        role: "user",
        content: `Write today's devotional (${params.date}).`,
      },
    ],
    max_tokens: 700,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI did not return devotional content");

  const parsed = JSON.parse(raw) as {
    title: string;
    body: string;
    scripture_reference: string;
  };

  return {
    title: parsed.title,
    body: parsed.body,
    scriptureReference: parsed.scripture_reference,
  };
}

export interface MessageOutline {
  title: string;
  introduction: string;
  points: { heading: string; content: string; verses: string[] }[];
  closing: string;
  suggestedVerses: string[];
}

export async function generateMessageOutline(params: {
  topic: string;
  audience: string;
  durationMinutes: number;
  style: string;
  tone: string;
}): Promise<MessageOutline> {
  const openai = getOpenAI();

  const response = await openai.chat.completions.create({
    model: CAPTION_MODEL,
    messages: [
      {
        role: "system",
        content:
          "You help pastors and Christian speakers structure a sermon/message outline from a " +
          "topic and direction they provide. Produce a clear, well-organized outline with 3-5 " +
          "main points, grounded in specific Bible verses. Match the requested audience, " +
          "duration, style, and tone. Reply as strict JSON: " +
          '{"title": string, "introduction": string, ' +
          '"points": [{"heading": string, "content": string, "verses": string[]}], ' +
          '"closing": string, "suggested_verses": string[]}. No markdown fences.',
      },
      {
        role: "user",
        content:
          `Topic: ${params.topic}\n` +
          `Audience: ${params.audience}\n` +
          `Duration: ${params.durationMinutes} minutes\n` +
          `Style: ${params.style}\n` +
          `Tone: ${params.tone}`,
      },
    ],
    max_tokens: 1400,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) throw new Error("OpenAI did not return an outline");

  const parsed = JSON.parse(raw) as {
    title: string;
    introduction: string;
    points: { heading: string; content: string; verses: string[] }[];
    closing: string;
    suggested_verses: string[];
  };

  return {
    title: parsed.title,
    introduction: parsed.introduction,
    points: parsed.points,
    closing: parsed.closing,
    suggestedVerses: parsed.suggested_verses,
  };
}
