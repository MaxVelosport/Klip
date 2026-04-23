import { useState, useEffect } from "react";
import { ChevronDown, GraduationCap, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStorageKey } from "@/lib/user-storage";

interface StepInstructionsProps {
  /** Уникальный id шага — нужен, чтобы запомнить «свернуто» в localStorage. */
  stepKey: string;
  title: string;
  /** Короткое предложение под заголовком. */
  intro: string;
  /** 3–5 коротких шагов «что делать». */
  bullets: string[];
  /** Полезный совет (необязательно). */
  tip?: string;
  /** Сколько примерно времени займёт шаг. */
  estimate?: string;
}

/**
 * Плашка «Как это работает» в начале каждого шага мастера.
 * Раскрыта по умолчанию первый раз и сворачивается одним кликом —
 * выбор пользователя сохраняется в localStorage отдельно для каждого шага.
 */
export function StepInstructions({
  stepKey,
  title,
  intro,
  bullets,
  tip,
  estimate,
}: StepInstructionsProps) {
  const storageKey = useUserStorageKey(`howto:${stepKey}`);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    setOpen(stored !== "0");
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    localStorage.setItem(storageKey, next ? "1" : "0");
  };

  return (
    <div className="rounded-xl border bg-gradient-to-br from-primary/5 via-background to-background overflow-hidden">
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-primary/5 transition-colors"
      >
        <div className="w-9 h-9 rounded-full bg-primary/15 text-primary flex items-center justify-center shrink-0">
          <GraduationCap className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm flex items-center gap-2">
            {title}
            {estimate && (
              <span className="text-[10px] uppercase tracking-wide font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                ~{estimate}
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">{intro}</div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-1 space-y-3 border-t">
              <ol className="space-y-2 text-sm">
                {bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[11px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-foreground/90 leading-relaxed">{b}</span>
                  </li>
                ))}
              </ol>
              {tip && (
                <div className="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10 p-2.5 rounded-lg border border-amber-200/60 dark:border-amber-500/30">
                  <Lightbulb className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">Совет: </span>
                    {tip}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
