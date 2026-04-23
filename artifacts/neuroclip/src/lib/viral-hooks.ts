export type HookCategory =
  | "curiosity"
  | "contrarian"
  | "list"
  | "story"
  | "stat"
  | "question";

export interface ViralHook {
  id: string;
  category: HookCategory;
  text: string;
}

export const HOOK_CATEGORIES: { id: HookCategory; label: string; description: string; emoji: string }[] = [
  { id: "curiosity", label: "Любопытство", description: "Создаёт информационный пробел — невозможно не досмотреть", emoji: "🔥" },
  { id: "contrarian", label: "Противоречие", description: "Спорный тезис, который ломает шаблон", emoji: "⚡" },
  { id: "list", label: "Списки", description: "Конкретное число + обещание полезного", emoji: "📋" },
  { id: "story", label: "История", description: "Личный опыт, кейс, превращение", emoji: "🎬" },
  { id: "stat", label: "Цифра / факт", description: "Шокирующая статистика как зацеп", emoji: "📊" },
  { id: "question", label: "Вопрос", description: "Прямое обращение к зрителю", emoji: "❓" },
];

export const VIRAL_HOOKS: ViralHook[] = [
  // Curiosity (5)
  { id: "c1", category: "curiosity", text: "То, что я сейчас расскажу, никто не публикует — потому что после этого вы перестанете покупать курсы." },
  { id: "c2", category: "curiosity", text: "Я разобрался в этом за 3 года, а вы получите всё за 60 секунд." },
  { id: "c3", category: "curiosity", text: "Большинство экспертов скрывают этот метод — но он работает уже 10 лет." },
  { id: "c4", category: "curiosity", text: "Вот что я узнал, когда поговорил с 50 людьми, которые сделали это сами." },
  { id: "c5", category: "curiosity", text: "Через 90 секунд вы перестанете делать главную ошибку, которую делают все." },

  // Contrarian (5)
  { id: "k1", category: "contrarian", text: "Все говорят: «работай больше». Я скажу обратное — и докажу почему." },
  { id: "k2", category: "contrarian", text: "Дисциплина переоценена. Объясню, что работает вместо неё." },
  { id: "k3", category: "contrarian", text: "Если вы до сих пор делаете это «по учебнику», вы теряете деньги каждый день." },
  { id: "k4", category: "contrarian", text: "Совет, от которого я бы отказался, если бы мог вернуться на 5 лет назад." },
  { id: "k5", category: "contrarian", text: "Популярный приём, который реально вредит вашему результату." },

  // List (5)
  { id: "l1", category: "list", text: "5 вещей, о которых я жалею, что не знал, когда только начинал." },
  { id: "l2", category: "list", text: "3 ошибки, из-за которых 90% бросает уже на первой неделе." },
  { id: "l3", category: "list", text: "7 коротких приёмов — каждый можно применить за 5 минут." },
  { id: "l4", category: "list", text: "10 признаков, что пора всё менять. Найдите хотя бы 3 у себя." },
  { id: "l5", category: "list", text: "Вот 4 шага, которые сэкономят вам год экспериментов." },

  // Story (5)
  { id: "s1", category: "story", text: "Год назад у меня было ноль. Сегодня расскажу, как изменилось всё." },
  { id: "s2", category: "story", text: "Когда мне сказали «у тебя не получится», я записал это себе в напоминалку. Теперь покажу почему." },
  { id: "s3", category: "story", text: "Один разговор полностью развернул мою жизнь. Дословно перескажу." },
  { id: "s4", category: "story", text: "Мой клиент потратил 200 тысяч, чтобы понять то, что я сейчас расскажу бесплатно." },
  { id: "s5", category: "story", text: "Я провалился 7 раз подряд — и только на восьмой понял, в чём дело." },

  // Stat (5)
  { id: "t1", category: "stat", text: "97% людей делают это неправильно. Проверьте, не вы ли в их числе." },
  { id: "t2", category: "stat", text: "За последний год спрос вырос в 12 раз — а конкурентов почти нет." },
  { id: "t3", category: "stat", text: "Каждые 3 минуты в России происходит вот это. И почти никто об этом не знает." },
  { id: "t4", category: "stat", text: "По данным исследования, всего 2 из 100 доходят до финиша. Объясню, почему." },
  { id: "t5", category: "stat", text: "Средний человек теряет 4 часа в день впустую. Покажу, куда они уходят." },

  // Question (5)
  { id: "q1", category: "question", text: "Вы когда-нибудь замечали, что в конце дня вы устаёте, но ничего не сделано?" },
  { id: "q2", category: "question", text: "А что, если я скажу, что главная причина застоя — не лень, а кое-что другое?" },
  { id: "q3", category: "question", text: "Хотите узнать, как добиваются результата те, у кого «нет времени»?" },
  { id: "q4", category: "question", text: "Знаете, какой первый шаг делают все успешные люди в этой нише?" },
  { id: "q5", category: "question", text: "Что бы вы сделали, если бы знали, что точно не провалитесь?" },
];

export function hooksByCategory(category: HookCategory): ViralHook[] {
  return VIRAL_HOOKS.filter((h) => h.category === category);
}
