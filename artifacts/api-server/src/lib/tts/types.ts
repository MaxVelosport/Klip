export interface TTSParams {
  text: string;
  voiceId: string;  // Yandex-style: baya, filipp, irina, jane, alyss
  speed?: number;   // 0.5–2.0, default 1.0
}

export interface TTSResult {
  buffer: Buffer;
  mimeType: string;
  durationSec: number;
  costRub: number;
  provider: string;
}

export interface TTSProvider {
  name: string;
  synthesize(params: TTSParams): Promise<TTSResult>;
}

export class TTSError extends Error {
  constructor(public provider: string, public code: string, message: string) {
    super(`[${provider}/${code}] ${message}`);
  }
}

// Yandex-style voice → SaluteSpeech voice mapping
export const SALUTESPEECH_VOICES: Record<string, string> = {
  baya:   "Bys_24000",  // мужской, спокойный
  filipp: "Nec_24000",  // мужской, дружелюбный
  irina:  "May_24000",  // женский, средний
  jane:   "Tur_24000",  // женский, энергичный
  alyss:  "Pon_24000",  // детский
};

// Yandex-style voice → Silero speaker mapping
export const SILERO_VOICES: Record<string, string> = {
  baya:   "aidar",
  filipp: "eugene",
  irina:  "kseniya",
  jane:   "xenia",
  alyss:  "kseniya",
};

export function estimateDuration(text: string, speed = 1.0): number {
  // ~120 words/min average Russian TTS at normal speed
  const words = text.trim().split(/\s+/).length;
  return Math.ceil((words / 120) * 60 / speed);
}
