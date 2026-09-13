import RunwayML from "@runwayml/sdk";

// Lazily constructed for the same reason as lib/openai/client.ts and
// lib/stripe/client.ts: Next.js imports every API route module at build time
// to collect its config, which would throw here if RUNWAY_API_KEY isn't
// present in the build environment.
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
