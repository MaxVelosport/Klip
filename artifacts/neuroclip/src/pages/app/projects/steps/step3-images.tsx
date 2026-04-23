import { useState, useEffect, useRef, useMemo } from "react";
import { StepInstructions } from "@/components/step-instructions";
import {
  Project,
  useUpdateScene,
  useRegenerateSceneImage,
  useUpdateProject,
  useAddScene,
  useDeleteScene,
  useListPresets,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  Image as ImageIcon,
  Link as LinkIcon,
  Trash2,
  Plus,
  GripVertical,
  Wand2,
  Sparkles,
  Lightbulb,
  Pencil,
  Move3d,
  CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

type Scene = Project["scenes"][number];

const TIPS = [
  "Перетащите плитки, чтобы изменить порядок сцен в видео.",
  "Не нравится фото? Нажмите ↻ — ИИ подберёт другой вариант.",
  "В подсказке к фото пишите визуальные детали: стиль, свет, ракурс.",
  "Анимация «Зум внутрь» добавит ощущение приближения к зрителю.",
  "Чем меньше сцен, тем динамичнее видео. 5–7 — золотая середина.",
];

export default function Step3Images({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const updateScene = useUpdateScene();
  const regenerateImage = useRegenerateSceneImage();
  const updateProject = useUpdateProject();
  const addScene = useAddScene();
  const deleteScene = useDeleteScene();
  const { data: presets } = useListPresets();
  const { user } = useAuth();
  const isPro = user?.planId === "pro";
  const baseUrl = import.meta.env.BASE_URL;

  const [items, setItems] = useState<Scene[]>(project.scenes);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [highlightIds, setHighlightIds] = useState<Set<string>>(new Set());
  const [tip, setTip] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [newPrompt, setNewPrompt] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const isReorderingRef = useRef(false);

  useEffect(() => {
    if (!isReorderingRef.current) setItems(project.scenes);
  }, [project.scenes]);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const animations = presets?.animations ?? [];
  const totalImages = items.filter((s) => s.imageUrl).length;
  const allReady = items.length > 0 && totalImages === items.length;

  const flashHighlight = (ids: string[], ms = 1800) => {
    setHighlightIds(new Set(ids));
    setTimeout(() => setHighlightIds(new Set()), ms);
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = items.findIndex((s) => s.id === active.id);
    const newIdx = items.findIndex((s) => s.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const next = arrayMove(items, oldIdx, newIdx);
    setItems(next);
    isReorderingRef.current = true;
    try {
      const r = await fetch(`${baseUrl}api/projects/${project.id}/scenes/reorder`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: next.map((s) => s.id) }),
      });
      if (!r.ok) throw new Error("Не удалось сохранить порядок");
      toast.success("Порядок сохранён");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ошибка перестановки");
      setItems(project.scenes);
    } finally {
      isReorderingRef.current = false;
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    }
  };

  const regenerateOne = async (sceneId: string) => {
    setBusyIds((s) => new Set(s).add(sceneId));
    try {
      await regenerateImage.mutateAsync({ id: project.id, sceneId });
      flashHighlight([sceneId]);
      toast.success("Новый вариант готов");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка генерации");
    } finally {
      setBusyIds((s) => {
        const n = new Set(s);
        n.delete(sceneId);
        return n;
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    }
  };

  const regenerateAll = async () => {
    setBulkBusy(true);
    try {
      const r = await fetch(
        `${baseUrl}api/projects/${project.id}/scenes/regenerate-all-images`,
        { method: "POST", credentials: "include" },
      );
      if (!r.ok) throw new Error("Не удалось перегенерировать");
      flashHighlight(items.map((s) => s.id), 2400);
      toast.success("Все изображения обновлены");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBulkBusy(false);
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    }
  };

  const removeScene = async (sceneId: string) => {
    try {
      await deleteScene.mutateAsync({ id: project.id, sceneId });
      toast.success("Плитка удалена");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка удаления");
    } finally {
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    }
  };

  const addTile = async () => {
    const title = newTitle.trim() || "Новая сцена";
    const prompt = newPrompt.trim();
    try {
      const created = await addScene.mutateAsync({
        id: project.id,
        data: { title, narration: "", imagePrompt: prompt },
      });
      // Auto-generate an image for the new tile
      if (created?.id) {
        await regenerateImage.mutateAsync({ id: project.id, sceneId: created.id });
        flashHighlight([created.id], 2400);
      }
      toast.success("Плитка добавлена и сгенерирована");
      setAddOpen(false);
      setNewPrompt("");
      setNewTitle("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка добавления");
    } finally {
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    }
  };

  const handleNext = async () => {
    try {
      await updateProject.mutateAsync({
        id: project.id,
        data: { currentStep: 4 },
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка перехода");
    }
  };

  const setAnimationForAll = async (val: string) => {
    try {
      await Promise.all(
        items.map((s) =>
          updateScene.mutateAsync({
            id: project.id,
            sceneId: s.id,
            data: { animationType: val },
          }),
        ),
      );
      toast.success("Анимация применена ко всем плиткам");
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    }
  };

  // Status header copy
  const statusLine = useMemo(() => {
    if (allReady) return `Все ${totalImages} плиток готовы — переставьте, удалите лишнее или продолжайте.`;
    if (totalImages === 0) return "ИИ создаёт изображения для каждой сцены…";
    return `Сгенерировано ${totalImages} из ${items.length}`;
  }, [allReady, totalImages, items.length]);

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <StepInstructions
        stepKey="step3"
        title="Шаг 3 из 6 · Изображения"
        intro="К каждой сцене ИИ подбирает картинку — переделайте всё, что не нравится"
        estimate="2–4 мин"
        bullets={[
          "Кнопка «Ещё» под картинкой — сгенерировать новый вариант.",
          "Карандаш — отредактировать промт изображения вручную.",
          "Иконка ссылки — подставить свою картинку (URL).",
          "Перетаскивайте плитки мышью, чтобы поменять порядок сцен.",
          "Сверху есть «Обновить все» — заменить картинки во всех сценах разом.",
        ]}
        tip="Если стиль картинок не нравится — вернитесь на шаг 1 и поменяйте «Стиль изображений»."
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Изображения</h2>
          <p className="text-muted-foreground text-sm">{statusLine}</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-card">
            <Move3d className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Анимация ко всем:</span>
            <Select onValueChange={setAnimationForAll}>
              <SelectTrigger className="h-7 w-40 border-0 px-1 text-xs">
                <SelectValue placeholder="Выбрать…" />
              </SelectTrigger>
              <SelectContent>
                {animations.map((a) => (
                  <SelectItem key={a.value} value={a.value} disabled={a.proOnly && !isPro}>
                    <span className="flex items-center gap-2">
                      {a.label}
                      {a.proOnly && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1 uppercase">
                          PRO
                        </Badge>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={regenerateAll} disabled={bulkBusy || items.length === 0}>
            {bulkBusy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Обновить все
          </Button>

          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Добавить плитку
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Новая плитка</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Название сцены (необязательно)
                  </label>
                  <Input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="Новая сцена"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Подсказка для изображения
                  </label>
                  <Textarea
                    value={newPrompt}
                    onChange={(e) => setNewPrompt(e.target.value)}
                    placeholder="Например: ночной город сверху, неоновые огни, кинематографический свет"
                    className="resize-none h-24"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Отмена</Button>
                </DialogClose>
                <Button
                  onClick={addTile}
                  disabled={addScene.isPending || regenerateImage.isPending}
                >
                  {(addScene.isPending || regenerateImage.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  Создать и сгенерировать
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <motion.div
        key={tip}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-sm"
      >
        <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
        <span className="text-amber-900 dark:text-amber-100">{TIPS[tip]}</span>
      </motion.div>

      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="secondary" className="text-xs">
          Плиток: {items.length}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          Готово: {totalImages} / {items.length}
        </Badge>
        {allReady && (
          <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 text-xs">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Все готово
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto pr-2 min-h-0">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={items.map((s) => s.id)} strategy={rectSortingStrategy}>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <AnimatePresence>
                {items.map((scene, index) => (
                  <SortableTile
                    key={scene.id}
                    scene={scene}
                    index={index}
                    busy={busyIds.has(scene.id)}
                    highlight={highlightIds.has(scene.id)}
                    animations={animations}
                    isPro={isPro}
                    onRegenerate={() => regenerateOne(scene.id)}
                    onDelete={() => removeScene(scene.id)}
                    onUpdate={async (data) => {
                      try {
                        await updateScene.mutateAsync({
                          id: project.id,
                          sceneId: scene.id,
                          data,
                        });
                        queryClient.invalidateQueries({
                          queryKey: getGetProjectQueryKey(project.id),
                        });
                      } catch (e) {
                        toast.error(e instanceof Error ? e.message : "Ошибка");
                      }
                    }}
                  />
                ))}
              </AnimatePresence>
            </div>
          </SortableContext>
        </DndContext>
      </div>

      <div className="flex items-center justify-end pt-4 border-t shrink-0 gap-3">
        <Button
          variant="outline"
          onClick={() => updateProject.mutate({ id: project.id, data: { currentStep: 2 } })}
        >
          Назад
        </Button>
        <Button onClick={handleNext} disabled={updateProject.isPending} className="bg-gradient-to-r from-primary to-primary/80">
          {updateProject.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Дальше — анимация
        </Button>
      </div>
    </div>
  );
}

function SortableTile({
  scene,
  index,
  busy,
  highlight,
  animations,
  isPro,
  onRegenerate,
  onDelete,
  onUpdate,
}: {
  scene: Scene;
  index: number;
  busy: boolean;
  highlight: boolean;
  animations: Array<{ value: string; label: string; proOnly: boolean }>;
  isPro: boolean;
  onRegenerate: () => void;
  onDelete: () => void;
  onUpdate: (data: Partial<Scene>) => Promise<void>;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: scene.id,
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : "auto" as const,
  };
  const [editOpen, setEditOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [prompt, setPrompt] = useState(scene.imagePrompt);
  const [title, setTitle] = useState(scene.title);
  const [customUrl, setCustomUrl] = useState("");

  useEffect(() => {
    setPrompt(scene.imagePrompt);
    setTitle(scene.title);
  }, [scene.imagePrompt, scene.title]);

  const animLabel =
    animations.find((a) => a.value === scene.animationType)?.label ?? "Без анимации";

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{
        opacity: 1,
        scale: isDragging ? 1.03 : 1,
        boxShadow: highlight
          ? "0 0 0 3px hsl(var(--primary) / 0.55)"
          : isDragging
            ? "0 8px 24px hsl(var(--foreground) / 0.18)"
            : "0 0 0 0px hsl(var(--primary) / 0)",
      }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={`relative flex flex-col border rounded-xl bg-card overflow-hidden ${
        isDragging ? "ring-2 ring-primary/40" : ""
      }`}
    >
      {highlight && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-2 right-2 z-20 flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full shadow"
        >
          <Sparkles className="w-3 h-3" />
          Обновлено
        </motion.div>
      )}

      <div className="relative aspect-video bg-muted overflow-hidden border-b">
        {scene.imageUrl ? (
          <img
            src={scene.imageUrl}
            alt={scene.title}
            className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground">
            {busy ? (
              <Loader2 className="w-8 h-8 animate-spin" />
            ) : (
              <ImageIcon className="w-8 h-8 opacity-40" />
            )}
            <span className="text-xs">{busy ? "Генерация…" : "Нет изображения"}</span>
          </div>
        )}

        {busy && scene.imageUrl && (
          <div className="absolute inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <span className="text-xs">ИИ подбирает другой вариант…</span>
            </div>
          </div>
        )}

        <button
          {...attributes}
          {...listeners}
          aria-label="Перетащить"
          className="absolute top-2 left-2 z-10 cursor-grab active:cursor-grabbing rounded-md bg-background/80 backdrop-blur p-1.5 border hover:bg-background"
        >
          <GripVertical className="w-4 h-4 text-muted-foreground" />
        </button>

        <span className="absolute bottom-2 left-2 z-10 text-[11px] font-bold bg-background/80 backdrop-blur px-2 py-0.5 rounded-md border">
          {String(index + 1).padStart(2, "0")}
        </span>
      </div>

      <div className="p-3 space-y-3 flex-1 flex flex-col">
        <div>
          <h4 className="font-semibold text-sm line-clamp-1">{scene.title}</h4>
          <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
            {scene.imagePrompt || "Без описания"}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Move3d className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <Select
            value={scene.animationType}
            onValueChange={(v) => onUpdate({ animationType: v })}
          >
            <SelectTrigger className="h-8 text-xs flex-1">
              <SelectValue placeholder={animLabel} />
            </SelectTrigger>
            <SelectContent>
              {animations.map((a) => (
                <SelectItem key={a.value} value={a.value} disabled={a.proOnly && !isPro}>
                  <span className="flex items-center gap-2">
                    {a.label}
                    {a.proOnly && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 uppercase">
                        PRO
                      </Badge>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex gap-1.5 mt-auto">
          <Button
            size="sm"
            variant="secondary"
            className="flex-1"
            onClick={onRegenerate}
            disabled={busy}
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${busy ? "animate-spin" : ""}`} />
            Ещё
          </Button>

          <Dialog open={editOpen} onOpenChange={setEditOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" title="Изменить подсказку">
                <Pencil className="w-3.5 h-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Редактировать плитку</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 py-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Название сцены
                  </label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Подсказка для изображения
                  </label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="resize-none h-32 font-mono text-xs"
                  />
                </div>
              </div>
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="ghost">Отмена</Button>
                </DialogClose>
                <Button
                  onClick={async () => {
                    await onUpdate({ title, imagePrompt: prompt });
                    setEditOpen(false);
                    toast.success("Плитка обновлена");
                  }}
                >
                  Сохранить
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" title="Ещё">
                <Wand2 className="w-3.5 h-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Действия с плиткой</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <Dialog open={urlOpen} onOpenChange={setUrlOpen}>
                <DialogTrigger asChild>
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <LinkIcon className="w-3.5 h-3.5 mr-2" />
                    Свой URL картинки
                  </DropdownMenuItem>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Свой URL картинки</DialogTitle>
                  </DialogHeader>
                  <div className="py-3">
                    <Input
                      value={customUrl}
                      onChange={(e) => setCustomUrl(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button variant="ghost">Отмена</Button>
                    </DialogClose>
                    <Button
                      onClick={async () => {
                        if (!customUrl) return;
                        await onUpdate({ imageUrl: customUrl });
                        setUrlOpen(false);
                        setCustomUrl("");
                        toast.success("Картинка заменена");
                      }}
                    >
                      Применить
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </DropdownMenuContent>
          </DropdownMenu>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                title="Удалить"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Удалить плитку?</AlertDialogTitle>
                <AlertDialogDescription>
                  Сцена «{scene.title}» будет удалена. Это действие нельзя отменить.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Отмена</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onDelete}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Удалить
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}
