/**
 * Test TTS providers.
 * Usage: tsx --env-file=.env scripts/src/test-tts.ts [provider] [voice]
 * Defaults: provider=salute-speech, voice=irina
 */
import { writeFileSync } from "node:fs";
import { getTTSProvider } from "../../artifacts/api-server/src/lib/tts/factory.js";

const providerName = process.argv[2] ?? "salute-speech";
const voice = process.argv[3] ?? "irina";
const text = "Привет! Это тестовая озвучка для проверки системы генерации голоса в НейроКлип. Всё работает отлично.";

console.log(`[test-tts] provider=${providerName}, voice=${voice}`);
const provider = getTTSProvider(providerName);

try {
  const t0 = Date.now();
  const result = await provider.synthesize({ text, voiceId: voice, speed: 1.0 });
  const elapsed = Date.now() - t0;

  const ext = result.mimeType.includes("mpeg") ? "mp3" : result.mimeType.includes("ogg") ? "ogg" : "wav";
  const outPath = `/tmp/test-tts-${providerName}.${ext}`;
  writeFileSync(outPath, result.buffer);

  console.log(`✓ ${providerName}: ${result.buffer.length} bytes, ${result.mimeType}, ~${result.durationSec}s, cost ${result.costRub}₽, ${elapsed}ms`);
  console.log(`  saved to ${outPath}`);
} catch (err) {
  console.error(`✗ ${providerName}: ${err instanceof Error ? err.message : err}`);
  process.exit(1);
}
