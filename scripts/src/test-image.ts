import { getImageProvider } from "../../artifacts/api-server/src/lib/images/factory.js";
import { writeFileSync } from "node:fs";

async function test(name: string) {
  console.log(`\n=== Testing ${name} ===`);
  const provider = getImageProvider(name);
  const start = Date.now();
  try {
    const result = await provider.generate({
      prompt: "A futuristic quantum computer in a high-tech laboratory, photorealistic, dramatic blue lighting, cinematic composition",
      promptRu: "Футуристический квантовый компьютер в высокотехнологичной лаборатории, фотореализм, синее драматическое освещение",
      aspectRatio: "16:9",
    });
    const ext = result.mimeType.split("/")[1] ?? "png";
    const file = `/tmp/test-${name.replace(/[^a-z0-9]/g, "-")}-${Date.now()}.${ext}`;
    writeFileSync(file, result.buffer);
    console.log(`  ✅ Saved: ${file}`);
    console.log(`  Size: ${result.buffer.length} bytes`);
    console.log(`  MimeType: ${result.mimeType}`);
    console.log(`  Cost: ${result.costRub.toFixed(4)}₽`);
    console.log(`  Time: ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`  ❌ ${(err as Error).message}`);
  }
}

const target = process.argv[2];
if (target) {
  await test(target);
} else {
  await test("nano-banana-flash");
  await test("kandinsky-gigachat");
  await test("flux-schnell");
  await test("nano-banana-pro");
}
