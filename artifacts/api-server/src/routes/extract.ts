import { Router, type IRouter } from "express";
import multer from "multer";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";
import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

const TEXT_LIKE = new Set([
  "text/plain",
  "text/markdown",
  "application/json",
  "text/csv",
  "text/html",
]);

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

router.post(
  "/extract-text",
  requireAuth,
  (req, res, next) => {
    upload.single("file")(req, res, (err: unknown) => {
      if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
          res.status(413).json({ error: "Файл слишком большой. Максимум 10 МБ." });
          return;
        }
        res.status(400).json({ error: "Не удалось принять файл" });
        return;
      }
      if (err) {
        next(err as Error);
        return;
      }
      next();
    });
  },
  async (req: AuthedRequest, res) => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Файл не получен" });
      return;
    }

    const MAX_TEXT = 8000;
    try {
      const mime = file.mimetype || "";
      const name = file.originalname || "файл";
      let text = "";
      let kind: "text" | "pdf" | "docx" | "image" = "text";

      if (TEXT_LIKE.has(mime) || /\.(txt|md|csv|json|html)$/i.test(name)) {
        text = file.buffer.toString("utf-8");
        kind = "text";
      } else if (mime === PDF || /\.pdf$/i.test(name)) {
        kind = "pdf";
        const mod = (await import("pdf-parse")) as unknown as {
          PDFParse: new (opts: { data: Buffer | Uint8Array }) => {
            getText: () => Promise<{ text: string }>;
            destroy?: () => Promise<void>;
          };
        };
        const parser = new mod.PDFParse({ data: file.buffer });
        try {
          const out = await parser.getText();
          text = out.text || "";
        } finally {
          await parser.destroy?.();
        }
      } else if (mime === DOCX || /\.docx$/i.test(name)) {
        kind = "docx";
        const out = await mammoth.extractRawText({ buffer: file.buffer });
        text = out.value || "";
      } else if (mime.startsWith("image/")) {
        kind = "image";
        const worker = await createWorker(["rus", "eng"]);
        try {
          const out = await worker.recognize(file.buffer);
          text = out.data.text || "";
        } finally {
          await worker.terminate();
        }
      } else {
        res.status(415).json({
          error: "Неподдерживаемый формат. Загрузите .txt, .md, .pdf, .docx или изображение.",
        });
        return;
      }

      const cleaned = text.replace(/\s+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
      const truncated = cleaned.length > MAX_TEXT;
      const result = truncated ? cleaned.slice(0, MAX_TEXT) : cleaned;

      res.json({
        text: result,
        truncated,
        kind,
        originalLength: cleaned.length,
        fileName: name,
      });
    } catch (err) {
      logger.error({ err }, "extract-text failed");
      res.status(500).json({ error: "Не удалось прочитать файл" });
    }
  },
);

// === Импорт текста по URL (статья / блог / лендинг) ===
const URL_FETCH_TIMEOUT_MS = 8000;
const URL_MAX_BYTES = 1_500_000;
const URL_MAX_TEXT = 1000;

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&laquo;/gi, "«")
    .replace(/&raquo;/gi, "»")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&#(\d+);/g, (_, n) => {
      const code = parseInt(n, 10);
      return code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : "";
    });
}

function stripHtml(html: string): { title?: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i);
  const title = decodeEntities((ogTitle?.[1] ?? titleMatch?.[1] ?? "").trim()).slice(0, 200);

  // Удаляем шум
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<header[\s\S]*?<\/header>/gi, " ")
    .replace(/<footer[\s\S]*?<\/footer>/gi, " ")
    .replace(/<nav[\s\S]*?<\/nav>/gi, " ")
    .replace(/<form[\s\S]*?<\/form>/gi, " ")
    .replace(/<aside[\s\S]*?<\/aside>/gi, " ");

  // Предпочитаем <article>/<main> если есть
  const articleMatch = cleaned.match(/<(article|main)[^>]*>([\s\S]*?)<\/\1>/i);
  const body = articleMatch?.[2] ?? cleaned;

  const text = decodeEntities(
    body
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|h[1-6]|li|div|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\s*\n\s*/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title: title || undefined, text };
}

/**
 * Возвращает true, если IP-адрес (v4 или v6) — приватный/loopback/link-local/
 * любой иной адрес в зарезервированных диапазонах. Используется для защиты от SSRF.
 */
function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const parts = ip.split(".").map((n) => parseInt(n, 10));
    if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return true;
    const [a, b] = parts as [number, number, number, number];
    return (
      a === 10 ||
      a === 127 ||
      a === 0 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a === 100 || // CGNAT 100.64/10 — для безопасности блокируем весь /8
      a >= 224 // multicast + reserved
    );
  }
  if (v === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::" || lower === "::1") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // IPv4-mapped IPv6 (::ffff:a.b.c.d) — рекурсивно проверяем v4 часть
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPrivateIp(mapped[1]!);
    return false;
  }
  // Не IP — считаем небезопасным
  return true;
}

/**
 * Проверяет URL на безопасность: только http/https, хост не в блокированном
 * списке имён, и DNS-разрешение даёт только публичные IP. Возвращает
 * нормализованный URL или ошибку.
 */
async function validatePublicUrl(input: string): Promise<{ url: URL } | { error: string; status: number }> {
  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { error: "Некорректная ссылка", status: 400 };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "Поддерживаются только ссылки http и https", status: 400 };
  }
  const host = parsed.hostname.toLowerCase();
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host === "" ||
    host === "metadata.google.internal" ||
    host.endsWith(".internal")
  ) {
    return { error: "Эта ссылка ведёт во внутреннюю сеть. Используйте публичный URL.", status: 400 };
  }
  // Если хост — это уже IP-литерал, проверяем напрямую (без DNS)
  if (isIP(host)) {
    if (isPrivateIp(host)) {
      return { error: "Эта ссылка ведёт во внутреннюю сеть. Используйте публичный URL.", status: 400 };
    }
    return { url: parsed };
  }
  // DNS-разрешение: блокируем, если ХОТЯ БЫ ОДИН IP — приватный
  try {
    const addrs = await dns.lookup(host, { all: true });
    if (addrs.length === 0) {
      return { error: "Не удалось определить адрес сайта", status: 400 };
    }
    for (const a of addrs) {
      if (isPrivateIp(a.address)) {
        return { error: "Эта ссылка ведёт во внутреннюю сеть. Используйте публичный URL.", status: 400 };
      }
    }
  } catch {
    return { error: "Не удалось определить адрес сайта", status: 400 };
  }
  return { url: parsed };
}

router.post("/extract-url", requireAuth, async (req, res) => {
  const url = typeof req.body?.url === "string" ? req.body.url.trim() : "";

  // Шаг 1: проверка исходного URL
  const initial = await validatePublicUrl(url);
  if ("error" in initial) {
    res.status(initial.status).json({ error: initial.error });
    return;
  }
  let current = initial.url;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), URL_FETCH_TIMEOUT_MS);

  try {
    // Ручная обработка редиректов: каждый Location перепроверяем на SSRF
    let resp: Response;
    let hops = 0;
    const MAX_HOPS = 4;
    while (true) {
      resp = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "NeuroClipBot/1.0 (+https://neuroclip.ru)",
          Accept: "text/html,application/xhtml+xml",
          "Accept-Language": "ru,en;q=0.8",
        },
      });
      if (resp.status >= 300 && resp.status < 400) {
        const loc = resp.headers.get("location");
        if (!loc) {
          res.status(502).json({ error: "Сайт вернул редирект без адреса" });
          return;
        }
        if (++hops > MAX_HOPS) {
          res.status(508).json({ error: "Слишком много редиректов" });
          return;
        }
        const next = new URL(loc, current);
        const validation = await validatePublicUrl(next.toString());
        if ("error" in validation) {
          res.status(validation.status).json({ error: validation.error });
          return;
        }
        current = validation.url;
        continue;
      }
      break;
    }

    if (!resp.ok) {
      res.status(422).json({ error: `Сайт ответил кодом ${resp.status}. Попробуйте другую ссылку.` });
      return;
    }

    const ctype = resp.headers.get("content-type") ?? "";
    if (!/^text\/html|application\/xhtml/i.test(ctype)) {
      res.status(415).json({ error: "Это не HTML-страница. Поддерживаем только статьи и обычные веб-страницы." });
      return;
    }

    const reader = resp.body?.getReader();
    if (!reader) {
      res.status(502).json({ error: "Пустой ответ от сайта" });
      return;
    }

    const chunks: Uint8Array[] = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const remaining = URL_MAX_BYTES - received;
      if (remaining <= 0) {
        await reader.cancel();
        break;
      }
      const slice = value.byteLength > remaining ? value.subarray(0, remaining) : value;
      chunks.push(slice);
      received += slice.byteLength;
      if (received >= URL_MAX_BYTES) {
        await reader.cancel();
        break;
      }
    }
    const merged = new Uint8Array(received);
    let off = 0;
    for (const c of chunks) {
      merged.set(c, off);
      off += c.byteLength;
    }
    const html = new TextDecoder("utf-8", { fatal: false }).decode(merged);

    const { title, text } = stripHtml(html);
    if (!text || text.length < 30) {
      res.status(422).json({ error: "На странице слишком мало текста. Попробуйте другую ссылку." });
      return;
    }

    const truncated = text.length > URL_MAX_TEXT;
    res.json({
      title,
      text: truncated ? text.slice(0, URL_MAX_TEXT) : text,
      truncated,
      sourceUrl: current.toString(),
      originalLength: text.length,
    });
  } catch (err: any) {
    if (err?.name === "AbortError") {
      res.status(504).json({ error: "Сайт отвечает слишком долго. Попробуйте другой URL." });
      return;
    }
    logger.error({ err }, "extract-url failed");
    res.status(502).json({ error: "Не удалось загрузить страницу" });
  } finally {
    clearTimeout(timer);
  }
});

export default router;
