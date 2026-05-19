import { SeedanceProvider } from "./seedance.js";
import { VideoError } from "./types.js";
import type { VideoClipProvider } from "./types.js";

export function getVideoClipProvider(name?: string): VideoClipProvider {
  const n = name ?? "seedance";
  switch (n) {
    case "seedance":
    case "seedance-fast": return new SeedanceProvider();
    default: throw new VideoError("factory", "UNKNOWN_PROVIDER", `Unknown video clip provider: ${n}`);
  }
}
