import { getLLMProvider } from "../../artifacts/api-server/src/lib/llm/factory.js";

async function testProvider(name: string) {
  console.log(`\n=== Testing ${name} provider ===`);
  const provider = getLLMProvider(name);
  const start = Date.now();
  try {
    const result = await provider.chat(
      [{ role: "user", content: "Ответь одним словом: тест работает?" }],
      { temperature: 0.1, maxTokens: 50 },
    );
    const elapsed = ((Date.now() - start) / 1000).toFixed(1);
    console.log(`Response: ${result.content.trim()}`);
    console.log(`Tokens: in=${result.inputTokens} out=${result.outputTokens}`);
    console.log(`Cost: ${result.costRub.toFixed(6)}₽`);
    console.log(`Time: ${elapsed}s`);
  } catch (err) {
    console.error(`FAILED:`, (err as Error).message);
  }
}

const target = process.argv[2];
if (target) {
  await testProvider(target);
} else {
  await testProvider("deepseek");
  await testProvider("claude");
}
