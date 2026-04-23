// Mock content generators for the AI pipeline.

const SAMPLE_IMAGES = [
  "https://images.unsplash.com/photo-1551434678-e076c223a692?w=1280",
  "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1280",
  "https://images.unsplash.com/photo-1581090700227-1e37b190418e?w=1280",
  "https://images.unsplash.com/photo-1531746790731-6c087fecd65a?w=1280",
  "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?w=1280",
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=1280",
  "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1280",
  "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1280",
  "https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=1280",
  "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1280",
];

const SAMPLE_VIDEO =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
const SAMPLE_AUDIO =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export function pickImage(seed: string, index: number): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  const idx = Math.abs(h + index) % SAMPLE_IMAGES.length;
  return SAMPLE_IMAGES[idx]!;
}

export const SAMPLE_VIDEO_URL = SAMPLE_VIDEO;
export const SAMPLE_AUDIO_URL = SAMPLE_AUDIO;

export type GeneratedScene = {
  title: string;
  narration: string;
  imagePrompt: string;
  durationSec: number;
};

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

type CategoryProfile = {
  intro: string[];
  middleTitle: (i: number) => string;
  middleNarration: (i: number, topic: string) => string;
  outro: (topic: string) => string;
  imageMood: string;
  sceneSeconds: number;
  introTitle: string;
  outroTitle: string;
};

const PROFILES: Record<CategoryId, CategoryProfile> = {
  educational: {
    introTitle: "Введение",
    outroTitle: "Подведём итоги",
    intro: [
      "Привет! Сегодня разбираемся в теме простым языком — без воды и сложных терминов.",
      "Если вы хотели разобраться раз и навсегда — вы по адресу. Поехали.",
      "За пару минут я объясню то, на что обычно уходят часы лекций.",
    ],
    middleTitle: (i) => `Раздел ${i}: ключевая идея`,
    middleNarration: (i, topic) => {
      const beats = [
        `Шаг ${i}. Сначала разберёмся с базовым понятием в теме «${topic}» — без него дальше будет сложно.`,
        `Идём глубже. На этом этапе важно понять причинно-следственную связь и почему именно так это работает.`,
        `Закрепим на конкретном примере. Так теория сразу превращается в практический навык.`,
        `А вот частая ошибка, которую совершают почти все — и как её избежать.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: (topic) =>
      `Вот мы и разобрали тему «${topic}». Сохраните видео, чтобы вернуться к нему, и расскажите в комментариях, что хотите изучить следующим.`,
    imageMood: "чистая инфографика, яркие акценты, дружелюбная атмосфера, диаграммы и схемы",
    sceneSeconds: 14,
  },
  historical: {
    introTitle: "Эпоха",
    outroTitle: "Уроки прошлого",
    intro: [
      "Перенесёмся на десятки лет назад — в эпоху, которая навсегда изменила ход истории.",
      "За каждым великим событием стоят люди. Сегодня мы расскажем именно о них.",
      "История любит детали. И в этой истории их особенно много.",
    ],
    middleTitle: (i) => `Глава ${i}`,
    middleNarration: (i, topic) => {
      const beats = [
        `К началу этих событий мир стоял на пороге перемен. Тема «${topic}» была лишь зерном будущей истории.`,
        `Решающий момент: одно решение, принятое в нужный час, изменило ход всей эпохи.`,
        `Свидетели вспоминали: атмосфера была наэлектризована, и каждый чувствовал — назад дороги нет.`,
        `Последствия не заставили себя ждать. То, что казалось локальным событием, стало достоянием всего человечества.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: (topic) =>
      `Вот так история «${topic}» повлияла на наш сегодняшний день. Помните: прошлое всегда говорит с нами — нужно лишь уметь слушать.`,
    imageMood: "кинематографичный, тёплая сепия, винтажные текстуры, драматичный свет, исторические артефакты",
    sceneSeconds: 18,
  },
  content: {
    introTitle: "Хук",
    outroTitle: "Подписка",
    intro: [
      "Стоп! Вы точно не знали этого факта. И сейчас я докажу.",
      "Эти три вещи изменят ваш день. Особенно последняя.",
      "Готовы? Поехали с самого сочного.",
    ],
    middleTitle: (i) => `№${i}`,
    middleNarration: (_i, topic) => {
      const beats = [
        `Первое, что взрывает мозг в теме «${topic}» — это масштаб.`,
        `Второе — мало кто об этом говорит, а зря.`,
        `И третье — то самое, ради чего вы досмотрели до конца.`,
      ];
      return beats[Math.floor(Math.random() * beats.length)]!;
    },
    outro: () =>
      "Если зашло — лайк, подписка и колокольчик. Завтра выйдет ещё круче.",
    imageMood: "яркие насыщенные цвета, динамичные ракурсы, поп-эстетика, крупные планы",
    sceneSeconds: 8,
  },
  marketing: {
    introTitle: "Проблема",
    outroTitle: "Призыв к действию",
    intro: [
      "Знакомо? Вы тратите часы на задачу, которую можно решить за минуты.",
      "Представьте: то, что отнимало неделю, теперь делается за вечер.",
      "Ваш клиент уже ищет решение. Дайте ему повод выбрать именно вас.",
    ],
    middleTitle: (i) => `Преимущество ${i}`,
    middleNarration: (i, topic) => {
      const beats = [
        `Что вы получаете на старте: «${topic}» закрывает главную боль за минуты, а не дни.`,
        `Реальный кейс: один из клиентов увеличил выручку на 38% всего за месяц.`,
        `Гарантия результата. Если не подойдёт — вернём деньги без вопросов.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: (topic) =>
      `Попробуйте «${topic}» уже сегодня — первая неделя бесплатно. Ссылка в описании.`,
    imageMood: "глянцевый продакшн, корпоративная палитра, чистые градиенты, продуктовые кадры",
    sceneSeconds: 10,
  },
  news: {
    introTitle: "Главное",
    outroTitle: "Что дальше",
    intro: [
      "В центре внимания — новость, которая обсуждает вся отрасль.",
      "Что произошло, почему это важно и кого это затронет — рассказываем по порядку.",
      "К этому часу появились новые подробности. Собрали всё ключевое в одном видео.",
    ],
    middleTitle: (i) => `Факт ${i}`,
    middleNarration: (i, topic) => {
      const beats = [
        `По данным источников, «${topic}» развивается стремительнее ожиданий.`,
        `Эксперты сходятся во мнении: ситуация может измениться в ближайшие дни.`,
        `Реакция рынка не заставила себя ждать — индексы и аудитория уже отреагировали.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: () =>
      "Будем следить за развитием событий. Подписывайтесь, чтобы не пропустить продолжение.",
    imageMood: "новостная студия, чистая типографика, нейтральная палитра, документальные кадры",
    sceneSeconds: 12,
  },
  story: {
    introTitle: "Завязка",
    outroTitle: "Финал",
    intro: [
      "Эта история началась с одной маленькой случайности — но изменила всё.",
      "Жил-был герой, который однажды решился на то, на что не отваживался никто.",
      "Иногда самые важные истории начинаются там, где их меньше всего ждёшь.",
    ],
    middleTitle: (i) => `Глава ${i}`,
    middleNarration: (i, topic) => {
      const beats = [
        `Шаг за шагом герой приближался к разгадке тайны «${topic}», и каждый поворот удивлял сильнее предыдущего.`,
        `Внезапно всё перевернулось: то, что казалось простым, обернулось настоящим испытанием.`,
        `И вот наступил тот самый момент — когда нужно было сделать выбор, от которого зависело всё.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: () =>
      "Так заканчивается одна история — и начинается ваша. Сохраните видео и поделитесь с тем, кому оно нужно сегодня.",
    imageMood: "сказочная атмосфера, мягкое волшебное освещение, акварельные оттенки, художественная композиция",
    sceneSeconds: 16,
  },
  vlog: {
    introTitle: "Привет!",
    outroTitle: "Пока!",
    intro: [
      "Привет, ребят! Сегодня делюсь личным — кажется, наболело.",
      "Заварил кофе, сел перед камерой и решил вам всё рассказать.",
      "Это видео — без сценария. Просто мысли вслух про то, что важно.",
    ],
    middleTitle: (i) => `Часть ${i}`,
    middleNarration: (_i, topic) => {
      const beats = [
        `Знаете, по поводу «${topic}» я долго не мог разобраться — и сейчас расскажу почему.`,
        `Был один случай, который перевернул моё отношение. Сейчас покажу.`,
        `И вот что я в итоге понял — может, кому-то пригодится.`,
      ];
      return beats[Math.floor(Math.random() * beats.length)]!;
    },
    outro: () =>
      "Пишите в комментариях, как у вас с этим. Лайк, если откликнулось. Обнял!",
    imageMood: "тёплый свет, естественные цвета, домашняя атмосфера, кадры от первого лица",
    sceneSeconds: 12,
  },
  howto: {
    introTitle: "Что нам понадобится",
    outroTitle: "Готово!",
    intro: [
      "Сейчас за пять минут научу делать то, что обычно объясняют целую главу.",
      "Простой пошаговый разбор: повторите за мной — и у вас точно получится.",
      "Никаких сложных терминов: только конкретные шаги и наглядный результат.",
    ],
    middleTitle: (i) => `Шаг ${i}`,
    middleNarration: (i, topic) => {
      const beats = [
        `Шаг ${i}. Подготовка. Без этого «${topic}» не получится — поэтому делаем медленно и аккуратно.`,
        `Шаг ${i}. Основное действие. Здесь главное — не торопиться и проверять промежуточный результат.`,
        `Шаг ${i}. Тонкая настройка. Маленькая деталь, которая отличает любительский результат от профессионального.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: () =>
      "Готово! Сохраните чек-лист в избранное и попробуйте сегодня же. У вас всё получится.",
    imageMood: "вид сверху, чистый фон, контрастные подписи, демонстрационная подача",
    sceneSeconds: 10,
  },
  kids: {
    introTitle: "Жил-был…",
    outroTitle: "Хорошего дня!",
    intro: [
      "Привет, дружок! Сегодня нас ждёт удивительная история. Готов?",
      "Жили-были… а кто — сейчас узнаем!",
      "Тс-с! Только тихо: волшебство уже начинается.",
    ],
    middleTitle: (i) => `Сцена ${i}`,
    middleNarration: (_i, topic) => {
      const beats = [
        `И тут герои встречают «${topic}» — и им стало очень-очень любопытно!`,
        `Они думали-думали и придумали — нужно действовать вместе!`,
        `И вот случилось чудо: всё получилось ещё лучше, чем они мечтали.`,
      ];
      return beats[Math.floor(Math.random() * beats.length)]!;
    },
    outro: () =>
      "А как закончится эта история — ты придумай сам. До новых сказок, малыш!",
    imageMood: "детская иллюстрация, яркие пастельные цвета, милые персонажи, мультяшный стиль",
    sceneSeconds: 9,
  },
  business: {
    introTitle: "Контекст",
    outroTitle: "Выводы",
    intro: [
      "Разбираем тему с точки зрения цифр, рынка и бизнес-результатов.",
      "Что это значит для индустрии и какие действия стоит предпринять руководителю — по порядку.",
      "Кратко, по делу, без воды: всё, что нужно знать топ-менеджеру за 5 минут.",
    ],
    middleTitle: (i) => `Тезис ${i}`,
    middleNarration: (i, topic) => {
      const beats = [
        `Тренд №${i}. Рынок «${topic}» в этом году вырос двузначными темпами — и это меняет правила игры.`,
        `Кейс лидера. Как одна компания сумела захватить долю рынка за счёт нестандартного решения.`,
        `Риски и возможности. Что делать сейчас, чтобы не оказаться в позиции догоняющего через год.`,
      ];
      return beats[(i - 1) % beats.length]!;
    },
    outro: () =>
      "Если материал был полезен — поделитесь с командой. Принимать решения проще, когда есть полная картина.",
    imageMood: "деловой минимализм, графики и дашборды, корпоративные интерьеры, серо-синяя палитра",
    sceneSeconds: 14,
  },
};

export function generateScript(
  topic: string,
  targetDurationSec: number,
  visualStyle: string,
  category: CategoryId = "educational",
): GeneratedScene[] {
  const profile = PROFILES[category] ?? PROFILES.educational;
  const sceneCount = Math.max(3, Math.min(12, Math.round(targetDurationSec / profile.sceneSeconds)));
  const perScene = Math.round(targetDurationSec / sceneCount);
  const topicShort = topic.split(/[.!?\n]/)[0]?.trim() || "тема";
  const scenes: GeneratedScene[] = [];
  for (let i = 0; i < sceneCount; i++) {
    let title: string;
    let narration: string;
    if (i === 0) {
      title = profile.introTitle;
      narration = `${profile.intro[i % profile.intro.length]} Сегодня — про «${topicShort}».`;
    } else if (i === sceneCount - 1) {
      title = profile.outroTitle;
      narration = profile.outro(topicShort);
    } else {
      title = profile.middleTitle(i);
      narration = profile.middleNarration(i, topicShort);
    }
    scenes.push({
      title,
      narration,
      imagePrompt: `${visualStyle}, ${profile.imageMood}, тема: ${topicShort}, сцена ${i + 1}`,
      durationSec: perScene,
    });
  }
  return scenes;
}
