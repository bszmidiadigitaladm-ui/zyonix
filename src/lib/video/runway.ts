import RunwayML, { TaskFailedError } from "@runwayml/sdk";

// Lazily constructed for the same reason as lib/openai/client.ts: Next.js
// imports every API route module at build time to collect its config, which
// would throw here if RUNWAY_API_KEY isn't present in the build environment.
let _runway: RunwayML | null = null;

function getRunway(): RunwayML {
  if (!_runway) {
    _runway = new RunwayML({ apiKey: process.env.RUNWAY_API_KEY! });
  }
  return _runway;
}

export async function createVideoGeneration(params: {
  prompt: string;
  durationSeconds: number;
}): Promise<{ jobId: string }> {
  const task = await getRunway().textToVideo.create({
    model: "gen4.5",
    promptText: params.prompt,
    duration: params.durationSeconds,
    ratio: "1280:720",
  });
  return { jobId: task.id };
}

export type VideoJobStatus =
  | { status: "processing" }
  | { status: "succeeded"; videoUrl: string }
  | { status: "failed"; errorMessage: string };

export async function getVideoGenerationStatus(jobId: string): Promise<VideoJobStatus> {
  const task = await getRunway().tasks.retrieve(jobId);

  switch (task.status) {
    case "SUCCEEDED":
      return { status: "succeeded", videoUrl: task.output[0] };
    case "FAILED":
      return { status: "failed", errorMessage: task.failure };
    case "CANCELLED":
      return { status: "failed", errorMessage: "Generation was cancelled." };
    default:
      return { status: "processing" };
  }
}

export function buildEventFlyerPrompt(params: { title: string; description?: string | null }): string {
  const subject = params.description ? `${params.title} — ${params.description}` : params.title;

  return (
    `A warm, inviting promotional flyer graphic for a church event: "${subject}". ` +
    `Portrait poster composition, welcoming and community-oriented, tasteful religious ` +
    `iconography where appropriate, generous empty space near the top and bottom for ` +
    `overlaid event details. No readable text or lettering in the image.`
  );
}

/**
 * Image generation is fast enough (typically single-digit seconds) to await
 * synchronously within the request/response cycle, unlike video generation
 * which needs the separate job + poll flow in this module.
 */
export async function createEventFlyerImage(params: { prompt: string }): Promise<{ imageUrl: string }> {
  try {
    const task = await getRunway()
      .textToImage.create({
        model: "gen4_image",
        promptText: params.prompt,
        ratio: "1080:1440",
      })
      .waitForTaskOutput();

    const imageUrl = task.output[0];
    if (!imageUrl) throw new Error("Runway did not return an image");
    return { imageUrl };
  } catch (err) {
    if (err instanceof TaskFailedError) {
      throw new Error(err.taskDetails.status === "FAILED" ? err.taskDetails.failure : "Generation was cancelled.");
    }
    throw err;
  }
}
