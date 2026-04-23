import type { CategoryId } from "@/lib/categories";

/**
 * Готовые шаблоны видео — конкурентный аналог Pictory/InVideo «Templates».
 * При выборе шаблона прелитим поля шага 1 одним кликом.
 *
 * Каждый шаблон — это понятный сценарий-старт: тема, длительность, стиль,
 * голос, музыка и пример описания темы (рыба для копирования/правки).
 */
export type TemplateId =
  | "reels-product-launch"
  | "reels-howto-30s"
  | "reels-fact-list"
  | "shorts-personal-story"
  | "shorts-news-explainer"
  | "shorts-quote-motivation"
  | "long-tutorial"
  | "long-case-study"
  | "long-product-demo"
  | "ad-promo-15s"
  | "ad-sale-flash"
  | "edu-lesson-3min"
  | "podcast-recap"
  | "vlog-day-in-life";

export interface VideoTemplate {
  id: TemplateId;
  name: string;
  emoji: string;
  group: "reels" | "long" | "ads" | "education" | "vlog";
  groupLabel: string;
  category: CategoryId;
  durationSec: number;
  visualStyle: string;
  voiceId: string;
  musicId: string;
  addSubtitles: boolean;
  aspectRatio: "16:9" | "9:16" | "1:1";
  /** Короткая выгода для пользователя — почему это хороший формат. */
  benefit: string;
  /** Что обычно выходит — описание для предпросмотра. */
  description: string;
  /** Готовое описание темы-рыба (можно отредактировать). */
  sampleTopic: string;
  /** Подсветка карточки. */
  accent: string;
}

export const VIDEO_TEMPLATES: VideoTemplate[] = [
  // ========== REELS / SHORTS ==========
  {
    id: "reels-product-launch",
    name: "Анонс товара (Reels)",
    emoji: "🚀",
    group: "reels",
    groupLabel: "Короткие · 30–60 сек",
    category: "marketing",
    durationSec: 45,
    visualStyle: "cinematic",
    voiceId: "kseniya",
    musicId: "uplifting_indie",
    addSubtitles: true,
    aspectRatio: "9:16",
    benefit: "Высокий охват в Reels/Shorts/VK Клипах",
    description: "Динамичный анонс с крючком в первые 2 секунды, тремя ключевыми преимуществами и чётким CTA.",
    sampleTopic:
      "Запуск нового продукта: умные наушники с шумоподавлением. Целевая аудитория — молодёжь 18–28. Фишки: 30 часов работы, водозащита, авто-сопряжение. CTA: переход на сайт за скидкой 20%.",
    accent: "from-fuchsia-500 to-pink-500",
  },
  {
    id: "reels-howto-30s",
    name: "Как сделать (How-to)",
    emoji: "🛠️",
    group: "reels",
    groupLabel: "Короткие · 30–60 сек",
    category: "education",
    durationSec: 45,
    visualStyle: "minimal",
    voiceId: "aidar",
    musicId: "tech_pulse",
    addSubtitles: true,
    aspectRatio: "9:16",
    benefit: "Сохраняют и пересылают друзьям",
    description: "Пошаговый туториал из 3–5 коротких шагов с подписями и иллюстрациями.",
    sampleTopic:
      "Как быстро навести порядок на рабочем столе компьютера за 5 минут: разложить файлы по папкам, удалить дубликаты, настроить автосортировку.",
    accent: "from-cyan-500 to-blue-500",
  },
  {
    id: "reels-fact-list",
    name: "Подборка фактов (5 штук)",
    emoji: "💡",
    group: "reels",
    groupLabel: "Короткие · 30–60 сек",
    category: "content",
    durationSec: 50,
    visualStyle: "realism",
    voiceId: "marina",
    musicId: "ambient_focus",
    addSubtitles: true,
    aspectRatio: "9:16",
    benefit: "Виральный формат — высокая досматриваемость",
    description: "Цепляющий список «5 фактов о…» — работает в любой нише.",
    sampleTopic:
      "5 неожиданных фактов о шоколаде: что он впервые был напитком, почему белый шоколад — не шоколад, как влияет на настроение и т.п.",
    accent: "from-amber-500 to-orange-500",
  },
  {
    id: "shorts-personal-story",
    name: "Личная история",
    emoji: "🎙️",
    group: "reels",
    groupLabel: "Короткие · 30–60 сек",
    category: "content",
    durationSec: 60,
    visualStyle: "cinematic",
    voiceId: "eugene",
    musicId: "calm_corporate",
    addSubtitles: true,
    aspectRatio: "9:16",
    benefit: "Создаёт эмоциональную связь с подписчиками",
    description: "Рассказ от первого лица: проблема → инсайт → результат.",
    sampleTopic:
      "Как я бросил привычку откладывать дела и сделал больше за месяц, чем за весь предыдущий год. Что именно сработало.",
    accent: "from-rose-500 to-red-500",
  },
  {
    id: "shorts-news-explainer",
    name: "Новость за 60 секунд",
    emoji: "📰",
    group: "reels",
    groupLabel: "Короткие · 30–60 сек",
    category: "content",
    durationSec: 60,
    visualStyle: "realism",
    voiceId: "anton",
    musicId: "tech_pulse",
    addSubtitles: true,
    aspectRatio: "9:16",
    benefit: "Идеально для Telegram-каналов и новостных пабликов",
    description: "Что произошло, почему важно, что это значит для зрителя.",
    sampleTopic:
      "Что такое нашумевшая модель GPT-нового поколения и как она изменит работу копирайтеров в России в ближайший год.",
    accent: "from-slate-500 to-zinc-500",
  },
  {
    id: "shorts-quote-motivation",
    name: "Мотивация дня",
    emoji: "✨",
    group: "reels",
    groupLabel: "Короткие · 30–60 сек",
    category: "content",
    durationSec: 30,
    visualStyle: "minimal",
    voiceId: "baya",
    musicId: "epic_cinematic",
    addSubtitles: true,
    aspectRatio: "9:16",
    benefit: "Лёгкий контент для ежедневных постов",
    description: "Сильная цитата + краткое размышление. Эстетичный визуал.",
    sampleTopic:
      "Размышление вокруг цитаты «Дисциплина — это мост между целями и достижениями». Привести 2 личных примера.",
    accent: "from-violet-500 to-purple-500",
  },

  // ========== LONG-FORM ==========
  {
    id: "long-tutorial",
    name: "Большой туториал",
    emoji: "🎓",
    group: "long",
    groupLabel: "Длинные · 3–5 мин",
    category: "education",
    durationSec: 240,
    visualStyle: "minimal",
    voiceId: "aidar",
    musicId: "ambient_focus",
    addSubtitles: true,
    aspectRatio: "16:9",
    benefit: "Высокая ценность — зрители возвращаются",
    description: "Структурированный обучающий ролик с разбором по разделам.",
    sampleTopic:
      "Полный гайд по запуску своего интернет-магазина с нуля: выбор ниши, платформа, первые поставщики, реклама, метрики.",
    accent: "from-emerald-500 to-teal-500",
  },
  {
    id: "long-case-study",
    name: "Кейс / Разбор",
    emoji: "📊",
    group: "long",
    groupLabel: "Длинные · 3–5 мин",
    category: "marketing",
    durationSec: 180,
    visualStyle: "realism",
    voiceId: "kseniya",
    musicId: "calm_corporate",
    addSubtitles: false,
    aspectRatio: "16:9",
    benefit: "Доверие — реальные цифры и выводы",
    description: "Структура: контекст → проблема → решение → результат → выводы.",
    sampleTopic:
      "Как кофейня в Казани увеличила выручку на 40% за 3 месяца, сменив только меню и подачу. Цифры, фото, выводы для других предпринимателей.",
    accent: "from-blue-500 to-indigo-500",
  },
  {
    id: "long-product-demo",
    name: "Демо продукта",
    emoji: "💻",
    group: "long",
    groupLabel: "Длинные · 3–5 мин",
    category: "marketing",
    durationSec: 180,
    visualStyle: "3d",
    voiceId: "eugene",
    musicId: "tech_pulse",
    addSubtitles: false,
    aspectRatio: "16:9",
    benefit: "Заменяет менеджера на холодных лидах",
    description: "Обзор всех ключевых функций с экраном продукта и пояснениями.",
    sampleTopic:
      "Демо нашего CRM-сервиса: как добавить клиента, поставить задачу команде, отследить воронку продаж и получить отчёт за 5 кликов.",
    accent: "from-indigo-500 to-violet-500",
  },

  // ========== ADS ==========
  {
    id: "ad-promo-15s",
    name: "Реклама 15 секунд",
    emoji: "📣",
    group: "ads",
    groupLabel: "Реклама",
    category: "marketing",
    durationSec: 15,
    visualStyle: "cinematic",
    voiceId: "anton",
    musicId: "epic_cinematic",
    addSubtitles: true,
    aspectRatio: "1:1",
    benefit: "Pre-roll для VK и YouTube — максимум за минимум",
    description: "Хук → суть → CTA. Никакой воды.",
    sampleTopic:
      "15-секундный ролик для бренда натуральной косметики — представляет новую линейку увлажняющих кремов, призыв перейти на сайт.",
    accent: "from-pink-500 to-rose-500",
  },
  {
    id: "ad-sale-flash",
    name: "Флеш-распродажа",
    emoji: "🔥",
    group: "ads",
    groupLabel: "Реклама",
    category: "marketing",
    durationSec: 30,
    visualStyle: "cinematic",
    voiceId: "marina",
    musicId: "uplifting_indie",
    addSubtitles: true,
    aspectRatio: "1:1",
    benefit: "Срочность → высокая конверсия",
    description: "Большая скидка, дедлайн, что именно в скидке, чёткий CTA.",
    sampleTopic:
      "Флеш-распродажа онлайн-курса по Python: скидка 50% действует только 48 часов, рассказать программу из 3 пунктов.",
    accent: "from-red-500 to-orange-500",
  },

  // ========== EDUCATION ==========
  {
    id: "edu-lesson-3min",
    name: "Мини-урок",
    emoji: "📚",
    group: "education",
    groupLabel: "Образование",
    category: "education",
    durationSec: 180,
    visualStyle: "minimal",
    voiceId: "kseniya",
    musicId: "ambient_focus",
    addSubtitles: true,
    aspectRatio: "16:9",
    benefit: "Идеально для школьных и онлайн-курсов",
    description: "Тема → объяснение → пример → закрепление.",
    sampleTopic:
      "Мини-урок по физике для 8 класса: что такое электрическое сопротивление, простыми словами, с бытовым примером.",
    accent: "from-teal-500 to-cyan-500",
  },

  // ========== VLOG / PODCAST ==========
  {
    id: "podcast-recap",
    name: "Краткий пересказ подкаста",
    emoji: "🎧",
    group: "vlog",
    groupLabel: "Влог · Подкаст",
    category: "content",
    durationSec: 90,
    visualStyle: "realism",
    voiceId: "eugene",
    musicId: "calm_corporate",
    addSubtitles: true,
    aspectRatio: "16:9",
    benefit: "Из 1-часового подкаста — 90-секундный тизер",
    description: "5 главных мыслей из выпуска подкаста — для ленты соцсетей.",
    sampleTopic:
      "Главные тезисы подкаста с известным предпринимателем о том, как он построил бизнес с нуля на собственных сбережениях.",
    accent: "from-purple-500 to-fuchsia-500",
  },
  {
    id: "vlog-day-in-life",
    name: "День из жизни",
    emoji: "📱",
    group: "vlog",
    groupLabel: "Влог · Подкаст",
    category: "content",
    durationSec: 120,
    visualStyle: "cinematic",
    voiceId: "baya",
    musicId: "uplifting_indie",
    addSubtitles: true,
    aspectRatio: "16:9",
    benefit: "Личный контент — высокая лояльность аудитории",
    description: "Утро → работа → отдых → итог дня. Атмосферный монтаж.",
    sampleTopic:
      "Один день из жизни фрилансера-дизайнера в Москве: утренние ритуалы, рабочая рутина, встречи с клиентами, вечерний отдых.",
    accent: "from-amber-500 to-yellow-500",
  },
];

export const TEMPLATE_GROUPS: { id: VideoTemplate["group"]; label: string; description: string }[] = [
  { id: "reels", label: "Короткие · Reels/Shorts", description: "30–60 секунд для соцсетей" },
  { id: "long", label: "Длинные · 3–5 минут", description: "Подробные обучающие и обзорные ролики" },
  { id: "ads", label: "Реклама", description: "Конверсионные форматы для рекламных кампаний" },
  { id: "education", label: "Образование", description: "Уроки и объяснения" },
  { id: "vlog", label: "Влог · Подкаст", description: "Личный и развлекательный контент" },
];

export const TEMPLATE_MAP: Record<TemplateId, VideoTemplate> = Object.fromEntries(
  VIDEO_TEMPLATES.map((t) => [t.id, t]),
) as Record<TemplateId, VideoTemplate>;
