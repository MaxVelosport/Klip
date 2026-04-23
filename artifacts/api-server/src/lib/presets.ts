export const VOICES = [
  { id: "baya", label: "Бая (женский)", gender: "female", sampleUrl: null, proOnly: false },
  { id: "kseniya", label: "Ксения (женский)", gender: "female", sampleUrl: null, proOnly: false },
  { id: "aidar", label: "Айдар (мужской)", gender: "male", sampleUrl: null, proOnly: false },
  { id: "eugene", label: "Евгений (мужской)", gender: "male", sampleUrl: null, proOnly: false },
  { id: "marina", label: "Марина (женский, премиум)", gender: "female", sampleUrl: null, proOnly: true },
  { id: "anton", label: "Антон (мужской, премиум)", gender: "male", sampleUrl: null, proOnly: true },
];

export const ANIMATIONS = [
  { value: "ken_burns_zoom_in", label: "Зум внутрь", proOnly: false },
  { value: "ken_burns_zoom_out", label: "Зум наружу", proOnly: false },
  { value: "pan_left", label: "Панорама влево", proOnly: false },
  { value: "pan_right", label: "Панорама вправо", proOnly: false },
  { value: "parallax", label: "Параллакс", proOnly: true },
  { value: "still", label: "Без анимации", proOnly: false },
];

export const TRANSITIONS = [
  { value: "fade", label: "Затухание", proOnly: false },
  { value: "cut", label: "Резкая склейка", proOnly: false },
  { value: "slide_left", label: "Сдвиг влево", proOnly: false },
  { value: "slide_right", label: "Сдвиг вправо", proOnly: false },
  { value: "morph", label: "Морфинг", proOnly: true },
  { value: "glitch", label: "Глитч", proOnly: true },
];

export const VISUAL_STYLES = [
  { value: "realism", label: "Реализм", proOnly: false },
  { value: "cinematic", label: "Кинематограф", proOnly: false },
  { value: "anime", label: "Аниме", proOnly: false },
  { value: "watercolor", label: "Акварель", proOnly: false },
  { value: "minimal", label: "Минимализм", proOnly: false },
  { value: "3d_render", label: "3D-рендер", proOnly: true },
];

export const MUSIC = [
  { id: "calm_corporate", label: "Спокойный корпоратив", mood: "calm", bpm: 90 },
  { id: "uplifting_indie", label: "Вдохновляющий инди", mood: "uplifting", bpm: 120 },
  { id: "epic_cinematic", label: "Эпический кинематограф", mood: "epic", bpm: 110 },
  { id: "playful_kids", label: "Игровой детский", mood: "playful", bpm: 130 },
  { id: "tech_pulse", label: "Технологичный пульс", mood: "tech", bpm: 128 },
  { id: "ambient_focus", label: "Эмбиент для фокуса", mood: "ambient", bpm: 75 },
];

export const TOKEN_PACKS = [
  { id: "tokens_100", label: "100 жетонов", tokens: 100, priceRub: 290, bonusPercent: 0 },
  { id: "tokens_500", label: "500 жетонов", tokens: 500, priceRub: 1290, bonusPercent: 10 },
  { id: "tokens_2000", label: "2000 жетонов", tokens: 2000, priceRub: 4490, bonusPercent: 25 },
];

export const TOKEN_PACK_TOKENS: Record<string, number> = {
  tokens_100: 100,
  tokens_500: 550,
  tokens_2000: 2500,
};

export const TOKEN_PACK_PRICE: Record<string, number> = {
  tokens_100: 290,
  tokens_500: 1290,
  tokens_2000: 4490,
};
