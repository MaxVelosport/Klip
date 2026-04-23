import { useState, useEffect, useRef } from "react";
import { StepInstructions } from "@/components/step-instructions";
import {
  Project,
  useUpdateScene,
  useDeleteScene,
  useAddScene,
  useGenerateScript,
  useGenerateImages,
  useUpdateProject,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Loader2,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Wand2,
  Download,
  FileText,
  FileType2,
  FileCode,
  CheckCircle2,
  Sparkles,
  Lightbulb,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { motion, AnimatePresence } from "framer-motion";
import { ScriptChat } from "@/components/projects/script-chat";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Flame } from "lucide-react";
import { HOOK_CATEGORIES, hooksByCategory, VIRAL_HOOKS, type HookCategory } from "@/lib/viral-hooks";

const TIPS = [
  "Чем конкретнее правка, тем точнее результат. Пример: «Сократи 2-ю сцену вдвое».",
  "Хороший хук — половина успеха. Попросите ИИ переписать первую фразу.",
  "В финале не забудьте про призыв: подписка, переход, комментарий.",
  "Слишком много терминов? Попросите упростить — ИИ сделает текст для всех.",
  "Сценарий можно сохранить в DOCX, чтобы согласовать с командой офлайн.",
];

export default function Step2Script({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const updateScene = useUpdateScene();
  const deleteScene = useDeleteScene();
  const addScene = useAddScene();
  const generateScript = useGenerateScript();
  const generateImages = useGenerateImages();
  const updateProject = useUpdateProject();

  const [localScenes, setLocalScenes] = useState(project.scenes);
  const [savingSceneId, setSavingSceneId] = useState<string | null>(null);
  const [highlightedIds, setHighlightedIds] = useState<Set<string>>(new Set());
  const [tipIndex, setTipIndex] = useState(0);
  const [exporting, setExporting] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  const [hooksOpen, setHooksOpen] = useState(false);
  const [activeHookCategory, setActiveHookCategory] = useState<HookCategory>("curiosity");
  const baseUrl = import.meta.env.BASE_URL;
  const lastSceneSnapshotRef = useRef<string>("");

  useEffect(() => {
    setLocalScenes(project.scenes);
  }, [project.scenes]);

  useEffect(() => {
    const id = setInterval(() => setTipIndex((i) => (i + 1) % TIPS.length), 6000);
    return () => clearInterval(id);
  }, []);

  const handleSceneChange = (sceneId: string, field: string, value: string) => {
    setLocalScenes((prev) =>
      prev.map((s) => (s.id === sceneId ? { ...s, [field]: value } : s))
    );
  };

  const saveScene = async (sceneId: string) => {
    const scene = localScenes.find((s) => s.id === sceneId);
    if (!scene) return;
    try {
      setSavingSceneId(sceneId);
      await updateScene.mutateAsync({
        id: project.id,
        sceneId,
        data: {
          title: scene.title,
          narration: scene.narration,
          imagePrompt: scene.imagePrompt,
        },
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Сцена сохранена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка сохранения");
    } finally {
      setSavingSceneId(null);
    }
  };

  const insertHookIntoFirstScene = async (hookText: string) => {
    const first = localScenes[0];
    if (!first) {
      toast.error("Сначала сгенерируйте сценарий");
      return;
    }
    if (updateScene.isPending) return;
    const existing = first.narration ?? "";
    const previousNarration = existing;
    const trimmedHook = hookText.trim();
    // Нормализуем ведущие пробелы/переводы строк, чтобы случайно не вставить дубликат.
    if (existing.trimStart().startsWith(trimmedHook)) {
      toast.info("Этот крючок уже стоит в начале первой сцены");
      setHooksOpen(false);
      return;
    }
    const next = trimmedHook + (existing ? "\n\n" + existing : "");
    setLocalScenes((prev) =>
      prev.map((s) => (s.id === first.id ? { ...s, narration: next } : s)),
    );
    setHighlightedIds(new Set([first.id]));
    setTimeout(() => setHighlightedIds(new Set()), 1500);
    try {
      await updateScene.mutateAsync({
        id: project.id,
        sceneId: first.id,
        data: { narration: next },
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Крючок добавлен в начало первой сцены");
      setHooksOpen(false);
    } catch (e) {
      // Откатываем оптимистичное обновление, если сервер не принял изменения.
      setLocalScenes((prev) =>
        prev.map((s) => (s.id === first.id ? { ...s, narration: previousNarration } : s)),
      );
      toast.error(e instanceof Error ? e.message : "Не удалось сохранить");
    }
  };

  const handleAddScene = async () => {
    try {
      await addScene.mutateAsync({
        id: project.id,
        data: { title: "Новая сцена", narration: "", imagePrompt: "" },
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Сцена добавлена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка добавления сцены");
    }
  };

  const handleDeleteScene = async (sceneId: string) => {
    try {
      await deleteScene.mutateAsync({ id: project.id, sceneId });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Сцена удалена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка удаления сцены");
    }
  };

  const handleRegenerate = async () => {
    try {
      await generateScript.mutateAsync({ id: project.id });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Запущена генерация сценария...");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка генерации");
    }
  };

  const handleApproveAndNext = async () => {
    try {
      setApproving(true);
      const ar = await fetch(`${baseUrl}api/projects/${project.id}/script/approve`, {
        method: "POST",
        credentials: "include",
      });
      if (!ar.ok) {
        const err = await ar.json().catch(() => ({}));
        throw new Error(err.error || "Не удалось согласовать сценарий");
      }
      await updateProject.mutateAsync({ id: project.id, data: { currentStep: 3 } });
      await generateImages.mutateAsync({ id: project.id });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Сценарий согласован — переходим к изображениям");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка перехода к следующему шагу");
    } finally {
      setApproving(false);
    }
  };

  const handleExport = async (format: "txt" | "md" | "docx") => {
    try {
      setExporting(format);
      const r = await fetch(
        `${baseUrl}api/projects/${project.id}/script/export?format=${format}`,
        { credentials: "include" }
      );
      if (!r.ok) throw new Error("Не удалось скачать файл");
      const blob = await r.blob();
      const cd = r.headers.get("Content-Disposition") ?? "";
      // Prefer RFC 5987 filename* (handles Cyrillic), fall back to filename="..."
      const star = /filename\*\s*=\s*UTF-8''([^;]+)/i.exec(cd);
      const plain = /filename\s*=\s*"([^"]+)"/i.exec(cd);
      let filename = `scenario.${format}`;
      if (star?.[1]) {
        try {
          filename = decodeURIComponent(star[1]);
        } catch {
          filename = plain?.[1] ?? filename;
        }
      } else if (plain?.[1]) {
        filename = plain[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(`Скачано: ${filename}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка скачивания");
    } finally {
      setExporting(null);
    }
  };

  const handleScenesChangedByAi = async (changedIds: string[]) => {
    setHighlightedIds(new Set(changedIds));
    await queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    setTimeout(() => setHighlightedIds(new Set()), 2400);
  };

  // Detect external scene mutations and pulse them
  useEffect(() => {
    const snap = project.scenes.map((s) => `${s.id}:${s.narration}:${s.title}`).join("|");
    if (lastSceneSnapshotRef.current && lastSceneSnapshotRef.current !== snap) {
      // changes already announced via toast in chat — no-op here
    }
    lastSceneSnapshotRef.current = snap;
  }, [project.scenes]);

  if (project.status === "draft") {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="max-w-md w-full p-8 border rounded-xl bg-card shadow-sm text-center space-y-6">
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 rounded-full border-4 border-primary/20 animate-ping" />
            <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
              <Wand2 className="w-8 h-8 text-primary animate-pulse" />
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-xl font-bold">ИИ пишет сценарий...</h3>
            <p className="text-muted-foreground text-sm">
              Анализируем тему, создаем структуру и пишем текст для диктора.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = localScenes.reduce((acc, s) => acc + s.durationSec, 0);
  const isOverTime = totalDuration > project.targetDurationSec;
  const exportingAny = exporting !== null;

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <StepInstructions
        stepKey="step2"
        title="Шаг 2 из 6 · Сценарий"
        intro="Прочитайте сценарий и попросите ИИ изменить, что не нравится"
        estimate="2–3 мин"
        bullets={[
          "Слева — сценарий, разбитый на сцены. Каждая сцена = одна картинка с озвучкой.",
          "Справа — чат с ИИ. Пишите простыми словами: «сократи», «сделай веселее», «добавь шутку про кота».",
          "Любую сцену можно отредактировать прямо в карточке — нажмите на текст.",
          "Когда нравится — нажмите «Согласовать сценарий» внизу.",
        ]}
        tip="Не бойтесь экспериментировать в чате — каждое сообщение перегенерирует только то, о чём вы попросили."
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Сценарий готов</h2>
          <p className="text-muted-foreground text-sm">
            Отредактируйте сами, попросите ИИ доработать или сразу согласуйте.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" disabled={exportingAny}>
                {exportingAny ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-2" />
                )}
                Скачать
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Формат документа</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleExport("txt")} disabled={exportingAny}>
                <FileText className="w-4 h-4 mr-2" />
                TXT — простой текст
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("md")} disabled={exportingAny}>
                <FileCode className="w-4 h-4 mr-2" />
                Markdown (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("docx")} disabled={exportingAny}>
                <FileType2 className="w-4 h-4 mr-2" />
                Word (.docx)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={hooksOpen} onOpenChange={setHooksOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="border-orange-500/40 text-orange-600 hover:bg-orange-500/10 hover:text-orange-600"
                data-testid="button-open-hooks"
              >
                <Flame className="w-4 h-4 mr-2" />
                Готовые крючки
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-lg overflow-y-auto" data-testid="hooks-sheet">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-orange-500" />
                  Библиотека вирусных крючков
                </SheetTitle>
                <SheetDescription>
                  {VIRAL_HOOKS.length} проверенных открывающих фраз. Клик — и крючок встанет в начало первой сцены.
                </SheetDescription>
              </SheetHeader>
              <Tabs
                value={activeHookCategory}
                onValueChange={(v) => setActiveHookCategory(v as HookCategory)}
                className="mt-4"
              >
                <TabsList className="grid grid-cols-3 w-full h-auto">
                  {HOOK_CATEGORIES.slice(0, 3).map((c) => (
                    <TabsTrigger key={c.id} value={c.id} className="text-xs">
                      <span className="mr-1">{c.emoji}</span> {c.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsList className="grid grid-cols-3 w-full h-auto mt-2">
                  {HOOK_CATEGORIES.slice(3).map((c) => (
                    <TabsTrigger key={c.id} value={c.id} className="text-xs">
                      <span className="mr-1">{c.emoji}</span> {c.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {HOOK_CATEGORIES.map((c) => (
                  <TabsContent key={c.id} value={c.id} className="mt-4 space-y-2" data-testid={`hooks-tab-${c.id}`}>
                    <p className="text-xs text-muted-foreground mb-3">{c.description}</p>
                    {hooksByCategory(c.id).map((h) => (
                      <button
                        key={h.id}
                        type="button"
                        onClick={() => insertHookIntoFirstScene(h.text)}
                        className="w-full text-left rounded-lg border bg-card p-3 hover:border-primary hover:bg-primary/5 transition-colors group"
                        data-testid={`hook-${h.id}`}
                      >
                        <p className="text-sm leading-relaxed">{h.text}</p>
                        <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-wider font-semibold mt-1.5 inline-block">
                          → Вставить в первую сцену
                        </span>
                      </button>
                    ))}
                  </TabsContent>
                ))}
              </Tabs>
            </SheetContent>
          </Sheet>

          <Button variant="outline" onClick={handleRegenerate} disabled={generateScript.isPending}>
            {generateScript.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Wand2 className="w-4 h-4 mr-2" />
            )}
            Перегенерировать
          </Button>
        </div>
      </div>

      <motion.div
        key={tipIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-sm"
      >
        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <span className="text-amber-900 dark:text-amber-100">{TIPS[tipIndex]}</span>
      </motion.div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4 min-h-0">
        <div className="flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 min-h-0">
            <AnimatePresence>
              {localScenes.map((scene, index) => {
                const pulsing = highlightedIds.has(scene.id);
                return (
                  <motion.div
                    key={scene.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                      opacity: 1,
                      y: 0,
                      boxShadow: pulsing
                        ? "0 0 0 3px hsl(var(--primary) / 0.45)"
                        : "0 0 0 0px hsl(var(--primary) / 0)",
                    }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.04 }}
                    className="group relative flex gap-3 p-4 border rounded-xl bg-card hover:border-primary/50 transition-colors"
                  >
                    {pulsing && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute -top-2 -right-2 z-10 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shadow"
                      >
                        <Sparkles className="w-3 h-3" />
                        Обновлено ИИ
                      </motion.div>
                    )}
                    <div className="flex-none pt-2 text-muted-foreground cursor-grab opacity-50 group-hover:opacity-100">
                      <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className="text-xs font-bold text-muted-foreground bg-muted rounded-md px-2 py-1 shrink-0">
                            {String(index + 1).padStart(2, "0")}
                          </span>
                          <Input
                            value={scene.title}
                            onChange={(e) => handleSceneChange(scene.id, "title", e.target.value)}
                            className="font-semibold text-base border-transparent hover:border-input focus-visible:border-input bg-transparent px-2"
                          />
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge variant="secondary">~{scene.durationSec} сек</Badge>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => saveScene(scene.id)}
                            disabled={savingSceneId === scene.id}
                          >
                            {savingSceneId === scene.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Save className="w-4 h-4 text-primary" />
                            )}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Удалить сцену?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Это действие нельзя отменить.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Отмена</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteScene(scene.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Удалить
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-muted-foreground ml-1 uppercase tracking-wider">
                            Текст диктора
                          </label>
                          <Textarea
                            value={scene.narration}
                            onChange={(e) => handleSceneChange(scene.id, "narration", e.target.value)}
                            className="resize-none h-28 bg-background/50"
                            placeholder="Текст, который будет озвучен..."
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[11px] font-medium text-muted-foreground ml-1 uppercase tracking-wider">
                            Подсказка для изображения
                          </label>
                          <Textarea
                            value={scene.imagePrompt}
                            onChange={(e) =>
                              handleSceneChange(scene.id, "imagePrompt", e.target.value)
                            }
                            className="resize-none h-28 bg-background/50 font-mono text-xs"
                            placeholder="Подробное описание картинки..."
                          />
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            <Button
              variant="outline"
              className="w-full h-12 border-dashed"
              onClick={handleAddScene}
              disabled={addScene.isPending}
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить сцену
            </Button>
          </div>
        </div>

        <div className="hidden lg:flex flex-col min-h-0">
          <ScriptChat
            projectId={project.id}
            baseUrl={baseUrl}
            onScenesChanged={handleScenesChangedByAi}
          />
        </div>
      </div>

      {/* Mobile chat */}
      <div className="lg:hidden h-[420px]">
        <ScriptChat
          projectId={project.id}
          baseUrl={baseUrl}
          onScenesChanged={handleScenesChangedByAi}
        />
      </div>

      <div className="flex items-center justify-between pt-4 border-t shrink-0 gap-3 flex-wrap">
        <div className="text-sm">
          <span className="text-muted-foreground">Общая длительность: </span>
          <span className={`font-semibold ${isOverTime ? "text-destructive" : "text-foreground"}`}>
            {totalDuration} сек
          </span>
          <span className="text-muted-foreground"> / Цель: {project.targetDurationSec} сек</span>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => updateProject.mutate({ id: project.id, data: { currentStep: 1 } })}
          >
            Назад
          </Button>
          <Button
            onClick={handleApproveAndNext}
            disabled={approving || updateProject.isPending || generateImages.isPending}
            className="bg-gradient-to-r from-primary to-primary/80"
          >
            {approving || updateProject.isPending || generateImages.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-2" />
            )}
            Согласовать и перейти к фото
          </Button>
        </div>
      </div>
    </div>
  );
}
