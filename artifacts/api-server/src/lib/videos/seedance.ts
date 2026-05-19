import { fetch as undiciFetch } from "undici";
import type { VideoGenerationParams, VideoGenerationResult, VideoClipProvider } from "./types.js";
import { VideoError } from "./types.js";

// Uses Kling Video v1.5 Standard on fal.ai (image-to-video)
// Sync fal.run endpoint — no polling needed for ≤5s clips
// Docs: https://fal.ai/models/fal-ai/kling-video/v1.5/standard/image-to-video

interface KlingResult {
  video?: { url: string; file_size?: number };
}

const SYNC_ENDPOINT = "https://fal.run/fal-ai/kling-video/v1.5/pro/image-to-video";
const QUEUE_SUBMIT = "https://queue.fal.run/fal-ai/kling-video/v1.5/pro/image-to-video/submit";

export class SeedanceProvider implements VideoClipProvider {
  readonly name = "seedance";

  async generate(params: VideoGenerationParams): Promise<VideoGenerationResult> {
    const apiKey = process.env.FAL_API_KEY;
    if (!apiKey) throw new VideoError("seedance", "NO_API_KEY", "FAL_API_KEY не задан");

    const authHeader = { "Authorization": `Key ${apiKey}` };
    const payload = {
      image_url:    params.imageUrl,
      prompt:       params.prompt || "smooth camera movement, cinematic, gentle motion",
      duration:     params.durationSec <= 5 ? "5" : "10",
      aspect_ratio: params.aspectRatio ?? "16:9",
    };

    // Try synchronous endpoint first (works for ≤5s clips, ~30s wait)
    const res = await undiciFetch(SYNC_ENDPOINT, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = (await res.json()) as KlingResult;
      const videoUrl = data.video?.url;
      if (videoUrl) {
        const dlRes = await undiciFetch(videoUrl);
        if (!dlRes.ok) throw new VideoError("seedance", "DOWNLOAD_FAILED", `HTTP ${dlRes.status}`);
        const buffer = Buffer.from(await dlRes.arrayBuffer());
        return {
          buffer,
          mimeType: "video/mp4",
          durationSec: params.durationSec,
          costRub: params.durationSec * 0.022 * 90,
          provider: this.name,
        };
      }
    }

    // Fallback: queue API
    const submitRes = await undiciFetch(QUEUE_SUBMIT, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!submitRes.ok) {
      const text = await submitRes.text().catch(() => "");
      throw new VideoError("seedance", `SUBMIT_${submitRes.status}`, text.slice(0, 300));
    }

    const queue = (await submitRes.json()) as { status_url: string; response_url: string; request_id: string };
    const deadline = Date.now() + 180_000;

    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 5000));

      const statusRes = await undiciFetch(queue.status_url, { headers: authHeader });
      if (!statusRes.ok) continue;

      const { status } = (await statusRes.json()) as { status: string };

      if (status === "FAILED") throw new VideoError("seedance", "JOB_FAILED", `Job ${queue.request_id} failed`);

      if (status === "COMPLETED") {
        const resultRes = await undiciFetch(queue.response_url, { headers: authHeader });
        if (!resultRes.ok) throw new VideoError("seedance", "RESULT_FAILED", `HTTP ${resultRes.status}`);

        const data = (await resultRes.json()) as KlingResult;
        const videoUrl = data.video?.url;
        if (!videoUrl) throw new VideoError("seedance", "NO_VIDEO_URL", "No video URL in result");

        const dlRes = await undiciFetch(videoUrl);
        if (!dlRes.ok) throw new VideoError("seedance", "DOWNLOAD_FAILED", `HTTP ${dlRes.status}`);

        const buffer = Buffer.from(await dlRes.arrayBuffer());
        return {
          buffer,
          mimeType: "video/mp4",
          durationSec: params.durationSec,
          costRub: params.durationSec * 0.022 * 90,
          provider: this.name,
        };
      }
    }

    throw new VideoError("seedance", "TIMEOUT", "fal.ai job timed out after 180s");
  }
}
