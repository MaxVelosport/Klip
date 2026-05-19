import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import { useCreateProject } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Loader2, Check, Zap, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── types ───────────────────────────────────────────────────────────────────

type ImageProvider = "pixabay" | "flux-pro";
type VideoProvider = "ken-burns" | "seedance";
type TtsProvider   = "yandex-speechkit" | "elevenlabs";
type AspectRatio   = "16:9" | "9:16" | "1:1";
type Category      = "educational" | "marketing" | "historical" | "news" | "content" | "story" | "business";

interface BuilderState {
  step: 1 | 2 | 3 | 4 | 5;
  title: string;
  topic: string;
  category: Category;
  durationMin: 3 | 5 | 10 | 15;
  aspectRatio: AspectRatio;
  imageProvider: ImageProvider;
  videoProvider: VideoProvider;
  ttsProvider: TtsProvider;
}

// ─── pricing ─────────────────────────────────────────────────────────────────

function calculateCost(state: BuilderState): {
  script: number;
  images: number;
  video: number;
  tts: number;
  server: number;
  subtotal: number;
  total: number;
} {
  const d = state.durationMin;

  const script = 15;
  const images = state.imageProvider === "flux-pro"
    ? Math.ceil((d * 60) / 3) * 4.7
    : 0;
  const video = state.videoProvider === "seedance"
    ? d * 60 * 2.07
    : 0;
  const tts = state.ttsProvider === "elevenlabs"
    ? d * 900 * 0.0205
    : d * 900 * 0.0004;
  const server = 5;
  const subtotal = script + images + video + tts + server;
  const total = Math.round(subtotal * 1.5);

  return { script, images, video, tts, server, subtotal, total };
}

// ─── option card ─────────────────────────────────────────────────────────────

function OptionCard({
  selected,
  onClick,
  tier,
  title,
  description,
  price,
  features,
}: {
  selected: boolean;
  onClick: () => void;
  tier: "standard" | "premium";
  title: string;
  description: string;
  price: string;
  features: string[];
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left p-5 rounded-xl border-2 transition-all",
        selected
          ? "border-violet-500 bg-violet-500/5 shadow-md"
          : "border-border hover:border-violet-300 bg-card",
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {tier === "premium" ? (
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
          ) : (
            <Zap className="w-4 h-4 text-sky-500 shrink-0" />
          )}
          <span className="font-semibold text-sm">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={tier === "premium" ? "default" : "secondary"} className="text-xs">
            {tier === "premium" ? "Premium" : "Standard"}
          </Badge>
          {selected && <Check className="w-4 h-4 text-violet-500 shrink-0" />}
        </div>
      </div>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <div className="flex flex-wrap gap-1">
          {features.map(f => (
            <Badge key={f} variant="outline" className="text-xs font-normal">
              {f}
            </Badge>
          ))}
        </div>
        <span className={cn(
          "text-sm font-semibold shrink-0 ml-2",
          tier === "premium" ? "text-amber-600" : "text-sky-600",
        )}>
          {price}
        </span>
      </div>
    </button>
  );
}

// ─── step header ─────────────────────────────────────────────────────────────

function StepHeader({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  const steps = ["Параметры", "Картинки", "Монтаж", "Озвучка", "Итог"];
  return (
    <div className="mb-6">
      <div className="flex gap-1 mb-4">
        {steps.map((s, i) => (
          <div
            key={i}
            className={cn(
              "flex-1 h-1 rounded-full transition-colors",
              i < step ? "bg-violet-500" : i === step - 1 ? "bg-violet-400" : "bg-border",
            )}
            title={s}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground mb-1">Шаг {step} из 5 — {steps[step - 1]}</p>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function CreateBuilder() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { mutateAsync: createProject, isPending } = useCreateProject();

  const [state, setState] = useState<BuilderState>({
    step: 1,
    title: "",
    topic: "",
    category: "marketing",
    durationMin: 5,
    aspectRatio: "16:9",
    imageProvider: "pixabay",
    videoProvider: "ken-burns",
    ttsProvider: "yandex-speechkit",
  });

  const set = <K extends keyof BuilderState>(key: K, val: BuilderState[K]) =>
    setState(prev => ({ ...prev, [key]: val }));

  const cost = calculateCost(state);

  const canNext = (): boolean => {
    if (state.step === 1) return state.title.length >= 3 && state.topic.length >= 20;
    return true;
  };

  const next = () => {
    if (!canNext()) return;
    setState(prev => ({ ...prev, step: (prev.step < 5 ? prev.step + 1 : 5) as BuilderState["step"] }));
  };
  const back = () => {
    setState(prev => ({ ...prev, step: (prev.step > 1 ? prev.step - 1 : 1) as BuilderState["step"] }));
  };

  const handleCreate = async () => {
    if (!user) { toast.error("Войдите в аккаунт"); return; }
    try {
      const project = await createProject({
        title: state.title,
        topicDescription: state.topic,
        category: state.category as "educational",
        targetDurationSec: state.durationMin * 60,
        aspectRatio: state.aspectRatio as "16:9",
        visualStyle: "realism",
        voiceId: state.ttsProvider === "elevenlabs" ? "irina" : "jane",
        addSubtitles: true,
        // Extra fields accepted by the server but not in generated types
        ...({ imageProvider: state.imageProvider } as Record<string, unknown>),
        ...({ ttsProvider: state.ttsProvider } as Record<string, unknown>),
        ...({ videoProvider: state.videoProvider } as Record<string, unknown>),
      } as Parameters<typeof createProject>[0]);
      toast.success("Проект создан!");
      setLocation(`/app/projects/${project.id}`);
    } catch (err) {
      toast.error("Не удалось создать проект");
    }
  };

  return (
    <div className="max-w-xl mx-auto py-8 px-4">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setLocation("/app/projects")}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Конструктор видео</h1>
          <p className="text-sm text-muted-foreground">Выберите качество каждого компонента</p>
        </div>
      </div>

      {/* ── Step 1: Topic ── */}
      {state.step === 1 && (
        <div>
          <StepHeader
            step={1}
            title="Тема и параметры"
            subtitle="Расскажите о будущем видео"
          />
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Название видео</label>
              <Input
                placeholder="5 причин использовать НейроКлип"
                value={state.title}
                onChange={e => set("title", e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Тема / описание</label>
              <Textarea
                placeholder="О чём это видео? Кому адресовано? Какой результат должен быть у зрителя?"
                rows={4}
                value={state.topic}
                onChange={e => set("topic", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1 block">Категория</label>
                <Select value={state.category} onValueChange={v => set("category", v as Category)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="educational">Образовательное</SelectItem>
                    <SelectItem value="marketing">Маркетинг</SelectItem>
                    <SelectItem value="historical">Историческое</SelectItem>
                    <SelectItem value="news">Новости</SelectItem>
                    <SelectItem value="content">Контент / Reels</SelectItem>
                    <SelectItem value="story">Сторителлинг</SelectItem>
                    <SelectItem value="business">Бизнес</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Длительность</label>
                <Select
                  value={String(state.durationMin)}
                  onValueChange={v => set("durationMin", Number(v) as BuilderState["durationMin"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 минуты</SelectItem>
                    <SelectItem value="5">5 минут</SelectItem>
                    <SelectItem value="10">10 минут</SelectItem>
                    <SelectItem value="15">15 минут</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Соотношение сторон</label>
              <div className="flex gap-2">
                {(["16:9", "9:16", "1:1"] as const).map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => set("aspectRatio", r)}
                    className={cn(
                      "flex-1 py-2 text-sm rounded-lg border-2 transition-all font-medium",
                      state.aspectRatio === r
                        ? "border-violet-500 bg-violet-500/5 text-violet-700 dark:text-violet-300"
                        : "border-border hover:border-violet-300",
                    )}
                  >
                    {r === "16:9" ? "16:9 Горизонт." : r === "9:16" ? "9:16 Вертикаль" : "1:1 Квадрат"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Images ── */}
      {state.step === 2 && (
        <div>
          <StepHeader
            step={2}
            title="Уровень картинок"
            subtitle="Стоковые фото или AI-генерация под ваш сценарий"
          />
          <div className="space-y-3">
            <OptionCard
              selected={state.imageProvider === "pixabay"}
              onClick={() => set("imageProvider", "pixabay")}
              tier="standard"
              title="Pixabay — стоковые фото"
              description="Качественные фотографии от профессиональных фотографов со всего мира."
              price="0 ₽"
              features={["Бесплатно", "Быстро", "~5 сек/кадр"]}
            />
            <OptionCard
              selected={state.imageProvider === "flux-pro"}
              onClick={() => set("imageProvider", "flux-pro")}
              tier="premium"
              title="Flux Pro 1.1 — AI-генерация"
              description="Уникальные изображения, созданные специально под ваш сценарий. Мировой топ-1 image AI."
              price={`~${Math.round(Math.ceil((state.durationMin * 60) / 3) * 4.7)} ₽`}
              features={["Уникальный контент", "Под сценарий", "~30 сек/кадр"]}
            />
          </div>
        </div>
      )}

      {/* ── Step 3: Video/Animation ── */}
      {state.step === 3 && (
        <div>
          <StepHeader
            step={3}
            title="Уровень монтажа"
            subtitle="Классический Ken Burns или AI-оживление каждого кадра"
          />
          <div className="space-y-3">
            <OptionCard
              selected={state.videoProvider === "ken-burns"}
              onClick={() => set("videoProvider", "ken-burns")}
              tier="standard"
              title="Ken Burns — зум и параллакс"
              description="Профессиональный зум-эффект с плавным движением камеры, переходами и субтитрами."
              price="0 ₽"
              features={["Бесплатно", "Быстро", "~9 сек/сцена"]}
            />
            <OptionCard
              selected={state.videoProvider === "seedance"}
              onClick={() => set("videoProvider", "seedance")}
              tier="premium"
              title="Seedance 2.0 Fast — AI-видео"
              description="Каждый кадр оживает: настоящее движение объектов и камеры. Как в голливудском кино."
              price={`~${Math.round(state.durationMin * 60 * 2.07)} ₽`}
              features={["Настоящее движение", "AI image-to-video", "~60 сек/сцена"]}
            />
          </div>
        </div>
      )}

      {/* ── Step 4: TTS ── */}
      {state.step === 4 && (
        <div>
          <StepHeader
            step={4}
            title="Уровень озвучки"
            subtitle="Российский синтез или мировой топ-1 TTS"
          />
          <div className="space-y-3">
            <OptionCard
              selected={state.ttsProvider === "yandex-speechkit"}
              onClick={() => set("ttsProvider", "yandex-speechkit")}
              tier="standard"
              title="Yandex SpeechKit"
              description="Качественный русский TTS от Яндекса. Голос Alena — чистый и естественный."
              price={`~${Math.round(state.durationMin * 900 * 0.0004)} ₽`}
              features={["Русский язык", "Голос Alena", "~3 сек/сцена"]}
            />
            <OptionCard
              selected={state.ttsProvider === "elevenlabs"}
              onClick={() => set("ttsProvider", "elevenlabs")}
              tier="premium"
              title="ElevenLabs — мировой топ-1"
              description="Наиболее естественный и эмоциональный голос на рынке. Поддержка русского языка."
              price={`~${Math.round(state.durationMin * 900 * 0.0205)} ₽`}
              features={["Топ-1 в мире", "Эмоциональный", "Многоязычный"]}
            />
          </div>
        </div>
      )}

      {/* ── Step 5: Summary ── */}
      {state.step === 5 && (
        <div>
          <StepHeader
            step={5}
            title="Подтверждение"
            subtitle="Проверьте выбор и создайте видео"
          />
          <div className="bg-card border rounded-xl p-5 mb-5 space-y-3">
            <Row label="Название" value={state.title} />
            <Row label="Длительность" value={`${state.durationMin} мин`} />
            <Row label="Формат" value={state.aspectRatio} />
            <div className="border-t my-1" />
            <Row
              label="Сценарий (Claude Sonnet 4.6)"
              value={`${cost.script} ₽`}
              sub
            />
            <Row
              label={`Картинки (${state.imageProvider === "flux-pro" ? "Flux Pro" : "Pixabay"})`}
              value={state.imageProvider === "flux-pro" ? `${Math.round(cost.images)} ₽` : "Бесплатно"}
              sub
              premium={state.imageProvider === "flux-pro"}
            />
            <Row
              label={`Монтаж (${state.videoProvider === "seedance" ? "Seedance 2.0" : "Ken Burns"})`}
              value={state.videoProvider === "seedance" ? `${Math.round(cost.video)} ₽` : "Бесплатно"}
              sub
              premium={state.videoProvider === "seedance"}
            />
            <Row
              label={`Озвучка (${state.ttsProvider === "elevenlabs" ? "ElevenLabs" : "Yandex SpeechKit"})`}
              value={`${Math.round(cost.tts)} ₽`}
              sub
              premium={state.ttsProvider === "elevenlabs"}
            />
            <Row label="Сервер и хранилище" value={`${cost.server} ₽`} sub />
            <div className="border-t pt-2 mt-2 flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                Себестоимость × 1.5 (наценка платформы)
              </span>
            </div>
            <div className="flex items-center justify-between font-bold text-lg">
              <span>Итого</span>
              <span className="text-violet-600">{cost.total} ₽</span>
            </div>
          </div>

          <Button
            className="w-full h-12 text-base"
            onClick={handleCreate}
            disabled={isPending}
          >
            {isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Создаём проект…</>
            ) : (
              `Создать видео за ${cost.total} ₽`
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground mt-2">
            Жетоны спишутся при запуске рендера, не сейчас
          </p>
        </div>
      )}

      {/* ── Navigation ── */}
      {state.step < 5 && (
        <div className="flex gap-3 mt-6">
          {state.step > 1 && (
            <Button variant="outline" onClick={back} className="flex-1">
              <ChevronLeft className="w-4 h-4 mr-1" /> Назад
            </Button>
          )}
          <Button
            onClick={next}
            disabled={!canNext()}
            className="flex-1"
          >
            {state.step === 4 ? "Смотреть итог" : "Далее"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
      {state.step === 5 && (
        <Button variant="ghost" onClick={back} className="w-full mt-2">
          <ChevronLeft className="w-4 h-4 mr-1" /> Назад
        </Button>
      )}
    </div>
  );
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function Row({
  label,
  value,
  sub,
  premium,
}: {
  label: string;
  value: string;
  sub?: boolean;
  premium?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className={cn(sub ? "text-muted-foreground pl-2" : "font-medium")}>{label}</span>
      <span className={cn("font-medium", premium ? "text-amber-600" : "")}>{value}</span>
    </div>
  );
}
