import {
  GraduationCap,
  Landmark,
  Sparkles,
  Megaphone,
  Newspaper,
  BookOpen,
  Mic,
  ListChecks,
  Baby,
  Briefcase,
  type LucideIcon,
} from "lucide-react";

export type CategoryId =
  | "educational"
  | "historical"
  | "content"
  | "marketing"
  | "news"
  | "story"
  | "vlog"
  | "howto"
  | "kids"
  | "business";

export interface CategoryDef {
  id: CategoryId;
  label: string;
  tagline: string;
  description: string;
  Icon: LucideIcon;
  gradient: string;
  iconBg: string;
  defaults: {
    durationSec: number;
    visualStyle: string;
    voiceId: string;
    backgroundMusicId: string | null;
    addSubtitles: boolean;
  };
  hints: {
    titlePlaceholder: string;
    topicPlaceholder: string;
  };
  features: string[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "educational",
    label: "Образовательное",
    tagline: "Объясняем сложное простыми словами",
    description: "Уроки, разборы и объяснения для учеников, студентов и любознательных взрослых.",
    Icon: GraduationCap,
    gradient: "from-sky-500 to-blue-600",
    iconBg: "bg-sky-500/10 text-sky-600 dark:text-sky-400",
    defaults: { durationSec: 180, visualStyle: "realism", voiceId: "baya", backgroundMusicId: null, addSubtitles: true },
    hints: {
      titlePlaceholder: "Что такое чёрные дыры за 3 минуты",
      topicPlaceholder: "Объясни простым языком, как работают чёрные дыры. Аудитория — школьники старших классов. Без формул, с примерами и аналогиями.",
    },
    features: ["Дружелюбный голос", "Чёткая структура", "Понятные субтитры"],
  },
  {
    id: "historical",
    label: "Историческое",
    tagline: "Истории, которые изменили мир",
    description: "Документальные ролики о событиях, эпохах, биографиях и культурных феноменах.",
    Icon: Landmark,
    gradient: "from-amber-500 to-orange-600",
    iconBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    defaults: { durationSec: 300, visualStyle: "cinematic", voiceId: "filipp", backgroundMusicId: "epic", addSubtitles: true },
    hints: {
      titlePlaceholder: "Падение Берлинской стены: один день, изменивший Европу",
      topicPlaceholder: "Расскажи историю падения Берлинской стены: предыстория, ключевые лица, события 9 ноября 1989 года и последствия для Европы и мира.",
    },
    features: ["Кинематографичная картинка", "Дикторский голос", "Эпичная музыка"],
  },
  {
    id: "content",
    label: "Контент / Reels",
    tagline: "Короткие, яркие, цепляющие",
    description: "Динамичные ролики для соцсетей: TikTok, Reels, Shorts, ВК Клипы.",
    Icon: Sparkles,
    gradient: "from-fuchsia-500 to-pink-600",
    iconBg: "bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400",
    defaults: { durationSec: 60, visualStyle: "vivid", voiceId: "kseniya", backgroundMusicId: "energetic", addSubtitles: true },
    hints: {
      titlePlaceholder: "5 фактов о космосе, которые взорвут мозг",
      topicPlaceholder: "Подборка из 5 неожиданных фактов про космос. Каждый факт — отдельная сцена с хуком. Динамично, без воды, с цеплялкой в начале.",
    },
    features: ["Вертикальный формат", "Сильный хук", "Крупные субтитры"],
  },
  {
    id: "marketing",
    label: "Маркетинг / Промо",
    tagline: "Продающее видео под ключ",
    description: "Презентации продукта, услуги или предложения с конверсионной структурой.",
    Icon: Megaphone,
    gradient: "from-violet-600 to-purple-700",
    iconBg: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
    defaults: { durationSec: 90, visualStyle: "corporate", voiceId: "ermil", backgroundMusicId: "uplifting", addSubtitles: true },
    hints: {
      titlePlaceholder: "Сервис, который экономит 10 часов в неделю",
      topicPlaceholder: "Промо-ролик для SaaS-сервиса автоматизации задач. Боль клиента — рутина. Решение — наш продукт. CTA — попробовать бесплатно.",
    },
    features: ["Структура AIDA", "Призыв к действию", "Корпоративный стиль"],
  },
  {
    id: "news",
    label: "Новости / Обзор",
    tagline: "Главное за 2 минуты",
    description: "Краткие сводки событий, обзоры новинок, разборы трендов.",
    Icon: Newspaper,
    gradient: "from-rose-500 to-red-600",
    iconBg: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    defaults: { durationSec: 120, visualStyle: "documentary", voiceId: "aidar", backgroundMusicId: null, addSubtitles: true },
    hints: {
      titlePlaceholder: "Главное в мире технологий за неделю",
      topicPlaceholder: "Обзор главных новостей IT за неделю: новые модели ИИ, релизы устройств, важные события индустрии. Нейтральный тон, по фактам.",
    },
    features: ["Нейтральный тон", "Чёткая подача", "Быстрый темп"],
  },
  {
    id: "story",
    label: "Сторителлинг",
    tagline: "Истории, которые трогают",
    description: "Художественные ролики, рассказы, эссе, авторские размышления.",
    Icon: BookOpen,
    gradient: "from-indigo-500 to-blue-700",
    iconBg: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    defaults: { durationSec: 240, visualStyle: "artistic", voiceId: "alyss", backgroundMusicId: "ambient", addSubtitles: true },
    hints: {
      titlePlaceholder: "Письмо самому себе из будущего",
      topicPlaceholder: "Эмоциональный рассказ от первого лица: герой получает письмо от себя из будущего и переосмысливает свою жизнь. Атмосферный, тёплый.",
    },
    features: ["Художественный стиль", "Эмоциональный голос", "Эмбиент-музыка"],
  },
  {
    id: "vlog",
    label: "Влог / Личное",
    tagline: "От первого лица",
    description: "Личные размышления, мнения, дневники, реакции на события.",
    Icon: Mic,
    gradient: "from-emerald-500 to-teal-600",
    iconBg: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    defaults: { durationSec: 300, visualStyle: "realism", voiceId: "jane", backgroundMusicId: "chill", addSubtitles: true },
    hints: {
      titlePlaceholder: "Год без соцсетей: что я понял",
      topicPlaceholder: "Личный опыт жизни без соцсетей в течение года. Что изменилось, что было сложно, что стоит попробовать каждому.",
    },
    features: ["Тёплая подача", "Естественный темп", "Расслабленная музыка"],
  },
  {
    id: "howto",
    label: "Инструкция / How-to",
    tagline: "Пошагово и наглядно",
    description: "Туториалы, мастер-классы, лайфхаки, рецепты — формат «делай как я».",
    Icon: ListChecks,
    gradient: "from-lime-500 to-green-600",
    iconBg: "bg-lime-500/10 text-lime-600 dark:text-lime-400",
    defaults: { durationSec: 180, visualStyle: "minimal", voiceId: "baya", backgroundMusicId: null, addSubtitles: true },
    hints: {
      titlePlaceholder: "Как сварить идеальный кофе дома",
      topicPlaceholder: "Пошаговая инструкция приготовления фильтр-кофе дома: оборудование, помол, пропорции, температура воды, частые ошибки.",
    },
    features: ["Чёткие шаги", "Минимализм", "Без музыки — лучше слышно"],
  },
  {
    id: "kids",
    label: "Для детей",
    tagline: "Сказки и развивашки",
    description: "Добрые истории, развивающие ролики и обучающие сказки для малышей.",
    Icon: Baby,
    gradient: "from-yellow-400 to-amber-500",
    iconBg: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    defaults: { durationSec: 180, visualStyle: "cartoon", voiceId: "alyss", backgroundMusicId: "playful", addSubtitles: false },
    hints: {
      titlePlaceholder: "Сказка про храброго ёжика",
      topicPlaceholder: "Добрая сказка для детей 4-7 лет про маленького ёжика, который победил свой страх темноты. С моралью и счастливым концом.",
    },
    features: ["Мультяшный стиль", "Мягкий голос", "Игривая музыка"],
  },
  {
    id: "business",
    label: "Бизнес / B2B",
    tagline: "Для руководителей и команд",
    description: "Аналитика, разборы кейсов, внутренние коммуникации, отчёты, обучение.",
    Icon: Briefcase,
    gradient: "from-slate-600 to-zinc-800",
    iconBg: "bg-slate-500/10 text-slate-700 dark:text-slate-300",
    defaults: { durationSec: 300, visualStyle: "corporate", voiceId: "ermil", backgroundMusicId: "corporate", addSubtitles: true },
    hints: {
      titlePlaceholder: "Итоги квартала: ключевые метрики",
      topicPlaceholder: "Краткий разбор итогов квартала для команды: рост выручки, главные достижения, проблемные зоны и приоритеты на следующий квартал.",
    },
    features: ["Деловая подача", "Графики и цифры", "Корпоративная палитра"],
  },
];

export const CATEGORY_MAP: Record<CategoryId, CategoryDef> = Object.fromEntries(
  CATEGORIES.map((c) => [c.id, c]),
) as Record<CategoryId, CategoryDef>;
