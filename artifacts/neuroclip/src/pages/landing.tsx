import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Film,
  PlayCircle,
  Zap,
  Clock,
  ShieldCheck,
  Star,
  Sparkles,
  Mic,
  Image as ImageIcon,
  Music,
  Wand2,
  Share2,
  Palette,
  Check,
  ChevronRight,
  Flame,
} from "lucide-react";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FEATURES = [
  {
    icon: Wand2,
    title: "ИИ-сценарист на русском",
    text: "GPT-4 пишет сценарий, разбивает на сцены и подбирает хуки под вашу аудиторию.",
  },
  {
    icon: ImageIcon,
    title: "Подбор визуала",
    text: "Stock + AI-генерация картинок и B-roll под каждую сцену в один клик.",
  },
  {
    icon: Mic,
    title: "Реалистичная озвучка",
    text: "Естественные голоса на русском. Регулировка темпа, тона и эмоций.",
  },
  {
    icon: Music,
    title: "Музыка и субтитры",
    text: "Лицензионные треки + автоматические субтитры с подсветкой ключевых слов.",
  },
  {
    icon: Palette,
    title: "Бренд-кит",
    text: "Логотип, цвета, шрифт и водяной знак подтягиваются во все ролики автоматически.",
  },
  {
    icon: Share2,
    title: "Публичные ссылки",
    text: "Делитесь готовым видео по красивой ссылке без регистрации зрителя.",
  },
];

const STEPS = [
  {
    n: "01",
    title: "Опишите идею",
    text: "Тема, длительность, формат: Reels 9:16, квадрат 1:1 или горизонталь 16:9.",
  },
  {
    n: "02",
    title: "ИИ собирает ролик",
    text: "Сценарий, кадры, озвучка, музыка, субтитры — всё за пару минут.",
  },
  {
    n: "03",
    title: "Правьте и публикуйте",
    text: "Редактируйте сцены чатом, скачайте MP4 или поделитесь публичной ссылкой.",
  },
];

const PLANS = [
  {
    name: "Старт",
    price: "0 ₽",
    period: "навсегда",
    desc: "Попробовать без рисков",
    features: ["3 видео в месяц", "До 60 секунд", "Стандартная очередь", "Водяной знак"],
    cta: "Начать бесплатно",
    highlighted: false,
  },
  {
    name: "Про",
    price: "1 490 ₽",
    period: "в месяц",
    desc: "Для блогеров и SMM",
    features: [
      "30 видео в месяц",
      "До 5 минут",
      "Бренд-кит и шаблоны",
      "Без водяного знака",
      "Приоритетный рендер",
    ],
    cta: "Попробовать Про",
    highlighted: true,
  },
  {
    name: "Студия",
    price: "4 990 ₽",
    period: "в месяц",
    desc: "Команда и агентства",
    features: [
      "Без лимита",
      "До 15 минут",
      "5 пользователей",
      "API и вебхуки",
      "Поддержка 24/7",
    ],
    cta: "Связаться",
    highlighted: false,
  },
];

const FAQS = [
  {
    q: "Сколько времени занимает создание ролика?",
    a: "Готовое видео обычно собирается за 5–15 минут. Длинные форматы (3–5 минут) могут потребовать до 30 минут на рендер.",
  },
  {
    q: "На каких языках работает озвучка?",
    a: "Мы оптимизированы под русский язык. Также доступны английский, казахский и украинский голоса.",
  },
  {
    q: "Можно ли использовать видео в коммерческих целях?",
    a: "Да. Все материалы, которые мы подбираем (стоковые изображения, музыка), лицензированы для коммерческого использования на платных тарифах.",
  },
  {
    q: "Что с защитой данных?",
    a: "Данные хранятся в РФ-совместимой инфраструктуре. Сценарии и видео доступны только вам, публикация — только по вашему явному действию.",
  },
  {
    q: "Можно ли отменить подписку?",
    a: "Да, в любой момент из личного кабинета. Доступ сохраняется до конца оплаченного периода.",
  },
];

const STATS = [
  { v: "30 мин", l: "среднее время на ролик" },
  { v: "10×", l: "дешевле студии" },
  { v: "100%", l: "на русском языке" },
  { v: "9:16 / 1:1 / 16:9", l: "все форматы" },
];

export default function Landing() {
  const [demoOpen, setDemoOpen] = useState(false);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Decorative bg */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute top-[40%] right-[-10%] w-[500px] h-[500px] rounded-full bg-cyan-500/15 blur-[120px]" />
      </div>

      {/* Header */}
      <header className="container mx-auto px-4 py-5 flex items-center justify-between sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border/40">
        <Link href="/" className="flex items-center gap-2 font-bold text-2xl text-primary" data-testid="link-logo">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center shadow-lg shadow-primary/30">
            <Film className="w-6 h-6" />
          </div>
          НейроКлип
        </Link>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          <button onClick={() => scrollTo("features")} className="text-muted-foreground hover:text-foreground transition-colors">
            Возможности
          </button>
          <button onClick={() => scrollTo("how")} className="text-muted-foreground hover:text-foreground transition-colors">
            Как это работает
          </button>
          <button onClick={() => scrollTo("pricing")} className="text-muted-foreground hover:text-foreground transition-colors">
            Тарифы
          </button>
          <button onClick={() => scrollTo("faq")} className="text-muted-foreground hover:text-foreground transition-colors">
            Вопросы
          </button>
        </nav>
        <div className="flex items-center gap-2">
          <Link href="/login">
            <Button variant="ghost" data-testid="link-login">Войти</Button>
          </Link>
          <Link href="/register">
            <Button data-testid="link-register-header" className="bg-gradient-to-r from-primary to-cyan-500 hover:opacity-90 border-0">
              Начать бесплатно
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 pt-16 pb-20 md:pt-24 md:pb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-4xl mx-auto text-center space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium border border-primary/20">
            <Sparkles className="w-4 h-4" /> Лучший русскоязычный AI-видеосервис 2026
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-foreground leading-[1.05]">
            Идея → готовое видео
            <br />
            за <span className="bg-gradient-to-r from-primary to-cyan-500 bg-clip-text text-transparent">30 минут</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            Опишите тему — НейроКлип напишет сценарий, подберёт визуал, озвучит и смонтирует.
            Замените неделю работы целой студии одной кнопкой.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/register">
              <Button
                size="lg"
                data-testid="button-hero-cta"
                className="w-full sm:w-auto text-base h-14 px-8 rounded-full shadow-xl shadow-primary/30 bg-gradient-to-r from-primary to-cyan-500 hover:opacity-95 border-0"
              >
                Создать первое видео — бесплатно
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
            <Button
              size="lg"
              variant="outline"
              onClick={() => setDemoOpen(true)}
              data-testid="button-hero-demo"
              className="w-full sm:w-auto text-base h-14 px-8 rounded-full"
            >
              <PlayCircle className="w-5 h-5 mr-2" /> Посмотреть демо
            </Button>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground pt-4">
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Без карты</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> 3 ролика в подарок</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Русский интерфейс</span>
            <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-emerald-500" /> Готово через 5 минут</span>
          </div>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-px rounded-2xl border border-border/60 bg-border/60 overflow-hidden max-w-4xl mx-auto shadow-lg"
        >
          {STATS.map((s) => (
            <div key={s.l} className="bg-card p-5 text-center">
              <div className="text-2xl md:text-3xl font-extrabold bg-gradient-to-br from-primary to-cyan-500 bg-clip-text text-transparent">
                {s.v}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold uppercase tracking-wider mb-3">
            <Zap className="w-3.5 h-3.5" /> Возможности
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Всё, что нужно для видео — в одном месте
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Никаких вкладок Photoshop, Premiere и стоков. НейроКлип закрывает весь конвейер.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="rounded-2xl border bg-card p-6 hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-cyan-500/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.text}</p>
              </motion.div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <Clock className="w-3.5 h-3.5" /> Процесс
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            От идеи до публикации — 3 шага
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {STEPS.map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border bg-card p-7 hover:border-primary/40 transition-all"
            >
              <div className="text-6xl font-black text-primary/10 absolute top-3 right-5 select-none">
                {s.n}
              </div>
              <h3 className="text-xl font-bold mb-3">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Social proof / quote */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto rounded-3xl border bg-gradient-to-br from-primary/5 to-cyan-500/5 p-10 md:p-14 text-center">
          <Flame className="w-10 h-10 mx-auto text-orange-500 mb-5" />
          <p className="text-xl md:text-2xl font-medium leading-relaxed text-foreground">
            «За месяц команда выпустила 80 Reels на НейроКлипе. Раньше столько мы делали за квартал.
            Метрика просмотров x4 — потому что наконец-то успеваем за повесткой.»
          </p>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center font-bold">
              А
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">Анна Соколова</div>
              <div className="text-xs text-muted-foreground">SMM-руководитель, edtech-стартап</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
            <ShieldCheck className="w-3.5 h-3.5" /> Тарифы
          </div>
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Прозрачные цены без скрытых лимитов
          </h2>
          <p className="text-muted-foreground mt-4 text-lg">
            Начните бесплатно. Перейдите на платный тариф, когда поймёте, что нужно больше.
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-2xl border p-7 flex flex-col ${
                p.highlighted
                  ? "border-primary bg-gradient-to-b from-primary/5 to-transparent shadow-xl shadow-primary/10 scale-105"
                  : "bg-card"
              }`}
              data-testid={`plan-${p.name.toLowerCase()}`}
            >
              {p.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-primary to-cyan-500 text-white text-xs font-bold">
                  Популярный
                </div>
              )}
              <h3 className="text-lg font-bold">{p.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="text-4xl font-extrabold">{p.price}</span>
                <span className="text-sm text-muted-foreground">/ {p.period}</span>
              </div>
              <ul className="mt-6 space-y-3 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link href="/register" className="mt-7">
                <Button
                  className={`w-full ${p.highlighted ? "bg-gradient-to-r from-primary to-cyan-500 border-0" : ""}`}
                  variant={p.highlighted ? "default" : "outline"}
                >
                  {p.cta}
                </Button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="container mx-auto px-4 py-20 scroll-mt-20">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">Частые вопросы</h2>
          </div>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-base font-semibold">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-sm leading-relaxed">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* Final CTA */}
      <section className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto rounded-3xl bg-gradient-to-br from-primary to-cyan-500 p-10 md:p-16 text-center text-white relative overflow-hidden">
          <div className="absolute inset-0 opacity-20">
            <div className="absolute top-0 left-0 w-72 h-72 bg-white rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-0 w-72 h-72 bg-white rounded-full blur-3xl" />
          </div>
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-extrabold mb-4">
              Создайте первое видео сегодня
            </h2>
            <p className="text-white/90 text-lg mb-8 max-w-xl mx-auto">
              3 ролика в подарок при регистрации. Без карты, без обязательств.
            </p>
            <Link href="/register">
              <Button
                size="lg"
                data-testid="button-final-cta"
                className="h-14 px-10 rounded-full bg-white text-primary hover:bg-white/90 text-base font-bold shadow-xl"
              >
                Начать бесплатно
                <ChevronRight className="w-5 h-5 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60 mt-10">
        <div className="container mx-auto px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 font-bold text-lg">
              <div className="w-8 h-8 rounded-md bg-gradient-to-br from-primary to-cyan-500 text-white flex items-center justify-center">
                <Film className="w-5 h-5" />
              </div>
              НейроКлип
            </div>
            <p className="text-muted-foreground mt-3 max-w-xs">
              Российский AI-видеосервис. Превращаем тексты в готовые ролики за минуты.
            </p>
          </div>
          <div>
            <div className="font-semibold mb-3">Продукт</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><button onClick={() => scrollTo("features")} className="hover:text-foreground">Возможности</button></li>
              <li><button onClick={() => scrollTo("pricing")} className="hover:text-foreground">Тарифы</button></li>
              <li><button onClick={() => scrollTo("faq")} className="hover:text-foreground">Вопросы</button></li>
            </ul>
          </div>
          <div>
            <div className="font-semibold mb-3">Аккаунт</div>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link href="/login" className="hover:text-foreground">Войти</Link></li>
              <li><Link href="/register" className="hover:text-foreground">Регистрация</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-border/60">
          <div className="container mx-auto px-4 py-5 text-xs text-muted-foreground flex flex-col md:flex-row items-center justify-between gap-3">
            <div>© {new Date().getFullYear()} НейроКлип. Все права защищены.</div>
            <div className="flex items-center gap-4">
              <span>Сделано в России 🇷🇺</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Demo modal (lightweight) */}
      {demoOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setDemoOpen(false)}
          data-testid="demo-modal"
        >
          <div
            className="relative bg-card rounded-2xl overflow-hidden max-w-3xl w-full aspect-video shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setDemoOpen(false)}
              className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-black/60 text-white hover:bg-black/80 flex items-center justify-center text-xl"
              aria-label="Закрыть"
            >
              ×
            </button>
            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-primary/30 to-cyan-500/30 text-center p-8">
              <PlayCircle className="w-16 h-16 text-white mb-4" />
              <h3 className="text-2xl font-bold text-white mb-2">Демо скоро здесь</h3>
              <p className="text-white/80 mb-6 max-w-sm">
                А пока — самый быстрый способ увидеть НейроКлип в деле: создать свой первый ролик.
              </p>
              <Link href="/register">
                <Button size="lg" className="rounded-full bg-white text-primary hover:bg-white/90">
                  Попробовать бесплатно
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
