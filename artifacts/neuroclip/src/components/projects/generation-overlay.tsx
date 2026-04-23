import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  BrainCircuit,
  PenLine,
  Wand2,
  Check,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

interface Step {
  Icon: LucideIcon;
  label: string;
  duration: number;
}

const STEPS: Step[] = [
  { Icon: BrainCircuit, label: "Анализируем тему и аудиторию", duration: 1800 },
  { Icon: Sparkles, label: "Подбираем структуру под выбранную категорию", duration: 1800 },
  { Icon: PenLine, label: "Пишем сценарий по сценам", duration: 2400 },
  { Icon: Wand2, label: "Полируем формулировки и переходы", duration: 1800 },
];

const TIPS = [
  "Чем подробнее тема, тем точнее сценарий — попробуйте описать аудиторию и цель ролика.",
  "Категория задаёт тон сценария: «Новости» звучит сухо и фактично, «Сторителлинг» — эмоционально и образно.",
  "Хороший хук в первые 3 секунды удерживает 80% зрителей. Это особенно важно для коротких форматов.",
  "После генерации каждую сцену можно переписать вручную — без новых токенов.",
  "Голос Ksenya хорошо звучит для контента, Filipp — для документального жанра.",
  "Музыку можно сменить на любом шаге — финальный рендер пересчитается автоматически.",
  "Длинные ролики (более 5 минут) делите на главы — так зрителю проще ориентироваться.",
  "Загруженный документ или фото с текстом мы превращаем в исходник для сценария.",
  "Цвет визуального стиля влияет и на подбор кадров, и на цветокор финального видео.",
  "Для образовательных видео включайте субтитры — это +30% к удержанию аудитории.",
];

export function GenerationOverlay({ visible }: { visible: boolean }) {
  const [activeStep, setActiveStep] = useState(0);
  const [tipIdx, setTipIdx] = useState(0);

  useEffect(() => {
    if (!visible) {
      setActiveStep(0);
      setTipIdx(Math.floor(Math.random() * TIPS.length));
      return;
    }
    setTipIdx(Math.floor(Math.random() * TIPS.length));
    let cancelled = false;
    let i = 0;
    function next() {
      if (cancelled) return;
      setActiveStep(i);
      if (i < STEPS.length - 1) {
        const d = STEPS[i]!.duration;
        i += 1;
        setTimeout(next, d);
      }
    }
    next();
    const tipTimer = setInterval(() => {
      setTipIdx((p) => (p + 1) % TIPS.length);
    }, 4000);
    return () => {
      cancelled = true;
      clearInterval(tipTimer);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/85 backdrop-blur-md"
          aria-live="polite"
        >
          {/* Animated gradient orbs */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <motion.div
              className="absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-gradient-to-br from-primary/30 to-fuchsia-500/30 blur-3xl"
              animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.15, 1] }}
              transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute -bottom-40 -right-40 w-[32rem] h-[32rem] rounded-full bg-gradient-to-br from-blue-500/25 to-cyan-400/25 blur-3xl"
              animate={{ x: [0, -50, 0], y: [0, -30, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-gradient-to-br from-amber-400/20 to-rose-400/20 blur-3xl"
              animate={{ scale: [1, 1.3, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <motion.div
            initial={{ scale: 0.92, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.92, y: 20 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            className="relative w-full max-w-xl rounded-3xl border bg-card/90 backdrop-blur-xl shadow-2xl shadow-primary/10 p-8 overflow-hidden"
          >
            {/* shimmer line */}
            <motion.div
              className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
            />

            <div className="flex flex-col items-center text-center space-y-2">
              <motion.div
                className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-fuchsia-500 flex items-center justify-center shadow-lg shadow-primary/30 mb-2"
                animate={{ rotate: [0, 6, -6, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              >
                <Wand2 className="w-9 h-9 text-white" />
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    className="absolute inset-0 rounded-2xl border-2 border-primary/40"
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{
                      duration: 2.4,
                      repeat: Infinity,
                      delay: i * 0.8,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </motion.div>
              <h3 className="text-2xl font-bold">ИИ создаёт ваш сценарий</h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                Это занимает несколько секунд. А пока — пара полезностей.
              </p>
            </div>

            {/* Steps */}
            <div className="mt-6 space-y-2.5">
              {STEPS.map((s, i) => {
                const StepIcon = s.Icon;
                const done = i < activeStep;
                const active = i === activeStep;
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                      active
                        ? "bg-primary/10"
                        : done
                          ? "bg-emerald-500/5"
                          : "bg-muted/30"
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        done
                          ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                          : active
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {done ? (
                        <Check className="w-4 h-4" />
                      ) : active ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                          <StepIcon className="w-4 h-4" />
                        </motion.div>
                      ) : (
                        <StepIcon className="w-4 h-4" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        active
                          ? "text-foreground font-medium"
                          : done
                            ? "text-muted-foreground line-through"
                            : "text-muted-foreground"
                      }`}
                    >
                      {s.label}
                    </span>
                  </motion.div>
                );
              })}
            </div>

            {/* Tip */}
            <div className="mt-6 rounded-xl border bg-gradient-to-br from-amber-500/5 to-rose-500/5 p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Lightbulb className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
                    Совет
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={tipIdx}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      transition={{ duration: 0.35 }}
                      className="text-sm leading-relaxed"
                    >
                      {TIPS[tipIdx]}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
