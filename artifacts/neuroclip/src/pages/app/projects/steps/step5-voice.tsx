import { useEffect, useMemo, useRef, useState } from "react";
import { StepInstructions } from "@/components/step-instructions";
import {
  Project,
  useUpdateProject,
  useListPresets,
  useGenerateAudio,
  getGetProjectQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Loader2,
  Play,
  Volume2,
  Mic,
  Pause,
  Wand2,
  Music,
  Lightbulb,
  Subtitles,
  CheckCircle2,
  Headphones,
  Sparkles,
  ListMusic,
} from "lucide-react";

/**
 * ⚠️ Демо-семплы для UX-превью голосов и музыки.
 * В готовом видео каждый голос звучит по-настоящему — это лишь иллюстрация
 * стиля/настроения, а не реальный синтез. См. баннер ниже в UI.
 */
const VOICE_SAMPLES: Record<string, string> = {
  baya: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  kseniya: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  aidar: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  eugene: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3",
  marina: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3",
  anton: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3",
};

const MUSIC_SAMPLES: Record<string, string> = {
  calm_corporate: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-7.mp3",
  uplifting_indie: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  epic_cinematic: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3",
  playful_kids: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  tech_pulse: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-11.mp3",
  ambient_focus: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-12.mp3",
};

const SUB_STYLES = [
  { id: "simple", label: "Простые", desc: "Тонкие белые буквы с тенью." },
  { id: "bold", label: "Жирные", desc: "Крупный жирный шрифт с фоном." },
  { id: "karaoke", label: "Караоке", desc: "Подсветка слова в момент произнесения." },
];

const SUB_POSITIONS = [
  { id: "bottom", label: "Снизу" },
  { id: "center", label: "По центру" },
  { id: "top", label: "Сверху" },
];

const TIPS = [
  "Послушайте каждый голос перед выбором — это бесплатно.",
  "Скорость 1.0–1.1 звучит естественно. Выше — ускоренные ролики.",
  "Громкость музыки 30–40% не перебивает голос.",
  "Караоке-субтитры удерживают зрителей в Reels и Shorts.",
  "Эпическая музыка отлично подходит для рассказов и кейсов.",
];

export default function Step5Voice({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const updateProject = useUpdateProject();
  const generateAudio = useGenerateAudio();
  const { data: presets } = useListPresets();
  const { user } = useAuth();
  const isFree = user?.planId === "free";

  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [subStyle, setSubStyle] = useState<string>(
    () => localStorage.getItem(`subStyle:${project.id}`) ?? "bold",
  );
  const [subPosition, setSubPosition] = useState<string>(
    () => localStorage.getItem(`subPos:${project.id}`) ?? "bottom",
  );
  useEffect(() => {
    localStorage.setItem(`subStyle:${project.id}`, subStyle);
    localStorage.setItem(`subPos:${project.id}`, subPosition);
  }, [subStyle, subPosition, project.id]);

  const [tip, setTip] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTip((t) => (t + 1) % TIPS.length), 7000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => () => {
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);

  const handleUpdate = async (data: Partial<Project>) => {
    try {
      await updateProject.mutateAsync({ id: project.id, data: data as never });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка обновления");
    }
  };

  const handleGenerate = async () => {
    try {
      await generateAudio.mutateAsync({ id: project.id });
      await updateProject.mutateAsync({ id: project.id, data: { currentStep: 6 } });
      queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(project.id) });
      toast.success("Озвучка готова");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Ошибка генерации озвучки");
    }
  };

  const togglePlay = (url: string, id: string) => {
    if (playingId === id) {
      audioRef.current?.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    audioRef.current?.pause();
    const a = new Audio(url);
    a.play().catch(() => {
      toast.error("Не удалось воспроизвести");
      setPlayingId(null);
    });
    a.onended = () => setPlayingId(null);
    audioRef.current = a;
    setPlayingId(id);
  };

  const playAll = async () => {
    const urls = project.scenes.map((s) => s.audioUrl).filter(Boolean) as string[];
    if (urls.length === 0) {
      toast("Сначала сгенерируйте озвучку.");
      return;
    }
    audioRef.current?.pause();
    setPlayingId("all");
    let i = 0;
    const playNext = () => {
      if (i >= urls.length) {
        setPlayingId(null);
        audioRef.current = null;
        return;
      }
      const a = new Audio(urls[i]!);
      audioRef.current = a;
      a.onended = () => {
        i += 1;
        playNext();
      };
      a.play().catch(() => {
        setPlayingId(null);
        audioRef.current = null;
      });
    };
    playNext();
  };

  const stopAll = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlayingId(null);
  };

  const voicedCount = project.scenes.filter((s) => s.audioUrl).length;
  const allVoiced = voicedCount === project.scenes.length && voicedCount > 0;

  const totalChars = useMemo(
    () => project.scenes.reduce((acc, s) => acc + (s.narration?.length ?? 0), 0),
    [project.scenes],
  );
  const estDuration = Math.round(totalChars / (15 * project.voiceSpeed));

  const voices = presets?.voices ?? [];
  const music = presets?.music ?? [];

  return (
    <div className="h-full flex flex-col space-y-4 pb-6">
      <StepInstructions
        stepKey="step5"
        title="Шаг 5 из 6 · Голос и музыка"
        intro="Выберите диктора, добавьте музыку и субтитры"
        estimate="2 мин"
        bullets={[
          "Нажмите ▶ возле любого диктора, чтобы услышать образец голоса.",
          "Слайдер «Скорость» — насколько быстро диктор говорит (1.0 = обычно).",
          "Включите фоновую музыку и выберите настроение — добавит атмосферы.",
          "Субтитры помогают смотреть без звука (соцсети, транспорт).",
          "«Сгенерировать аудио» — ИИ озвучит все сцены и перенесёт вас на финальный шаг.",
        ]}
        tip="Послушайте «Всё подряд» (кнопка вверху списка) перед генерацией — сэкономите жетоны."
      />
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Озвучка и музыка</h2>
          <p className="text-muted-foreground text-sm">
            Подберите голос диктора, фоновую музыку и стиль субтитров. Слушайте превью перед выбором.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">
            Сцен: {project.scenes.length}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            ~{estDuration} сек
          </Badge>
          {allVoiced ? (
            <Badge className="bg-green-500/15 text-green-700 dark:text-green-300 border-green-500/30 text-xs">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Озвучено всё
            </Badge>
          ) : voicedCount > 0 ? (
            <Badge variant="outline" className="text-xs">
              Озвучено {voicedCount} / {project.scenes.length}
            </Badge>
          ) : null}
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

      <div className="flex-1 overflow-y-auto pr-2 min-h-0 space-y-6">
        {/* Voices */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Mic className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Голос диктора</h3>
            <span className="text-xs text-muted-foreground">
              Нажмите ▶ чтобы прослушать, кликните карточку чтобы выбрать.
            </span>
          </div>
          <div className="flex items-start gap-2 text-xs text-muted-foreground p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Lightbulb className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
            <span>
              Превью — это короткая иллюстрация настроения голоса/музыки. В готовом видео ваш текст будет полностью озвучен выбранным голосом.
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {voices.map((v) => {
              const sample = VOICE_SAMPLES[v.id];
              const selected = project.voiceId === v.id;
              const playing = playingId === `voice:${v.id}`;
              const locked = v.proOnly && isFree;
              return (
                <button
                  key={v.id}
                  type="button"
                  disabled={locked}
                  onClick={() => handleUpdate({ voiceId: v.id })}
                  className={`relative text-left p-3 rounded-xl border bg-card transition-all hover:border-primary/60 disabled:opacity-50 disabled:cursor-not-allowed ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{v.label}</div>
                      <div className="text-[11px] text-muted-foreground capitalize">
                        {v.gender === "female" ? "Женский" : "Мужской"}
                      </div>
                    </div>
                    {v.proOnly && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 uppercase">
                        PRO
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sample) togglePlay(sample, `voice:${v.id}`);
                      }}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {playing ? "Играет…" : "Прослушать"}
                    </span>
                    {selected && (
                      <span className="ml-auto text-primary text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Выбран
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-muted-foreground w-32">Скорость речи</span>
            <Slider
              min={0.8}
              max={1.3}
              step={0.05}
              value={[project.voiceSpeed]}
              onValueChange={(vals) => handleUpdate({ voiceSpeed: vals[0] })}
              className="flex-1"
            />
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              x{project.voiceSpeed.toFixed(2)}
            </span>
          </div>
        </section>

        {/* Music */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Music className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Фоновая музыка</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handleUpdate({ backgroundMusicId: null })}
              className={`text-left p-3 rounded-xl border bg-card transition-all hover:border-primary/60 ${!project.backgroundMusicId ? "border-primary ring-2 ring-primary/30" : ""}`}
            >
              <div className="font-semibold text-sm">Без музыки</div>
              <div className="text-[11px] text-muted-foreground">Только голос</div>
            </button>
            {music.map((m) => {
              const sample = MUSIC_SAMPLES[m.id];
              const selected = project.backgroundMusicId === m.id;
              const playing = playingId === `music:${m.id}`;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleUpdate({ backgroundMusicId: m.id })}
                  className={`relative text-left p-3 rounded-xl border bg-card transition-all hover:border-primary/60 ${selected ? "border-primary ring-2 ring-primary/30" : ""}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{m.label}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {m.mood} · {m.bpm} BPM
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <span
                      role="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sample) togglePlay(sample, `music:${m.id}`);
                      }}
                      className="inline-flex items-center justify-center h-7 w-7 rounded-full bg-primary/10 text-primary hover:bg-primary/20"
                    >
                      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {playing ? "Играет…" : "Прослушать"}
                    </span>
                    {selected && (
                      <span className="ml-auto text-primary text-[11px] font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Выбран
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-3 pt-2">
            <span className="text-xs text-muted-foreground w-32 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5" /> Громкость музыки
            </span>
            <Slider
              min={0}
              max={100}
              step={5}
              value={[project.musicVolume]}
              onValueChange={(vals) => handleUpdate({ musicVolume: vals[0] })}
              disabled={!project.backgroundMusicId}
              className="flex-1"
            />
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {project.musicVolume}%
            </span>
          </div>
        </section>

        {/* Subtitles */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Subtitles className="w-4 h-4 text-primary" />
            <h3 className="font-semibold">Субтитры</h3>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-xl border bg-card">
            <Checkbox
              id="sub"
              checked={project.addSubtitles}
              onCheckedChange={(c) => handleUpdate({ addSubtitles: !!c })}
            />
            <label htmlFor="sub" className="text-sm font-medium cursor-pointer">
              Добавить субтитры в видео
            </label>
          </div>

          {project.addSubtitles && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Стиль
                </div>
                <div className="space-y-2">
                  {SUB_STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setSubStyle(s.id)}
                      className={`w-full text-left p-3 rounded-lg border bg-card transition-all hover:border-primary/60 ${subStyle === s.id ? "border-primary ring-2 ring-primary/30" : ""}`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-semibold text-sm">{s.label}</div>
                          <div className="text-[11px] text-muted-foreground">{s.desc}</div>
                        </div>
                        {subStyle === s.id && (
                          <CheckCircle2 className="w-4 h-4 text-primary" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Превью
                </div>
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden border">
                  {project.scenes[0]?.imageUrl && (
                    <img
                      src={project.scenes[0].imageUrl}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div
                    className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 max-w-[85%] text-center ${
                      subPosition === "top"
                        ? "top-3"
                        : subPosition === "center"
                          ? "top-1/2 -translate-y-1/2"
                          : "bottom-3"
                    } ${
                      subStyle === "simple"
                        ? "text-white text-sm font-medium drop-shadow-[0_2px_2px_rgba(0,0,0,0.85)]"
                        : subStyle === "bold"
                          ? "text-white bg-black/70 rounded-md text-base font-extrabold uppercase tracking-wide"
                          : "text-white bg-black/55 rounded-md text-base font-bold"
                    }`}
                  >
                    {subStyle === "karaoke" ? (
                      <>
                        <span className="opacity-70">Образец </span>
                        <span className="bg-primary/90 text-primary-foreground px-1 rounded">
                          субтитров
                        </span>
                      </>
                    ) : (
                      "Образец субтитров"
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  {SUB_POSITIONS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setSubPosition(p.id)}
                      className={`flex-1 text-xs py-1.5 rounded-md border transition ${
                        subPosition === p.id
                          ? "border-primary bg-primary/10 text-primary font-semibold"
                          : "bg-card hover:border-primary/40"
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Scene preview */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Headphones className="w-4 h-4 text-primary" />
              <h3 className="font-semibold">Проверка сцен</h3>
            </div>
            {project.scenes.some((s) => s.audioUrl) && (
              <Button
                size="sm"
                variant="outline"
                onClick={playingId === "all" ? stopAll : playAll}
              >
                {playingId === "all" ? (
                  <>
                    <Pause className="w-3.5 h-3.5 mr-1.5" />
                    Остановить
                  </>
                ) : (
                  <>
                    <ListMusic className="w-3.5 h-3.5 mr-1.5" />
                    Послушать всё подряд
                  </>
                )}
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {project.scenes.map((scene, index) => {
              const playing = playingId === `scene:${scene.id}`;
              return (
                <div
                  key={scene.id}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:border-primary/30 transition-colors"
                >
                  <span className="w-7 h-7 rounded-md bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="w-16 h-10 bg-muted rounded overflow-hidden shrink-0">
                    {scene.imageUrl && (
                      <img src={scene.imageUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{scene.title}</div>
                    <div className="text-[11px] text-muted-foreground line-clamp-1">
                      {scene.narration || "(без текста)"}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={!scene.audioUrl}
                    onClick={() => scene.audioUrl && togglePlay(scene.audioUrl, `scene:${scene.id}`)}
                    className="w-28 shrink-0"
                  >
                    {playing ? (
                      <>
                        <Pause className="w-3.5 h-3.5 mr-1.5" /> Пауза
                      </>
                    ) : scene.audioUrl ? (
                      <>
                        <Play className="w-3.5 h-3.5 mr-1.5" /> Слушать
                      </>
                    ) : (
                      <span className="text-[11px]">Нет аудио</span>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between pt-4 border-t shrink-0 gap-3">
        <Button
          variant="outline"
          onClick={() => updateProject.mutate({ id: project.id, data: { currentStep: 4 } })}
        >
          Назад
        </Button>
        <Button
          size="lg"
          onClick={handleGenerate}
          disabled={generateAudio.isPending || updateProject.isPending}
          className="bg-gradient-to-r from-primary to-primary/80"
        >
          {generateAudio.isPending || updateProject.isPending ? (
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          ) : (
            <Wand2 className="w-5 h-5 mr-2" />
          )}
          Сгенерировать озвучку и собрать видео
          <Sparkles className="w-4 h-4 ml-2 opacity-70" />
        </Button>
      </div>
    </div>
  );
}
