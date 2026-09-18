import OpenAI from "openai";

// Lazily constructed: Next.js imports every API route module at build time to
// collect its config, which would throw here if OPENAI_API_KEY isn't present
// in the build environment.
let _openai: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (!_openai) {
    _openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
      organization: process.env.OPENAI_ORG_ID,
    });
  }
  return _openai;
}
