import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useUserStorageKey } from "@/lib/user-storage";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  PenLine,
  Image as ImageIcon,
  Mic,
  Video,
  ArrowRight,
  ArrowLeft,
  Coins,
  PartyPopper,
} from "lucide-react";

const SLIDES = [
  {
    icon: PartyPopper,
    title: "Привет! Это НейроКлип 👋",
    body: "За 5–7 минут мы вместе сделаем настоящее видео: со сценарием, картинками, голосом и музыкой. Всё генерирует ИИ — от вас нужна только идея.",
    accent: "from-primary/30 to-chart-2/30",
  },
  {
    icon: PenLine,
    title: "Шаг 1–2: тема и сценарий",
    body: "Вы пишете тему — например, «Как устроены чёрные дыры». ИИ предлагает сценарий, разбитый на сцены. Вы можете править его в чате обычными словами: «сделай короче», «добавь шутку», «измени вступление».",
    accent: "from-blue-500/30 to-purple-500/30",
  },
  {
    icon: ImageIcon,
    title: "Шаг 3–4: картинки и движение",
    body: "К каждой сцене мы подбираем изображение в выбранном стиле. Можно перегенерировать любую картинку, поменять местами или добавить плавную анимацию (Ken Burns, наезд, панорама).",
    accent: "from-orange-500/30 to-pink-500/30",
  },
  {
    icon: Mic,
    title: "Шаг 5: голос и музыка",
    body: "Выберите диктора, прослушайте образец, добавьте фоновую музыку и субтитры. Можно «послушать всё подряд», прежде чем запускать сборку.",
    accent: "from-emerald-500/30 to-teal-500/30",
  },
  {
    icon: Video,
    title: "Шаг 6: финальное видео",
    body: "Вы видите прозрачную смету (сколько жетонов уйдёт), нажимаете «Собрать» — и через минуту получаете готовый MP4. Скачайте, поделитесь или пересоберите заново.",
    accent: "from-violet-500/30 to-fuchsia-500/30",
  },
  {
    icon: Coins,
    title: "Бонус: 200 жетонов в подарок",
    body: "Каждый рендер списывает жетоны по чёткой смете (никаких сюрпризов). Стартового баланса хватит на 1–2 видео — пополнить можно в разделе «Подписка и токены».",
    accent: "from-amber-400/30 to-orange-500/30",
  },
];

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);
  const [, navigate] = useLocation();
  const storageKey = useUserStorageKey("welcome:v1");

  useEffect(() => {
    if (!localStorage.getItem(storageKey)) {
      const t = setTimeout(() => setOpen(true), 350);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  const close = (createNow = false) => {
    localStorage.setItem(storageKey, "done");
    setOpen(false);
    if (createNow) navigate("/app/projects/new");
  };

  const slide = SLIDES[idx]!;
  const Icon = slide.icon;
  const isLast = idx === SLIDES.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && close()}>
      <DialogContent className="max-w-lg p-0 overflow-hidden">
        <div className={`relative bg-gradient-to-br ${slide.accent} p-8 pb-6`}>
          <div className="absolute top-3 right-3 text-[10px] uppercase tracking-wider font-semibold text-foreground/60 bg-background/60 backdrop-blur px-2 py-1 rounded">
            {idx + 1} / {SLIDES.length}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
            >
              <div className="w-16 h-16 rounded-2xl bg-background/80 backdrop-blur shadow-lg flex items-center justify-center mb-4">
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-2 leading-tight">{slide.title}</h2>
              <p className="text-foreground/80 leading-relaxed">{slide.body}</p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="p-5 border-t bg-background flex items-center justify-between gap-3">
          <div className="flex gap-1.5">
            {SLIDES.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Слайд ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {idx > 0 && (
              <Button variant="outline" size="sm" onClick={() => setIdx(idx - 1)}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
            )}
            {!isLast ? (
              <>
                <Button variant="ghost" size="sm" onClick={() => close()}>
                  Пропустить
                </Button>
                <Button size="sm" onClick={() => setIdx(idx + 1)}>
                  Дальше <ArrowRight className="w-4 h-4 ml-1" />
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={() => close(true)}
                className="bg-gradient-to-r from-primary to-chart-2 text-white"
              >
                <Sparkles className="w-4 h-4 mr-1.5" />
                Создать первое видео
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
