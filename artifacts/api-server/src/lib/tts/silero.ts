import { spawn } from "node:child_process";
import { readFile, unlink } from "node:fs/promises";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { SILERO_VOICES, TTSError, estimateDuration } from "./types.js";
import type { TTSParams, TTSResult, TTSProvider } from "./types.js";

const SILERO_DIR = "/home/deploy/projects/neuroclip/silero";
const VENV_PYTHON = join(SILERO_DIR, "venv/bin/python3");
const SYNTH_SCRIPT = join(SILERO_DIR, "silero_synth.py");
const MODEL_PATH = join(SILERO_DIR, "models/v4_ru.pt");

function runPython(args: string[], timeoutMs = 120_000): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(VENV_PYTHON, args, { env: { ...process.env, OMP_NUM_THREADS: "1" } });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (d: Buffer) => { stdout += d.toString(); });
    proc.stderr.on("data", (d: Buffer) => { stderr += d.toString(); });

    const timer = setTimeout(() => {
      proc.kill();
      reject(new TTSError("silero", "TIMEOUT", `Silero exceeded ${timeoutMs}ms`));
    }, timeoutMs);

    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout.trim());
      else reject(new TTSError("silero", "EXIT_" + code, stderr.slice(0, 500) || stdout.slice(0, 500)));
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(new TTSError("silero", "SPAWN_ERROR", err.message));
    });
  });
}

export class SileroProvider implements TTSProvider {
  readonly name = "silero";

  async synthesize(params: TTSParams): Promise<TTSResult> {
    const speaker = SILERO_VOICES[params.voiceId] ?? SILERO_VOICES["irina"]!;
    const tmpPath = `/tmp/silero_${randomUUID()}.wav`;

    try {
      await runPython([SYNTH_SCRIPT, params.text, speaker, tmpPath]);
      const wavBuffer = await readFile(tmpPath);

      // Convert WAV to MP3 via ffmpeg if available
      let finalBuffer: Buffer;
      let mimeType: string;
      try {
        const mp3Path = tmpPath.replace(".wav", ".mp3");
        await runPython(["-c",
          `import subprocess; subprocess.run(['ffmpeg','-y','-i','${tmpPath}','${mp3Path}'], check=True, capture_output=True)`,
        ], 30_000);
        finalBuffer = await readFile(mp3Path);
        mimeType = "audio/mpeg";
        await unlink(mp3Path).catch(() => null);
      } catch {
        // ffmpeg unavailable — return WAV as-is
        finalBuffer = wavBuffer;
        mimeType = "audio/wav";
      }

      return {
        buffer: finalBuffer,
        mimeType,
        durationSec: estimateDuration(params.text, params.speed),
        costRub: 0,
        provider: this.name,
      };
    } finally {
      await unlink(tmpPath).catch(() => null);
    }
  }
}
