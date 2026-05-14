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
import { sbFrom, TABLE, type Project, type Scene, type ScriptMessage } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/session";
import { editScript } from "../lib/script-editor";

const router: Router = Router();

async function ownProject(req: AuthedRequest): Promise<Project | null> {
  const id = String(req.params.id ?? "");
  if (!id) return null;
  const { data: p } = await sbFrom(TABLE.projects)
    .select("*")
    .eq("id", id)
    .eq("user_id", req.userId!)
    .is("deleted_at", null)
    .maybeSingle();
  return (p as Project | null) ?? null;
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
      .eq("project_id", p.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    res.json({
      messages: ((rows ?? []) as ScriptMessage[]).map((m) => ({
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
      project_id: p.id,
      user_id: req.userId!,
      role: "user",
      content: userMsg,
    });
    if (uInsErr) throw new Error(uInsErr.message);

    const { data: scenes } = await sbFrom(TABLE.scenes)
      .select("*")
      .eq("project_id", p.id)
      .order("order_index", { ascending: true });

    if (!scenes || scenes.length === 0) {
      const reply = "Сначала сгенерируйте сценарий — мне нечего править.";
      const { data: m, error } = await sbFrom(TABLE.scriptMessages)
        .insert({ project_id: p.id, user_id: req.userId!, role: "assistant", content: reply })
        .select()
        .single();
      if (error) throw new Error(error.message);
      res.json({ assistant: serializeMsg(m as ScriptMessage), changedSceneIds: [] });
      return;
    }

    let editResult;
    try {
      editResult = await editScript(scenes as Scene[], userMsg);
    } catch (err) {
      console.error("[script-chat] LLM error:", (err as Error).message);
      const fallbackReply = "LLM временно недоступен. Попробуйте ещё раз через минуту.";
      const { data: m, error } = await sbFrom(TABLE.scriptMessages)
        .insert({ project_id: p.id, user_id: req.userId!, role: "assistant", content: fallbackReply })
        .select()
        .single();
      if (error) throw new Error(error.message);
      res.json({ assistant: serializeMsg(m as ScriptMessage), changedSceneIds: [] });
      return;
    }

    const { updates, summary } = editResult;

    for (const u of updates) {
      const set: Record<string, string> = {};
      if (u.title !== undefined) set.title = u.title;
      if (u.narration !== undefined) set.narration = u.narration;
      if (u.image_prompt !== undefined) set.image_prompt = u.image_prompt;
      if (Object.keys(set).length === 0) continue;
      await sbFrom(TABLE.scenes).update(set).eq("id", u.id);
    }

    const changedSceneIds = updates.map((u) => u.id);
    const diffSummary =
      updates.length === 0 ? "Без изменений сцен." : `Обновлено сцен: ${updates.length}.`;
    const replyContent = updates.length === 0 ? summary : `${summary} ${diffSummary}`;

    const { data: assistant, error: aInsErr } = await sbFrom(TABLE.scriptMessages)
      .insert({
        project_id: p.id,
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
        entity_id: p.id,
        message: `Сценарий доработан через чат (${updates.length} сцен)`,
      });
    }

    res.json({ assistant: serializeMsg(assistant as ScriptMessage), changedSceneIds });
  },
);

function serializeMsg(m: ScriptMessage) {
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
      .update({ current_step: Math.max(p.current_step, 3) })
      .eq("id", p.id);
    if (error) throw new Error(error.message);
    await sbFrom(TABLE.auditLog).insert({
      user_id: req.userId!,
      action: "script_approved",
      entity_type: "project",
      entity_id: p.id,
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
      .eq("project_id", p.id)
      .order("order_index", { ascending: true });

    const sceneList = (scenes ?? []) as Scene[];
    const base = safeFileName(p.title || "scenario");
    const filename = `${base}.${fmt}`;
    const totalSec = sceneList.reduce((acc, s) => acc + Number(s.duration_sec), 0);

    if (fmt === "txt") {
      const lines: string[] = [];
      lines.push(p.title);
      lines.push("=".repeat(Math.max(3, p.title.length)));
      lines.push("");
      lines.push(`Тема: ${p.topic_description}`);
      lines.push(`Длительность (план): ~${Math.round(totalSec)} сек`);
      lines.push(`Сцен: ${sceneList.length}`);
      lines.push("");
      sceneList.forEach((s, i) => {
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
      lines.push(`# ${p.title}`);
      lines.push("");
      lines.push(`**Тема:** ${p.topic_description}`);
      lines.push("");
      lines.push(`**Длительность (план):** ~${Math.round(totalSec)} сек`);
      lines.push("");
      lines.push(`**Сцен:** ${sceneList.length}`);
      lines.push("");
      sceneList.forEach((s, i) => {
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
      title: p.title,
      sections: [
        {
          properties: {},
          children: [
            new Paragraph({
              text: p.title,
              heading: HeadingLevel.TITLE,
              alignment: AlignmentType.CENTER,
            }),
            new Paragraph({
              children: [
                new TextRun({ text: "Тема: ", bold: true }),
                new TextRun(p.topic_description),
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
            ...sceneList.flatMap((s, i) => [
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
