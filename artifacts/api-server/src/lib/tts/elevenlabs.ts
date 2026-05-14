import { TTSError } from "./types.js";
import type { TTSParams, TTSResult, TTSProvider } from "./types.js";

export class ElevenLabsProvider implements TTSProvider {
  readonly name = "elevenlabs";

  async synthesize(_params: TTSParams): Promise<TTSResult> {
    throw new TTSError("elevenlabs", "NOT_IMPLEMENTED", "ElevenLabs stub — not implemented");
  }
}
