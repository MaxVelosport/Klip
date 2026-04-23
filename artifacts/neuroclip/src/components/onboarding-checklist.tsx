import { Link } from "wouter";
import { CheckCircle2, Circle, ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserStorageKey } from "@/lib/user-storage";

interface OnboardingChecklistProps {
  hasProject: boolean;
  hasDoneVideo: boolean;
  hasFilledProfile: boolean;
  hasSeenBilling: boolean;
}

/**
 * Чек-лист «Первые шаги» на дашборде.
 * Полностью скрывается, когда все пункты выполнены или пользователь нажал ✕.
 */
export function OnboardingChecklist({
  hasProject,
  hasDoneVideo,
  hasFilledProfile,
  hasSeenBilling,
}: OnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(false);
  const storageKey = useUserStorageKey("onboarding:dismissed");

  useEffect(() => {
    setDismissed(localStorage.getItem(storageKey) === "1");
  }, [storageKey]);

  const items = [
    {
      done: hasProject,
      title: "Создать первый проект",
      description: "Опишите тему — ИИ напишет сценарий и подберёт картинки.",
      cta: { label: "Начать", href: "/app/projects/new" },
    },
    {
      done: hasDoneVideo,
      title: "Собрать готовое видео",
      description: "Пройдите 6 шагов мастера — от темы до финального MP4.",
      cta: { label: "К проектам", href: "/app/projects" },
    },
    {
      done: hasSeenBilling,
      title: "Посмотреть баланс жетонов",
      description: "У вас 200 бесплатных жетонов — этого хватит на 1–2 ролика.",
      cta: { label: "Открыть биллинг", href: "/app/billing" },
    },
    {
      done: hasFilledProfile,
      title: "Заполнить профиль",
      description: "Загрузите аватар и укажите имя — будут видны в шапке.",
      cta: { label: "В профиль", href: "/app/profile" },
    },
  ];

  const completed = items.filter((i) => i.done).length;
  const total = items.length;

  if (dismissed || completed === total) return null;

  const dismiss = () => {
    localStorage.setItem(storageKey, "1");
    setDismissed(true);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, height: 0 }}
        className="rounded-2xl border bg-card overflow-hidden shadow-sm"
      >
        <div className="p-5 border-b bg-gradient-to-r from-primary/10 via-chart-2/10 to-background flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold flex items-center gap-2">
                Первые шаги
                <span className="text-xs font-mono bg-background/80 border px-1.5 py-0.5 rounded">
                  {completed}/{total}
                </span>
              </h3>
              <p className="text-xs text-muted-foreground">
                Краткий гид: соберите своё первое видео, не запутавшись.
              </p>
            </div>
          </div>
          <button
            onClick={dismiss}
            aria-label="Скрыть чек-лист"
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="divide-y">
          {items.map((item, i) => (
            <div
              key={i}
              className={`flex items-center gap-3 p-4 transition-colors ${item.done ? "bg-green-500/5" : "hover:bg-muted/40"}`}
            >
              {item.done ? (
                <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div
                  className={`text-sm font-medium ${item.done ? "line-through text-muted-foreground" : ""}`}
                >
                  {item.title}
                </div>
                <div className="text-xs text-muted-foreground">{item.description}</div>
              </div>
              {!item.done && (
                <Link href={item.cta.href}>
                  <Button size="sm" variant="ghost" className="shrink-0">
                    {item.cta.label}
                    <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </Link>
              )}
            </div>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
