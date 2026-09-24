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

let _openaiDirect: OpenAI | null = null;

/**
 * A client that always talks to api.openai.com. On Netlify the SDK's default
 * base URL (OPENAI_BASE_URL) can point at Netlify's AI Gateway, which only
 * accepts JSON requests. Image edits upload files (multipart), so they must skip
 * it. Set OPENAI_DIRECT_API_KEY to a real OpenAI key if OPENAI_API_KEY holds a
 * gateway-issued token; otherwise OPENAI_API_KEY is used.
 */
export function getOpenAIDirect(): OpenAI {
  if (!_openaiDirect) {
    _openaiDirect = new OpenAI({
      apiKey: process.env.OPENAI_DIRECT_API_KEY ?? process.env.OPENAI_API_KEY!,
      organization: process.env.OPENAI_ORG_ID,
      baseURL: "https://api.openai.com/v1",
    });
  }
  return _openaiDirect;
}
