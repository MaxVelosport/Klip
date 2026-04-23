import { useEffect, useMemo, useState } from "react";
import { StepInstructions } from "@/components/step-instructions";
import {
  Project,
  useUpdateScene,
  useListPresets,
  useUpdateProject,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Loader2,
  MoveRight,
  Sparkles,
  Lightbulb,
  Shuffle,
  Film,
  Image as ImageIcon,
  Zap,
  Wind,
  Wand2,
} from "lucide-react";
import { motion } from "framer-motion";

type Scene = Project["scenes"][number];

type Combo = { animation: string; transition: string };

const STYLE_PRESETS: Array<{
  id: string;
  label: string;
  description: string;
  icon: typeof Film;
  combo: Combo;
  proOnly?: boolean;
}> = [
  {
    id: "cinematic",
    label: "Кинематограф",
    description: "Плавный зум внутрь, мягкое затухание — как в трейлере фильма.",
    icon: Film,
    combo: { animation: "ken_burns_zoom_in", transition: "fade" },
  },
  {
    id: "slideshow",
    label: "Слайдшоу",
    description: "Спокойные статичные кадры со сдвигом — для презентаций.",
    icon: ImageIcon,
    combo: { animation: "still", transition: "slide_left" },
  },
  {
    id: "dynamic",
    label: "Динамика",
    description: "Камера панорамирует, переходы быстрые — для рилсов и шортсов.",
    icon: Zap,
    combo: { animation: "pan_right", transition: "slide_right" },
  },
  {
    id: "calm",
    label: "Спокойствие",
    description: "Зум наружу с мягким затуханием — для медитативных видео.",
    icon: Wind,
    combo: { animation: "ken_burns_zoom_out", transition: "fade" },
  },
];

const TIPS = [
  "Выберите стиль одной кнопкой — мы расставим анимации и переходы автоматически.",
  "Зум внутрь притягивает внимание зрителя к кадру.",
  "Сдвиг и глитч — отличный выбор для быстрых, ритмичных видео.",
  "Параллакс и морфинг доступны в PRO — выглядят дорого.",
  "Не уверены? Нажмите «Случайно» и сравните результат.",
];

const ANIM_CSS: Record<string, string> = {
  ken_burns_zoom_in: "animate-[kbZoomIn_8s_ease-in-out_infinite_alternate]",
  ken_burns_zoom_out: "animate-[kbZoomOut_8s_ease-in-out_infinite_alternate]",
  pan_left: "animate-[panLeft_10s_linear_infinite_alternate]",
  pan_right: "animate-[panRight_10s_linear_infinite_alternate]",
  parallax: "animate-[kbZoomIn_6s_ease-in-out_infinite_alternate]",
  still: "",
};

export default function Step4Animation({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const updateScene = useUpdateScene();
  const updateProject = useUpdateProject();
  const { data: presets } = useListPresets();
  const { user } = useAuth();
  const isPro = user?.planId === "pro";

  const [tip, setTip] = useState(0);
  const [bulkBusy, setBulkBusy] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);

  const animations = presets?.animations ?? [];
  const transitions = presets?.transitions ?? [];

  const handleSceneUpdate = async (
    sceneId: string,
    field: "animationType" | "transitionType",
    value: string,
  ) => {
    try {
      await updateScene.mutateAsync({
        id: project.id,
        sceneId,
        data: { [field]: value },
      });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка обновления");
    }
  };

  const applyCombo = async (combo: Combo, label: string) => {
    setBulkBusy(true);
    try {
      await Promise.all(
        project.scenes.map((s) =>
          updateScene.mutateAsync({
            id: project.id,
            sceneId: s.id,
            data: { animationType: combo.animation, transitionType: combo.transition },
          }),
        ),
      );
      toast.success(`Применён стиль «${label}»`);
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBulkBusy(false);
    }
  };

  const shuffleAll = async () => {
    setBulkBusy(true);
    const a = animations.filter((x) => !x.proOnly || isPro).map((x) => x.value);
    const t = transitions.filter((x) => !x.proOnly || isPro).map((x) => x.value);
    try {
      await Promise.all(
        project.scenes.map((s) =>
          updateScene.mutateAsync({
            id: project.id,
            sceneId: s.id,
            data: {
              animationType: a[Math.floor(Math.random() * a.length)] ?? s.animationType,
              transitionType: t[Math.floor(Math.random() * t.length)] ?? s.transitionType,
            },
          }),
        ),
      );
      toast.success("Случайные анимации применены");
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBulkBusy(false);
    }
  };

  const handleNext = async () => {
    try {
      await updateProject.mutateAsync({ id: project.id, data: { currentStep: 5 } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка перехода");
    }
  };

  const totalDuration = useMemo(
    () => project.scenes.reduce((acc, s) => acc + (s.durationSec ?? 0), 0),
    [project.scenes],
  );

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <StepInstructions
        stepKey="step4"
        title="Шаг 4 из 6 · Анимация"
        intro="Оживите статичные картинки плавным движением"
        estimate="1 мин"
        bullets={[
          "Выберите готовый стиль (Кинематограф / Слайдшоу / Динамика / Спокойствие) — анимация применится ко всем сценам.",
          "«Случайно» — разные движения для каждой сцены, добавляет разнообразия.",
          "Можно настроить каждую сцену вручную: Ken Burns (наезд/отъезд), панорама влево/вправо, зум.",
          "Превью под каждой плиткой показывает, как будет двигаться картинка.",
        ]}
        tip="Не уверены? Жмите «Кинематограф» — это самый универсальный пресет, подходит почти всему."
      />
      <style>{`
        @keyframes kbZoomIn { from { transform: scale(1); } to { transform: scale(1.18); } }
        @keyframes kbZoomOut { from { transform: scale(1.18); } to { transform: scale(1); } }
        @keyframes panLeft { from { transform: scale(1.15) translateX(6%); } to { transform: scale(1.15) translateX(-6%); } }
        @keyframes panRight { from { transform: scale(1.15) translateX(-6%); } to { transform: scale(1.15) translateX(6%); } }
      `}</style>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Анимация и переходы</h2>
          <p className="text-muted-foreground text-sm">
            Оживите кадры: настройте движение камер и переходы — каждой сцене или всем сразу.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            Сцен: {project.scenes.length}
          </Badge>
          {totalDuration > 0 && (
            <Badge variant="secondary" className="text-xs">
              Длительность: ~{Math.round(totalDuration)} сек
            </Badge>
          )}
          <Button variant="outline" size="sm" onClick={shuffleAll} disabled={bulkBusy}>
            {bulkBusy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Shuffle className="w-4 h-4 mr-2" />
            )}
            Случайно
          </Button>
        </div>
      </div>

      {/* Style preset bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {STYLE_PRESETS.map((p) => {
          const Icon = p.icon;
          return (
            <button
              key={p.id}
              type="button"
              disabled={bulkBusy}
              onClick={() => applyCombo(p.combo, p.label)}
              className="text-left p-3 rounded-xl border bg-card hover:border-primary/60 hover:shadow-md transition-all disabled:opacity-60"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </span>
                <span className="font-semibold text-sm">{p.label}</span>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-2">{p.description}</p>
            </button>
          );
        })}
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

      <div className="flex-1 overflow-y-auto pr-2 space-y-6 min-h-0">
        {/* Timeline visualization */}
        <div className="bg-muted/30 p-4 rounded-xl border overflow-x-auto">
          <div className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
            <Film className="w-3.5 h-3.5" />
            <span>Лента сцен — наведите, чтобы увидеть анимацию</span>
          </div>
          <div className="flex items-center gap-3 min-w-min pb-2">
            {project.scenes.map((scene, index) => (
              <SceneTimelineCard
                key={`tl-${scene.id}`}
                scene={scene}
                index={index}
                isLast={index === project.scenes.length - 1}
                animLabel={
                  animations.find((a) => a.value === scene.animationType)?.label ??
                  scene.animationType
                }
                transLabel={
                  transitions.find((t) => t.value === scene.transitionType)?.label ??
                  scene.transitionType
                }
              />
            ))}
          </div>
        </div>

        {/* Per-scene controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {project.scenes.map((scene, index) => (
            <div key={scene.id} className="border rounded-xl p-4 bg-card space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs font-bold">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h4 className="font-semibold text-sm truncate flex-1">{scene.title}</h4>
              </div>

              {scene.imageUrl && (
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border group">
                  <img
                    src={scene.imageUrl}
                    alt=""
                    className={`w-full h-full object-cover ${ANIM_CSS[scene.animationType] ?? ""}`}
                  />
                  <span className="absolute bottom-1.5 right-1.5 text-[10px] font-semibold bg-background/85 backdrop-blur px-1.5 py-0.5 rounded border">
                    {animations.find((a) => a.value === scene.animationType)?.label ?? "—"}
                  </span>
                </div>
              )}

              <div className="space-y-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                    Анимация камеры
                  </label>
                  <Select
                    value={scene.animationType}
                    onValueChange={(val) => handleSceneUpdate(scene.id, "animationType", val)}
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {animations.map((a) => (
                        <SelectItem key={a.value} value={a.value} disabled={a.proOnly && !isPro}>
                          <span className="flex items-center gap-2">
                            {a.label}
                            {a.proOnly && (
                              <Badge variant="secondary" className="text-[9px] uppercase h-4 px-1">
                                PRO
                              </Badge>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {index < project.scenes.length - 1 && (
                  <div className="space-y-1">
                    <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                      Переход к следующей
                    </label>
                    <Select
                      value={scene.transitionType}
                      onValueChange={(val) => handleSceneUpdate(scene.id, "transitionType", val)}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {transitions.map((t) => (
                          <SelectItem
                            key={t.value}
                            value={t.value}
                            disabled={t.proOnly && !isPro}
                          >
                            <span className="flex items-center gap-2">
                              {t.label}
                              {t.proOnly && (
                                <Badge variant="secondary" className="text-[9px] uppercase h-4 px-1">
                                  PRO
                                </Badge>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t shrink-0 gap-3">
        <Button
          variant="outline"
          onClick={() => updateProject.mutate({ id: project.id, data: { currentStep: 3 } })}
        >
          Назад
        </Button>
        <Button
          onClick={handleNext}
          disabled={updateProject.isPending}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          {updateProject.isPending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Дальше — озвучка
        </Button>
      </div>
    </div>
  );
}

function SceneTimelineCard({
  scene,
  index,
  isLast,
  animLabel,
  transLabel,
}: {
  scene: Scene;
  index: number;
  isLast: boolean;
  animLabel: string;
  transLabel: string;
}) {
  const [hover, setHover] = useState(false);
  return (
    <>
      <motion.div
        initial={{ opacity: 0, x: 14 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.5) }}
        className="flex flex-col gap-1.5 w-44 shrink-0"
      >
        <div
          className="relative aspect-video bg-muted rounded-lg overflow-hidden border"
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {scene.imageUrl ? (
            <img
              src={scene.imageUrl}
              alt=""
              className={`w-full h-full object-cover ${hover ? ANIM_CSS[scene.animationType] ?? "" : ""}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
              Нет фото
            </div>
          )}
          <span className="absolute top-1.5 left-1.5 bg-background/85 backdrop-blur text-[10px] font-bold px-1.5 py-0.5 rounded border">
            {String(index + 1).padStart(2, "0")}
          </span>
          <span className="absolute bottom-1.5 left-1.5 right-1.5 truncate bg-background/85 backdrop-blur text-[10px] px-1.5 py-0.5 rounded border text-center">
            {animLabel}
          </span>
        </div>
        <div className="text-xs font-medium truncate text-center px-1">{scene.title}</div>
      </motion.div>

      {!isLast && (
        <div className="flex flex-col items-center justify-center gap-1 shrink-0 w-20">
          <div className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded border whitespace-nowrap">
            {transLabel}
          </div>
          <MoveRight className="w-4 h-4 text-muted-foreground" />
        </div>
      )}
    </>
  );
}

// Wand2 import alias kept to silence unused warning if future use; remove if not needed.
void Wand2;
