import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

// Public bucket for AI-generated art/post/video assets — create it once in
// the Supabase Dashboard (Storage → New bucket → "generations", public) or
// via `supabase storage buckets create generations --public`. Not sensitive
// content, so a public bucket with unguessable UUID paths is sufficient.
const BUCKET = "generations";

export async function uploadGeneratedFile(params: {
  userId: string;
  buffer: Buffer;
  contentType: string;
  extension: string;
}): Promise<string> {
  const supabase = createAdminClient();
  const path = `${params.userId}/${randomUUID()}.${params.extension}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, params.buffer, {
    contentType: params.contentType,
    upsert: false,
  });

  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadGeneratedImage(params: {
  userId: string;
  buffer: Buffer;
  contentType?: string;
  extension?: string;
}): Promise<string> {
  return uploadGeneratedFile({
    userId: params.userId,
    buffer: params.buffer,
    contentType: params.contentType ?? "image/png",
    extension: params.extension ?? "png",
  });
}
