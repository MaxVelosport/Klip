import { useState } from "react";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  HelpCircle,
  Sparkles,
  PenLine,
  Image as ImageIcon,
  Wand2,
  Mic,
  Video,
  Coins,
  Mail,
  ArrowRight,
} from "lucide-react";

const SECTIONS = [
  {
    icon: PenLine,
    title: "Шаг 1–2: Тема и сценарий",
    body: "Опишите идею ролика парой предложений (например, «Топ-5 фактов про космос для детей»). ИИ напишет сценарий, разделённый на сцены. В чате справа можно править его обычными словами: «сократи вступление», «сделай дружелюбнее», «добавь шутку». Когда нравится — нажмите «Согласовать сценарий».",
  },
  {
    icon: ImageIcon,
    title: "Шаг 3: Картинки",
    body: "Каждая сцена получает картинку. Кнопка «Ещё» — перегенерировать. Карандаш — отредактировать промт. Ссылка — подставить свою картинку. Плитки можно перетаскивать мышью, чтобы поменять порядок. «Обновить все» — заменить картинки во всех сценах разом.",
  },
  {
    icon: Wand2,
    title: "Шаг 4: Анимация",
    body: "Добавьте движение: 4 готовых стиля (Кинематограф, Слайдшоу, Динамика, Спокойствие) применяют анимацию ко всем сценам в один клик. «Случайно» — для разнообразия. Можно настроить каждую сцену отдельно — Ken Burns (наезд/отъезд), панорама, зум.",
  },
  {
    icon: Mic,
    title: "Шаг 5: Голос и музыка",
    body: "Выберите диктора (▶ — прослушать образец), отрегулируйте скорость. Добавьте фоновую музыку и субтитры. «Послушать всё подряд» — прослушать озвучку всех сцен. Когда готово — «Сгенерировать аудио».",
  },
  {
    icon: Video,
    title: "Шаг 6: Финальное видео",
    body: "Выберите качество (720p бесплатно, HD/4K — на тарифе PRO). Внизу — прозрачная смета: сколько жетонов уйдёт. Нажимаете «Списать N жетонов и собрать» — через минуту получите MP4 для скачивания.",
  },
  {
    icon: Coins,
    title: "Жетоны и оплата",
    body: "При регистрации даём 200 жетонов — этого хватит на 1–2 видео. Стоимость каждого рендера видна заранее. Если жетонов не хватает, кнопка превратится в «Пополнить баланс» и приведёт в раздел «Подписка и токены».",
  },
];

export function HelpFab() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Помощь и обучение"
        className="fixed bottom-5 right-5 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center group"
      >
        <HelpCircle className="w-5 h-5" />
        <span className="absolute right-full mr-2 px-2 py-1 text-xs font-medium bg-foreground text-background rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Помощь
        </span>
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          <div className="bg-gradient-to-br from-primary/15 via-chart-2/10 to-background p-6 border-b">
            <SheetHeader className="text-left">
              <SheetTitle className="text-2xl flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-primary" />
                Как пользоваться НейроКлипом
              </SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground mt-2">
              Краткий путеводитель по всем шагам. Если что-то непонятно — ищите значок{" "}
              <HelpCircle className="inline w-3.5 h-3.5 text-primary" /> рядом с полями.
            </p>
            <Link href="/app/projects/new" onClick={() => setOpen(false)}>
              <Button className="mt-4 w-full bg-gradient-to-r from-primary to-chart-2 text-white">
                <Sparkles className="w-4 h-4 mr-1.5" />
                Создать видео сейчас
              </Button>
            </Link>
          </div>

          <div className="p-5 space-y-4">
            {SECTIONS.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="rounded-xl border p-4 bg-card">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm mb-1">{s.title}</div>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}

            <div className="rounded-xl border-2 border-dashed p-4 text-center bg-muted/30">
              <Mail className="w-5 h-5 mx-auto text-muted-foreground mb-2" />
              <p className="text-xs text-muted-foreground">
                Не нашли ответ? Напишите нам на{" "}
                <a
                  href="mailto:hello@neuroclip.ru"
                  className="font-medium text-primary hover:underline"
                >
                  hello@neuroclip.ru
                </a>
              </p>
            </div>

            <Link href="/app/billing" onClick={() => setOpen(false)}>
              <Button variant="outline" className="w-full">
                <Coins className="w-4 h-4 mr-1.5" />
                Управление жетонами и подпиской
                <ArrowRight className="w-3.5 h-3.5 ml-auto" />
              </Button>
            </Link>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
