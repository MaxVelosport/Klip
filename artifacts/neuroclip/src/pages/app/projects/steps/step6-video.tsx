import { useEffect, useMemo, useState } from "react";
import { StepInstructions } from "@/components/step-instructions";
import { ConfettiBurst } from "@/components/confetti-burst";
import { Link, useLocation } from "wouter";
import {
  Project,
  useGetProjectProgress,
  getGetProjectProgressQueryKey,
  useUpdateProject,
  useDuplicateProject,
  getGetProjectQueryKey,
  useListPresets,
  getGetCurrentUserQueryKey,
} from "@workspace/api-client-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Download,
  Copy,
  Share2,
  Clapperboard,
  Plus,
  Video,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  Sparkles,
  Lock,
  Film,
  Mic,
  Music,
  Image as ImageIcon,
  Clock,
  CheckCircle2,
  RotateCcw,
  Coins,
  Wallet,
  TrendingUp,
  AlertTriangle,
  Palette,
} from "lucide-react";
import { SocialPostGenerator } from "@/components/projects/social-post-generator";
import { useGetBrandKit } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const TIPS = [
  "Финальный рендер собирает картинки, голос, музыку и субтитры в один MP4-файл.",
  "Не закрывайте вкладку во время рендера — мы работаем над вашим видео.",
  "Качество HD и 4K без водяного знака доступны на тарифе PRO.",
  "Готово? Сохраните MP4 и поделитесь в соцсетях прямо отсюда.",
  "Можно сделать копию проекта и выпустить серию однотипных видео быстрее.",
];

const QUALITIES = [
  { id: "sd", label: "Стандарт 720p", desc: "Быстрый рендер для черновиков", proOnly: false },
  { id: "hd", label: "HD 1080p", desc: "Оптимально для соцсетей и YouTube", proOnly: true },
  { id: "uhd", label: "4K UHD", desc: "Максимальное качество", proOnly: true },
];

type CostLine = { label: string; detail?: string; tokens: number };
type CostBreakdown = {
  lines: CostLine[];
  subtotal: number;
  qualityMultiplier: number;
  qualityLabel: string;
  watermarkBonus: number;
  beforeMarkup: number;
  markupPercent: number;
  markup: number;
  total: number;
};
type CostEstimate = {
  cost: CostBreakdown;
  balance: number;
  sufficient: boolean;
  missing: number;
};

export default function Step6Video({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();
  const duplicateProject = useDuplicateProject();
  const { data: presets } = useListPresets();
  const { data: brandKit } = useGetBrandKit();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const isFree = user?.planId === "free";
  const baseUrl = import.meta.env.BASE_URL;
  const [renderBusy, setRenderBusy] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null>(project.shareToken ?? null);
  const [shareBusy, setShareBusy] = useState(false);

  useEffect(() => {
    setShareToken(project.shareToken ?? null);
  }, [project.shareToken]);

  const baseOrigin = typeof window !== "undefined" ? window.location.origin : "";
  const shareUrl = shareToken ? `${baseOrigin}${import.meta.env.BASE_URL}share/${shareToken}` : "";

  const createShareLink = async () => {
    setShareBusy(true);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/projects/${encodeURIComponent(project.id)}/share`,
        { method: "POST", credentials: "include" },
      );
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error ?? "Не удалось создать ссылку");
      }
      const json = await res.json();
      setShareToken(json.shareToken);
      toast.success("Публичная ссылка создана");
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось создать ссылку");
    } finally {
      setShareBusy(false);
    }
  };

  const revokeShareLink = async () => {
    setShareBusy(true);
    try {
      const res = await fetch(
        `${import.meta.env.BASE_URL}api/projects/${encodeURIComponent(project.id)}/share`,
        { method: "DELETE", credentials: "include" },
      );
      if (!res.ok) throw new Error("Не удалось отозвать ссылку");
      setShareToken(null);
      toast.success("Ссылка отозвана");
    } catch (e: any) {
      toast.error(e?.message ?? "Не удалось отозвать");
    } finally {
      setShareBusy(false);
    }
  };

  const copyShareLink = async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const [quality, setQuality] = useState<string>(
    () => localStorage.getItem(`q:${project.id}`) ?? "sd",
  );
  const [removeWatermark, setRemoveWatermark] = useState<boolean>(
    () => localStorage.getItem(`rw:${project.id}`) === "1",
  );
  useEffect(() => {
    localStorage.setItem(`q:${project.id}`, quality);
    localStorage.setItem(`rw:${project.id}`, removeWatermark ? "1" : "0");
  }, [quality, removeWatermark, project.id]);

  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);

  const { data: progress } = useGetProjectProgress(project.id, {
    query: {
      queryKey: getGetProjectProgressQueryKey(project.id),
      refetchInterval:
        project.status === "done" || project.status === "failed" ? false : 1500,
    },
  });

  useEffect(() => {
    if (
      (progress?.status === "done" || progress?.status === "failed") &&
      project.status !== progress.status
    ) {
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    }
  }, [progress?.status, project.status, project.id, queryClient]);

  const voiceLabel = useMemo(
    () => presets?.voices.find((v) => v.id === project.voiceId)?.label ?? project.voiceId,
    [presets, project.voiceId],
  );
  const musicLabel = useMemo(
    () => presets?.music.find((m) => m.id === project.backgroundMusicId)?.label ?? "Без музыки",
    [presets, project.backgroundMusicId],
  );
  const styleLabel = useMemo(
    () =>
      presets?.visualStyles.find((s) => s.value === project.visualStyle)?.label ??
      project.visualStyle,
    [presets, project.visualStyle],
  );

  const estimateBody = useMemo(
    () => ({ quality, removeWatermark: removeWatermark && !isFree }),
    [quality, removeWatermark, isFree],
  );

  const estimateQuery = useQuery<CostEstimate>({
    queryKey: ["cost-estimate", project.id, estimateBody],
    queryFn: async () => {
      const r = await fetch(`${baseUrl}api/projects/${project.id}/cost-estimate`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateBody),
      });
      if (!r.ok) throw new Error("Не удалось рассчитать стоимость");
      return r.json();
    },
    enabled:
      project.status === "audio_ready" ||
      project.status === "done" ||
      project.status === "failed",
  });

  const refreshAfterCharge = () => {
    queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    queryClient.invalidateQueries({ queryKey: getGetCurrentUserQueryKey() });
    queryClient.invalidateQueries({ queryKey: ["cost-estimate", project.id] });
  };

  const callRender = async (path: "render" | "rerender", successMsg: string) => {
    setRenderBusy(true);
    try {
      const r = await fetch(`${baseUrl}api/projects/${project.id}/${path}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(estimateBody),
      });
      if (r.status === 402) {
        const data = (await r.json().catch(() => null)) as
          | { error?: string; missing?: number }
          | null;
        toast.error(
          data?.error ??
            `Не хватает ${data?.missing ?? "?"} жетонов. Пополните баланс.`,
          {
            duration: 6000,
            action: { label: "Пополнить", onClick: () => navigate("/app/billing") },
          },
        );
        refreshAfterCharge();
        return;
      }
      if (!r.ok) {
        const data = (await r.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Ошибка запуска рендера");
      }
      refreshAfterCharge();
      toast.success(successMsg);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка запуска рендера");
    } finally {
      setRenderBusy(false);
    }
  };

  const handleRender = () =>
    callRender("render", `Списано ${estimateQuery.data?.cost.total ?? "?"} жетонов`);
  const handleRerender = () =>
    callRender(
      "rerender",
      `Запущен новый рендер (списано ${estimateQuery.data?.cost.total ?? "?"} жетонов)`,
    );

  const handleDuplicate = async () => {
    try {
      const copy = await duplicateProject.mutateAsync({ id: project.id });
      toast.success("Копия проекта создана");
      navigate(`/app/projects/${copy.id}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка дублирования");
    }
  };

  const handleCopyLink = () => {
    if (!project.finalVideoUrl) return;
    navigator.clipboard.writeText(project.finalVideoUrl);
    toast.success("Ссылка скопирована");
  };

  const shareVk = () => {
    if (!project.finalVideoUrl) return;
    window.open(
      `https://vk.com/share.php?url=${encodeURIComponent(project.finalVideoUrl)}&title=${encodeURIComponent(project.title)}`,
      "_blank",
    );
  };

  const shareTg = () => {
    if (!project.finalVideoUrl) return;
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(project.finalVideoUrl)}&text=${encodeURIComponent(project.title)}`,
      "_blank",
    );
  };

  const TipCard = (
    <motion.div
      key={tip}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-2 px-3 py-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-sm"
    >
      <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
      <span className="text-amber-900 dark:text-amber-100">{TIPS[tip]}</span>
    </motion.div>
  );

  const Summary = (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="p-3 border rounded-xl bg-card">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <ImageIcon className="w-3 h-3" /> Сцен
        </div>
        <div className="text-lg font-bold mt-1">{project.scenes.length}</div>
      </div>
      <div className="p-3 border rounded-xl bg-card">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Длительность
        </div>
        <div className="text-lg font-bold mt-1">~{project.targetDurationSec}с</div>
      </div>
      <div className="p-3 border rounded-xl bg-card">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Mic className="w-3 h-3" /> Голос
        </div>
        <div className="text-sm font-semibold mt-1 truncate">{voiceLabel}</div>
      </div>
      <div className="p-3 border rounded-xl bg-card">
        <div className="text-[10px] uppercase tracking-wide text-muted-foreground flex items-center gap-1.5">
          <Music className="w-3 h-3" /> Музыка
        </div>
        <div className="text-sm font-semibold mt-1 truncate">{musicLabel}</div>
      </div>
    </div>
  );

  // ===== AUDIO READY: pre-render =====
  if (project.status === "audio_ready") {
    return (
      <div className="h-full flex flex-col space-y-4 pb-6">
        <StepInstructions
          stepKey="step6-render"
          title="Шаг 6 из 6 · Финальный рендер"
          intro="Запустите сборку — через минуту получите готовый MP4"
          estimate="1–2 мин"
          bullets={[
            "Выберите качество: 720p — бесплатно для всех, HD/4K — на тарифе PRO.",
            "Внизу — прозрачная смета: видно, сколько жетонов уйдёт.",
            "Нажмите «Списать N жетонов и собрать» — ИИ соберёт все картинки, голос и музыку в одно видео.",
            "Если жетонов не хватает, кнопка превратится в «Пополнить» и приведёт в раздел биллинга.",
          ]}
          tip="Если что-то пойдёт не так при рендере — мы автоматически вернём жетоны на баланс."
        />
        <div>
          <h2 className="text-2xl font-bold">Всё готово к сборке</h2>
          <p className="text-muted-foreground text-sm">
            Сценарий, изображения, анимации и озвучка готовы. Осталось запустить рендер.
          </p>
        </div>

        {TipCard}

        <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-5">
          {Summary}

          <div className="p-4 border rounded-xl bg-card space-y-3">
            <div className="flex items-center gap-2">
              <Film className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Качество рендера</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {QUALITIES.map((q) => {
                const locked = q.proOnly && isFree;
                const selected = quality === q.id;
                return (
                  <button
                    key={q.id}
                    type="button"
                    disabled={locked}
                    onClick={() => setQuality(q.id)}
                    className={`relative text-left p-3 rounded-xl border bg-background transition-all hover:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-semibold text-sm">{q.label}</div>
                      {q.proOnly && (
                        <Badge variant="secondary" className="text-[9px] uppercase h-4 px-1">
                          PRO
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">{q.desc}</div>
                    {selected && (
                      <CheckCircle2 className="w-4 h-4 text-primary absolute top-3 right-3" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border rounded-xl bg-card flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {isFree ? (
                <Lock className="w-4 h-4 text-muted-foreground shrink-0" />
              ) : (
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
              )}
              <div className="min-w-0">
                <div className="font-semibold text-sm">Без водяного знака</div>
                <div className="text-[11px] text-muted-foreground">
                  {isFree
                    ? "Доступно на тарифе PRO. Откройте Биллинг для апгрейда."
                    : "Видео будет без логотипа НейроКлип."}
                </div>
              </div>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={removeWatermark}
              disabled={isFree}
              onClick={() => setRemoveWatermark((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${removeWatermark && !isFree ? "bg-primary" : "bg-muted"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-background shadow transition-transform ${removeWatermark && !isFree ? "translate-x-5" : ""}`}
              />
            </button>
          </div>

          <div className="p-4 border rounded-xl bg-card">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Стиль изображений
            </div>
            <Badge variant="secondary">{styleLabel}</Badge>
          </div>

          <CostCard
            estimate={estimateQuery.data}
            isLoading={estimateQuery.isLoading}
            onTopUp={() => navigate("/app/billing")}
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t shrink-0 gap-3 flex-wrap">
          <Button
            variant="outline"
            onClick={() =>
              updateProject.mutate({ id: project.id, data: { currentStep: 5 } })
            }
          >
            Назад к озвучке
          </Button>
          {estimateQuery.data && !estimateQuery.data.sufficient ? (
            <Button
              size="lg"
              onClick={() => navigate("/app/billing")}
              className="px-8 bg-gradient-to-r from-amber-500 to-orange-500 text-white"
            >
              <Wallet className="w-5 h-5 mr-2" />
              Пополнить баланс — нужно ещё {estimateQuery.data.missing} жетонов
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleRender}
              disabled={renderBusy || estimateQuery.isLoading}
              className="px-8 bg-gradient-to-r from-primary to-primary/80"
            >
              {renderBusy ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Video className="w-5 h-5 mr-2" />
              )}
              {estimateQuery.data
                ? `Списать ${estimateQuery.data.cost.total} жетонов и собрать`
                : "Запустить сборку видео"}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ===== RENDERING =====
  if (
    project.status === "rendering" ||
    progress?.status === "rendering" ||
    progress?.status === "queued"
  ) {
    const currentProgress = progress?.progress ?? 0;
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="relative w-56 h-56 flex items-center justify-center">
          <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 100 100">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              className="text-muted stroke-[4]"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              className="text-primary stroke-[4]"
              strokeDasharray="283"
              initial={{ strokeDashoffset: 283 }}
              animate={{ strokeDashoffset: 283 - (283 * currentProgress) / 100 }}
              transition={{ duration: 0.5, ease: "easeInOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-bold font-mono">{currentProgress}%</span>
            <span className="text-[11px] text-muted-foreground mt-1">
              Качество: {QUALITIES.find((q) => q.id === quality)?.label}
            </span>
          </div>
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-2xl font-bold">{progress?.stageLabel ?? "Рендеринг видео…"}</h2>
          <p className="text-muted-foreground text-sm">
            Можно закрыть вкладку — мы пришлём готовое видео в проект.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            {progress?.etaSeconds && progress.etaSeconds > 0 ? (
              <Badge variant="secondary">Осталось ~{progress.etaSeconds} сек</Badge>
            ) : null}
            {progress?.queuePosition !== undefined && progress.queuePosition > 0 ? (
              <Badge variant="outline">В очереди: {progress.queuePosition}</Badge>
            ) : null}
          </div>
        </div>

        <AnimatePresence mode="wait">{TipCard}</AnimatePresence>
      </div>
    );
  }

  // ===== FAILED =====
  if (project.status === "failed") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-6">
        <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-destructive">Ошибка рендеринга</h2>
          <p className="text-muted-foreground mt-2 max-w-md">
            {project.errorMessage || "Произошла неизвестная ошибка при сборке видео."}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => updateProject.mutate({ id: project.id, data: { currentStep: 5 } })}>
            Вернуться к настройкам
          </Button>
          <Button onClick={handleRender} disabled={renderBusy}>
            <RefreshCw className="w-4 h-4 mr-2" /> Попробовать снова
          </Button>
        </div>
      </div>
    );
  }

  // ===== DONE =====
  if (project.status === "done" && project.finalVideoUrl) {
    const remaining = Math.max(
      0,
      (user?.videosQuota ?? 0) - (user?.videosUsedThisPeriod ?? 0),
    );
    return (
      <div className="h-full flex flex-col space-y-4 pb-6">
        <ConfettiBurst />
        <StepInstructions
          stepKey="step6-done"
          title="🎬 Видео готово · что дальше?"
          intro="Скачайте, поделитесь или соберите ещё одну версию"
          estimate=""
          bullets={[
            "▶ Кнопка «Воспроизвести» в плеере — посмотреть прямо здесь.",
            "⬇ «Скачать MP4» — сохранить файл на устройство.",
            "🔗 «Поделиться ссылкой» — открыть видео в новой вкладке (можно отправить кому угодно).",
            "✏️ «Доработать сценарий» — вернуться к шагам 2–5, что-то поменять и пересобрать.",
            "📋 «Создать копию» — клонировать проект и сделать вариант с другими настройками.",
          ]}
          tip="Доработка не удаляет это видео — у вас останется и старая версия, и новая."
        />
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Готово!
            </h2>
            <p className="text-muted-foreground text-sm">
              Видео успешно собрано. Скачайте, поделитесь или сделайте копию.
            </p>
          </div>
          {isFree && (
            <Badge variant="outline" className="text-primary border-primary">
              НейроКлип Free
            </Badge>
          )}
        </div>

        <div className="flex-1 overflow-y-auto pr-2 min-h-0 grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 bg-black rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center min-h-[320px] border border-border/50 relative">
            {(() => {
              const ratio = (project.aspectRatio as "16:9" | "9:16" | "1:1") || "16:9";
              const ratioClass =
                ratio === "9:16" ? "aspect-[9/16] max-h-[640px]" :
                ratio === "1:1" ? "aspect-square max-h-[600px]" :
                "aspect-video max-h-[600px]";
              return (
                <div className={`${ratioClass} w-auto h-full mx-auto bg-black flex items-center justify-center`}>
                  <video
                    controls
                    poster={project.thumbnailUrl || undefined}
                    src={project.finalVideoUrl}
                    data-testid="final-video"
                    className="w-full h-full object-contain"
                  />
                </div>
              );
            })()}
            <Badge
              variant="secondary"
              className="absolute top-3 left-3 bg-black/60 text-white border-white/20 backdrop-blur"
              data-testid="aspect-badge"
            >
              {project.aspectRatio || "16:9"}
            </Badge>
          </div>

          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 bg-card border rounded-2xl space-y-3">
              <h3 className="font-semibold border-b pb-2">Действия</h3>
              <Button asChild className="w-full justify-start h-11">
                <a
                  href={project.finalVideoUrl}
                  download={`${project.title}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <Download className="w-4 h-4 mr-2" /> Скачать MP4
                </a>
              </Button>
              <Button variant="secondary" className="w-full justify-start h-11" onClick={handleCopyLink}>
                <Copy className="w-4 h-4 mr-2" /> Скопировать ссылку
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-11"
                onClick={handleRerender}
                disabled={renderBusy || updateProject.isPending}
              >
                <RotateCcw className="w-4 h-4 mr-2" /> Пересобрать заново
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start h-11"
                onClick={handleDuplicate}
                disabled={duplicateProject.isPending}
              >
                {duplicateProject.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="w-4 h-4 mr-2" />
                )}
                Создать копию проекта
              </Button>

              <div className="pt-3 border-t space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setShareDialogOpen(true)}
                  data-testid="button-open-share-dialog"
                >
                  <Share2 className="w-4 h-4 mr-1.5" />
                  {shareToken ? "Управлять публичной ссылкой" : "Создать публичную ссылку"}
                </Button>
                <p className="text-xs font-medium text-muted-foreground pt-1">Прямая отправка:</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="text-[#0077FF] hover:text-[#0077FF] hover:bg-[#0077FF]/10 border-[#0077FF]/20"
                    onClick={shareVk}
                  >
                    <Share2 className="w-4 h-4 mr-1.5" /> ВК
                  </Button>
                  <Button
                    variant="outline"
                    className="text-[#229ED9] hover:text-[#229ED9] hover:bg-[#229ED9]/10 border-[#229ED9]/20"
                    onClick={shareTg}
                  >
                    <Share2 className="w-4 h-4 mr-1.5" /> Telegram
                  </Button>
                </div>
              </div>

              <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
                <DialogContent data-testid="share-dialog">
                  <DialogHeader>
                    <DialogTitle>Публичная ссылка</DialogTitle>
                    <DialogDescription>
                      Любой, у кого есть ссылка, сможет посмотреть это видео без регистрации.
                    </DialogDescription>
                  </DialogHeader>
                  {shareToken ? (
                    <div className="space-y-3 py-2">
                      <div className="flex gap-2">
                        <Input value={shareUrl} readOnly data-testid="input-share-url" onFocus={(e) => e.currentTarget.select()} />
                        <Button onClick={copyShareLink} variant="outline" data-testid="button-copy-share">
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-3 text-xs text-muted-foreground">
                        Ссылка активна. Чтобы закрыть доступ — отзовите её.
                      </div>
                    </div>
                  ) : (
                    <div className="py-4 text-sm text-muted-foreground">
                      Ссылка ещё не создана. Нажмите кнопку ниже, чтобы сгенерировать публичный URL.
                    </div>
                  )}
                  <DialogFooter className="gap-2 sm:gap-2 flex-col sm:flex-row">
                    {shareToken ? (
                      <Button
                        variant="destructive"
                        onClick={revokeShareLink}
                        disabled={shareBusy}
                        data-testid="button-revoke-share"
                      >
                        {shareBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                        Отозвать ссылку
                      </Button>
                    ) : (
                      <Button
                        onClick={createShareLink}
                        disabled={shareBusy}
                        data-testid="button-create-share"
                      >
                        {shareBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Share2 className="w-4 h-4 mr-2" />}
                        Создать публичную ссылку
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
                      Закрыть
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <SocialPostGenerator
              projectId={project.id}
              videoTitle={project.title}
              brandName={brandKit?.brandName}
              brandTagline={brandKit?.tagline}
            />

            <div className="p-4 bg-card border rounded-2xl">
              <h3 className="font-semibold border-b pb-2 mb-3">Сводка</h3>
              <dl className="text-sm space-y-1.5">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Сцен</dt>
                  <dd className="font-medium">{project.scenes.length}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Длительность</dt>
                  <dd className="font-medium">~{project.targetDurationSec} сек</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Голос</dt>
                  <dd className="font-medium truncate max-w-[55%] text-right">{voiceLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Музыка</dt>
                  <dd className="font-medium truncate max-w-[55%] text-right">{musicLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Стиль</dt>
                  <dd className="font-medium">{styleLabel}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Качество</dt>
                  <dd className="font-medium">
                    {QUALITIES.find((q) => q.id === quality)?.label ?? "—"}
                  </dd>
                </div>
                {brandKit?.brandName && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground flex items-center gap-1">
                      <Palette className="w-3 h-3" /> Бренд
                    </dt>
                    <dd className="font-medium truncate max-w-[55%] text-right" data-testid="summary-brand-name">
                      {brandKit.brandName}
                    </dd>
                  </div>
                )}
                {brandKit?.watermarkText && (
                  <div className="flex justify-between gap-2">
                    <dt className="text-muted-foreground">Водяной знак</dt>
                    <dd className="font-medium truncate max-w-[55%] text-right" data-testid="summary-watermark">
                      {brandKit.watermarkText}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            <div className="p-4 bg-primary/5 border border-primary/20 rounded-2xl text-center space-y-2">
              <h3 className="font-semibold text-primary text-sm">Готовы к новому шедевру?</h3>
              <p className="text-xs text-muted-foreground">
                У вас осталось {remaining} видео в этом месяце.
              </p>
              <Link href="/app/projects/new">
                <Button className="w-full">
                  <Plus className="w-4 h-4 mr-2" /> Создать новое видео
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== Fallback =====
  return (
    <div className="h-full flex flex-col items-center justify-center text-center gap-4">
      <Clapperboard className="w-12 h-12 text-muted-foreground" />
      <p className="text-muted-foreground">Подготавливаем сборку…</p>
      <Loader2 className="w-5 h-5 animate-spin text-primary" />
      <span className="hidden">{baseUrl}</span>
    </div>
  );
}

function CostCard({
  estimate,
  isLoading,
  onTopUp,
}: {
  estimate: CostEstimate | undefined;
  isLoading: boolean;
  onTopUp: () => void;
}) {
  if (isLoading || !estimate) {
    return (
      <div className="p-4 border rounded-xl bg-card flex items-center gap-3 text-sm text-muted-foreground">
        <Loader2 className="w-4 h-4 animate-spin" /> Считаем стоимость рендера…
      </div>
    );
  }
  const { cost, balance, sufficient, missing } = estimate;
  return (
    <div
      className={`border rounded-xl bg-card overflow-hidden ${sufficient ? "" : "border-amber-500/60 ring-1 ring-amber-500/30"}`}
    >
      <div className="p-4 border-b bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">Стоимость рендера</h3>
          <Badge variant="outline" className="ml-auto text-[10px]">
            прозрачная цена
          </Badge>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1">
          Списываем с баланса жетонов сразу после нажатия «Собрать».
        </p>
      </div>

      <div className="p-4 space-y-2 text-sm">
        {cost.lines.map((line, i) => (
          <div key={i} className="flex items-baseline justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium truncate">{line.label}</div>
              {line.detail && (
                <div className="text-[11px] text-muted-foreground truncate">
                  {line.detail}
                </div>
              )}
            </div>
            <div className="font-mono text-right shrink-0">{line.tokens}</div>
          </div>
        ))}
        <div className="border-t pt-2 flex items-baseline justify-between text-xs text-muted-foreground">
          <span>Подытог AI-ресурсов</span>
          <span className="font-mono">{cost.subtotal}</span>
        </div>
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span>
            Качество ({cost.qualityLabel}, ×{cost.qualityMultiplier})
          </span>
          <span className="font-mono">
            {cost.beforeMarkup - cost.watermarkBonus - cost.subtotal >= 0 ? "+" : ""}
            {cost.beforeMarkup - cost.watermarkBonus - cost.subtotal}
          </span>
        </div>
        {cost.watermarkBonus > 0 && (
          <div className="flex items-baseline justify-between text-xs text-muted-foreground">
            <span>Без водяного знака</span>
            <span className="font-mono">+{cost.watermarkBonus}</span>
          </div>
        )}
        <div className="flex items-baseline justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            Сервисная наценка ({cost.markupPercent}%)
          </span>
          <span className="font-mono">+{cost.markup}</span>
        </div>
      </div>

      <div className="px-4 py-3 bg-muted/40 border-t flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">Итого к списанию</div>
        <div className="font-mono text-2xl font-bold">{cost.total}</div>
      </div>

      <div
        className={`px-4 py-3 border-t flex items-center justify-between gap-3 ${sufficient ? "bg-green-500/5" : "bg-amber-500/10"}`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {sufficient ? (
            <Wallet className="w-4 h-4 text-green-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          )}
          <div className="text-xs min-w-0">
            <div className="font-medium">
              На балансе: <span className="font-mono">{balance}</span> жетонов
            </div>
            {!sufficient && (
              <div className="text-amber-700 dark:text-amber-400">
                Не хватает <span className="font-mono">{missing}</span> — пополните
                баланс.
              </div>
            )}
          </div>
        </div>
        {!sufficient && (
          <Button
            size="sm"
            variant="outline"
            onClick={onTopUp}
            className="border-amber-500/60 shrink-0"
          >
            Пополнить
          </Button>
        )}
      </div>
    </div>
  );
}
