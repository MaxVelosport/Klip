import { Router } from "express";
import { z } from "zod";
import {
  Document,
  Packer,
  Paragraph,
  HeadingLevel,
  TextRun,
  AlignmentType,
} from "docx";
import { sbFrom, TABLE } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";

const router: Router = Router();

async function ownProject(req: AuthedRequest) {
  const id = String(req.params.id ?? "");
  if (!id) return null;
  const { data: p } = await sbFrom(TABLE.projects)
    .select("*")
    .eq("id", id)
    .eq("user_id", req.userId!)
    .is("deleted_at", null)
    .maybeSingle();
  return p ?? null;
}

router.get(
  "/projects/:id/script/messages",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const p = await ownProject(req);
    if (!p) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }
    const { data: rows, error } = await sbFrom(TABLE.scriptMessages)
      .select("*")
      .eq("project_id", (p as any).id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    res.json({
      messages: (rows ?? []).map((m: any) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        diffSummary: m.diff_summary,
        createdAt: m.created_at,
      })),
    });
  },
);

const sendSchema = z.object({
  message: z.string().min(1).max(2000),
});

type Intent =
  | "shorten"
  | "expand"
  | "punchier"
  | "formal"
  | "simpler"
  | "addHook"
  | "addCta"
  | "fixTitles"
  | "general";

function detectIntent(text: string): Intent {
  const t = text.toLowerCase();
  if (/(сократи|короче|укороти|урежь|поменьше|меньше слов)/.test(t)) return "shorten";
  if (/(подробнее|расширь|добавь|больше деталей|развёрнут|углуби)/.test(t)) return "expand";
  if (/(ярче|эмоциональн|драйв|живее|веселее|энергичн|интригу)/.test(t)) return "punchier";
  if (/(формальн|строже|деловой|официальн|нейтральн)/.test(t)) return "formal";
  if (/(проще|упрост|для новичков|без терминов|понятнее)/.test(t)) return "simpler";
  if (/(хук|зацеп|вступление|интро|первая фраза|первая сцена)/.test(t)) return "addHook";
  if (/(призыв|cta|подпис|подпишитесь|переход по ссылке|финал)/.test(t)) return "addCta";
  if (/(заголовк|названия сцен|тайтл)/.test(t)) return "fixTitles";
  return "general";
}

function trimSentences(text: string, keep: number): string {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= keep) return text;
  return parts.slice(0, keep).join(" ");
}

function applyEdits(
  scenes: Array<{ id: string; orderIndex: number; title: string; narration: string; durationSec: string }>,
  intent: Intent,
  userMessage: string,
): { updates: Array<{ id: string; title?: string; narration?: string }>; summary: string } {
  const updates: Array<{ id: string; title?: string; narration?: string }> = [];
  switch (intent) {
    case "shorten": {
      for (const s of scenes) {
        const next = trimSentences(s.narration, Math.max(1, Math.ceil(s.narration.split(/(?<=[.!?])\s+/).length / 2)));
        if (next !== s.narration) updates.push({ id: s.id, narration: next });
      }
      return { updates, summary: `Сократил повествование во всех сценах примерно вдвое.` };
    }
    case "expand": {
      for (const s of scenes) {
        const addition = " Дополним мысль: важно показать конкретный пример и сделать акцент на пользе для зрителя.";
        if (!s.narration.includes(addition)) updates.push({ id: s.id, narration: s.narration.trim() + addition });
      }
      return { updates, summary: `Добавил по одному развёрнутому предложению в каждую сцену.` };
    }
    case "punchier": {
      for (const s of scenes) {
        const lively = s.narration
          .replace(/\bочень\b/gi, "невероятно")
          .replace(/\.\s/g, "! ")
          .replace(/!!/g, "!");
        if (lively !== s.narration) updates.push({ id: s.id, narration: lively });
      }
      return { updates, summary: `Сделал текст более эмоциональным и динамичным.` };
    }
    case "formal": {
      for (const s of scenes) {
        const calm = s.narration.replace(/!+/g, ".").replace(/\s+/g, " ").trim();
        if (calm !== s.narration) updates.push({ id: s.id, narration: calm });
      }
      return { updates, summary: `Привёл повествование к нейтрально-деловому тону.` };
    }
    case "simpler": {
      for (const s of scenes) {
        const simple =
          "Простыми словами: " +
          s.narration
            .replace(/\b(специфический|концептуальный|парадигма|синергия|оптимизация)\b/gi, "понятный подход");
        if (simple !== s.narration) updates.push({ id: s.id, narration: simple });
      }
      return { updates, summary: `Упростил формулировки и убрал тяжёлые термины.` };
    }
    case "addHook": {
      const first = scenes[0];
      if (first) {
        const hook = "Подождите смотреть дальше — то, о чём расскажем сейчас, изменит ваш взгляд на тему. ";
        if (!first.narration.startsWith(hook))
          updates.push({ id: first.id, narration: hook + first.narration });
      }
      return { updates, summary: `Добавил цепляющий хук в первую сцену.` };
    }
    case "addCta": {
      const last = scenes[scenes.length - 1];
      if (last) {
        const cta = " Если было полезно — поставьте лайк и подпишитесь, чтобы не пропустить следующий выпуск.";
        if (!last.narration.includes(cta))
          updates.push({ id: last.id, narration: last.narration.trim() + cta });
      }
      return { updates, summary: `Добавил призыв к действию в финальную сцену.` };
    }
    case "fixTitles": {
      for (const s of scenes) {
        const t = s.title.replace(/\s+/g, " ").trim();
        const next = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase();
        if (next !== s.title) updates.push({ id: s.id, title: next });
      }
      return { updates, summary: `Унифицировал стиль заголовков сцен.` };
    }
    default: {
      const note = `\n\n[Учтено: ${userMessage.slice(0, 80)}]`;
      const target = scenes[0];
      if (target && !target.narration.includes(note)) {
        updates.push({ id: target.id, narration: target.narration + note });
      }
      return {
        updates,
        summary: `Учёл ваше пожелание и оставил пометку в первой сцене. Уточните, что именно поправить — например: «сократи», «сделай ярче», «добавь призыв в конце».`,
      };
    }
  }
}

router.post(
  "/projects/:id/script/messages",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const p = await ownProject(req);
    if (!p) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }
    const parsed = sendSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Сообщение слишком короткое или длинное" });
      return;
    }
    const userMsg = parsed.data.message.trim();

    const { error: uInsErr } = await sbFrom(TABLE.scriptMessages).insert({
      project_id: (p as any).id,
      user_id: req.userId!,
      role: "user",
      content: userMsg,
    });
    if (uInsErr) throw new Error(uInsErr.message);

    const { data: scenes } = await sbFrom(TABLE.scenes)
      .select("*")
      .eq("project_id", (p as any).id)
      .order("order_index", { ascending: true });

    if (!scenes || scenes.length === 0) {
      const reply = "Сначала сгенерируйте сценарий — мне нечего править.";
      const { data: m, error } = await sbFrom(TABLE.scriptMessages)
        .insert({ project_id: (p as any).id, user_id: req.userId!, role: "assistant", content: reply })
        .select()
        .single();
      if (error) throw new Error(error.message);
      res.json({ assistant: serializeMsg(m!), changedSceneIds: [] });
      return;
    }

    const intent = detectIntent(userMsg);
    const sceneInputs = scenes.map((s: any) => ({
      id: s.id,
      orderIndex: s.order_index,
      title: s.title,
      narration: s.narration,
      durationSec: s.duration_sec,
    }));
    const { updates, summary } = applyEdits(sceneInputs, intent, userMsg);

    for (const u of updates) {
      const set: Record<string, string> = {};
      if (u.title !== undefined) set.title = u.title;
      if (u.narration !== undefined) set.narration = u.narration;
      if (Object.keys(set).length === 0) continue;
      await sbFrom(TABLE.scenes).update(set).eq("id", u.id);
    }

    const changedSceneIds = updates.map((u) => u.id);
    const diffSummary =
      updates.length === 0 ? "Без изменений сцен." : `Обновлено сцен: ${updates.length}.`;
    const replyContent =
      updates.length === 0 ? `${summary}` : `${summary} ${diffSummary}`;

    const { data: assistant, error: aInsErr } = await sbFrom(TABLE.scriptMessages)
      .insert({
        project_id: (p as any).id,
        user_id: req.userId!,
        role: "assistant",
        content: replyContent,
        diff_summary: diffSummary,
      })
      .select()
      .single();
    if (aInsErr) throw new Error(aInsErr.message);

    if (updates.length > 0) {
      await sbFrom(TABLE.auditLog).insert({
        user_id: req.userId!,
        action: "script_refined",
        entity_type: "project",
        entity_id: (p as any).id,
        message: `Сценарий доработан через чат (${updates.length} сцен)`,
      });
    }

    res.json({ assistant: serializeMsg(assistant!), changedSceneIds });
  },
);

function serializeMsg(m: any) {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    diffSummary: m.diff_summary,
    createdAt: m.created_at,
  };
}

router.post(
  "/projects/:id/script/approve",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const p = await ownProject(req);
    if (!p) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }
    const { error } = await sbFrom(TABLE.projects)
      .update({ current_step: Math.max((p as any).current_step, 3) })
      .eq("id", (p as any).id);
    if (error) throw new Error(error.message);
    await sbFrom(TABLE.auditLog).insert({
      user_id: req.userId!,
      action: "script_approved",
      entity_type: "project",
      entity_id: (p as any).id,
      message: `Сценарий согласован`,
    });
    res.json({ ok: true });
  },
);

function safeFileName(name: string): string {
  return name.replace(/[^\p{L}\p{N}_-]+/gu, "_").slice(0, 60) || "scenario";
}

function asciiFallback(name: string): string {
  const ascii = name.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  return ascii.length > 0 ? ascii : "scenario";
}

function contentDisposition(filename: string): string {
  const ascii = asciiFallback(filename);
  const encoded = encodeURIComponent(filename);
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

router.get(
  "/projects/:id/script/export",
  requireAuth,
  async (req: AuthedRequest, res) => {
    const p = await ownProject(req);
    if (!p) {
      res.status(404).json({ error: "Проект не найден" });
      return;
    }
    const fmt = String(req.query.format ?? "txt").toLowerCase();
    if (!["txt", "md", "docx"].includes(fmt)) {
      res.status(400).json({ error: "Поддерживаются форматы: txt, md, docx" });
      return;
    }
    const { data: scenes } = await sbFrom(TABLE.scenes)
      .select("*")
      .eq("project_id", (p as any).id)
      .order("order_index", { ascending: true });

    const sceneList = scenes ?? [];
    const base = safeFileName((p as any).title || "scenario");
    const filename = `${base}.${fmt}`;
    const totalSec = sceneList.reduce((acc: number, s: any) => acc + Number(s.duration_sec), 0);

    if (fmt === "txt") {
      const lines: string[] = [];
      lines.push((p as any).title);
      lines.push("=".repeat(Math.max(3, (p as any).title.length)));
      lines.push("");
      lines.push(`Тема: ${(p as any).topic_description}`);
      lines.push(`Длительность (план): ~${Math.round(totalSec)} сек`);
      lines.push(`Сцен: ${sceneList.length}`);
      lines.push("");
      sceneList.forEach((s: any, i: number) => {
        lines.push(`Сцена ${i + 1}. ${s.title} (~${Number(s.duration_sec)} сек)`);
        lines.push("-".repeat(40));
        lines.push("Текст диктора:");
        lines.push(s.narration || "—");
        lines.push("");
        lines.push("Подсказка для изображения:");
        lines.push(s.image_prompt || "—");
        lines.push("");
      });
      const buf = Buffer.from(lines.join("\n"), "utf-8");
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Content-Disposition", contentDisposition(filename));
      res.send(buf);
      return;
    }

    if (fmt === "md") {
      const lines: string[] = [];
      lines.push(`# ${(p as any).title}`);
      lines.push("");
      lines.push(`**Тема:** ${(p as any).topic_description}`);
      lines.push("");
      lines.push(`**Длительность (план):** ~${Math.round(totalSec)} сек`);
      lines.push("");
      lines.push(`**Сцен:** ${sceneList.length}`);
      lines.push("");
      sceneList.forEach((s: any, i: number) => {
        lines.push(`## Сцена ${i + 1}. ${s.title}`);
        lines.push("");
        lines.push(`*~${Number(s.duration_sec)} сек*`);
        lines.push("");
        lines.push(`**Текст диктора:**`);
        lines.push("");
        lines.push(s.narration || "—");
        lines.push("");
        lines.push(`**Подсказка для изображения:**`);
        lines.push("");
        lines.push("```");
        lines.push(s.image_prompt || "—");
        lines.push("```");
        lines.push("");
      });
      const buf = Buffer.from(lines.join("\n"), "utf-8");
      res.setHeader("Content-Type", "text/markdown; charset=utf-8");
      res.setHeader("Content-Disposition", contentDisposition(filename));
      res.send(buf);
      return;
    }

    // docx
    const doc = new Document({
      creator: "НейроКлип",
      title: (p as any).title,
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: (p as any).title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Тема: ", bold: true }),
                new TextRun((p as any).topic_description),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Длительность (план): ", bold: true }),
                new TextRun(`~${Math.round(totalSec)} сек`),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Сцен: ", bold: true }),
                new TextRun(String(sceneList.length)),
              ],
            }),
            new Paragraph({ text: "" }),
            ...sceneList.flatMap((s: any, i: number) => [
              new Paragraph({
                text: `Сцена ${i + 1}. ${s.title}`,
                heading: HeadingLevel.HEADING_1,
              }),
              new Paragraph({
                children: [
                  new TextRun({ text: `~${Number(s.duration_sec)} сек`, italics: true, color: "666666" }),
                ],
              }),
              new Paragraph({ children: [new TextRun({ text: "Текст диктора:", bold: true })] }),
              new Paragraph({ text: s.narration || "—" }),
              new Paragraph({ children: [new TextRun({ text: "Подсказка для изображения:", bold: true })] }),
              new Paragraph({
                children: [new TextRun({ text: s.image_prompt || "—", font: "Consolas" })],
              }),
              new Paragraph({ text: "" }),
            ]),
          ],
        },
      ],
    });

    const buf = await Packer.toBuffer(doc);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    );
    res.setHeader("Content-Disposition", contentDisposition(filename));
    res.send(buf);
  },
);

export default router;
