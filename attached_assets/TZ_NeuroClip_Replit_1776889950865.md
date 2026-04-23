# Техническое задание: НейроКлип (MVP на Replit)

**Версия документа:** 1.0
**Дата:** апрель 2026
**Статус:** готово к реализации
**Целевая платформа:** Replit (Deployments + Reserved VM + Object Storage + PostgreSQL)
**Горизонт:** MVP → публичный запуск (Q3 2026 – Q2 2027 по дорожной карте)

---

## 1. Общая информация

### 1.1. Название продукта
**НейроКлип** — веб-платформа полного цикла AI-видеопродакшна: пользователь описывает тему → система генерирует сценарий, изображения, анимацию, озвучку, субтитры и собирает готовое MP4-видео.

### 1.2. Бизнес-суть (коротко)
- Цена: **500 ₽** за 10-минутное видео (vs. 30 000–60 000 ₽ у студий).
- Время: **30 минут** от идеи до результата (vs. 1–2 недели).
- Команда: **1 человек** (vs. 5 специалистов).
- Целевая аудитория: преподаватели, репетиторы, блогеры, HR, малый бизнес, эксперты.

### 1.3. Глоссарий
| Термин | Значение |
|---|---|
| **Project** | Единица работы пользователя: одно видео со всеми этапами. |
| **Pipeline** | Последовательность 6 этапов: Тема → Сценарий → Фото → Анимация → Озвучка → Сборка. |
| **Scene** | Атомарный элемент сценария: отрезок текста + картинка + длительность. |
| **Токен** | Единица тарификации pay-as-you-go: 1 токен ≈ 1 минута готового видео. |
| **TTS** | Text-to-Speech, синтез речи. |
| **LLM** | Large Language Model (YandexGPT, GigaChat, GPT-4 как fallback). |
| **Ken Burns** | Эффект плавного панорамирования/зумирования статичного изображения. |

---

## 2. Цели и задачи MVP

### 2.1. Цель MVP
Собрать работающий end-to-end прототип, который по текстовой теме выдаёт MP4-ролик до **10 минут** с AI-сценарием, AI-иллюстрациями (Kandinsky), Ken Burns-анимацией, TTS-озвучкой (Silero) и субтитрами.

### 2.2. Ключевые задачи MVP
1. Регистрация/авторизация пользователя (email + OAuth VK/Яндекс).
2. Мастер создания проекта из 6 шагов с возможностью ручной правки на каждом этапе.
3. Backend-пайплайн рендеринга (асинхронная очередь задач).
4. Личный кабинет: список проектов, статусы, скачивание MP4.
5. Тарифы Free / Standard / Pro + система токенов.
6. Приём платежей (ЮKassa: СБП + карты РФ).
7. Landing page + онбординг.
8. Закрытое бета-тестирование на 50 пользователей.

### 2.3. Что НЕ входит в MVP (вынесено в post-MVP)
- Shorts-нарезка
- HeyGen / D-ID AI-аватары
- Клонирование голоса (ElevenLabs)
- API для внешних интеграций
- Мобильное приложение (PWA)
- B2B-кабинет и мультиаккаунтность

---

## 3. Роли и сценарии использования

### 3.1. Роли
| Роль | Описание |
|---|---|
| **Гость** | Не авторизован. Видит только landing + страницу демо. |
| **User (Free/Standard/Pro)** | Зарегистрирован, создаёт проекты согласно лимитам своего тарифа. |
| **Admin** | Внутренняя роль: управление пользователями, тарифами, промокодами, мониторинг очередей. |

### 3.2. Основные пользовательские сценарии (User Stories)

**US-1.** Как преподаватель, я хочу описать тему урока и получить готовый MP4 за 30 минут, чтобы выложить его студентам.

**US-2.** Как блогер, я хочу отредактировать сценарий, сгенерированный AI, перед тем как запускать рендер, чтобы результат соответствовал моему tone of voice.

**US-3.** Как репетитор, я хочу перегенерировать отдельное изображение сцены, не перезапуская весь пайплайн, чтобы сэкономить токены.

**US-4.** Как пользователь Free, я хочу увидеть, сколько видео мне ещё осталось в этом месяце, чтобы планировать использование.

**US-5.** Как пользователь Standard, я хочу загрузить свой голос (WAV) для озвучки вместо AI-TTS, чтобы ролики звучали «как я».

**US-6.** Как админ, я хочу видеть общую панель очереди задач, чтобы диагностировать зависшие рендеры.

---

## 4. Функциональные требования

### 4.1. Модуль регистрации и аутентификации (F-AUTH)

**F-AUTH-1.** Регистрация по email + пароль (с подтверждением по коду на email).
**F-AUTH-2.** OAuth через ВКонтакте и Яндекс ID (обязательно для MVP — российская аудитория).
**F-AUTH-3.** Восстановление пароля через email-код.
**F-AUTH-4.** JWT-токены: access (15 мин) + refresh (30 дней). HttpOnly cookie для refresh, memory/Authorization header для access.
**F-AUTH-5.** Rate limiting на /login и /register: 5 попыток / 15 мин с одного IP.
**F-AUTH-6.** Согласие на обработку персональных данных по ФЗ-152 (checkbox + ссылка на политику).

### 4.2. Модуль профиля и биллинга (F-BILL)

**F-BILL-1.** Профиль: email, имя, аватар (upload в Object Storage), телефон (опц.).
**F-BILL-2.** Страница «Тариф и платежи»:
  - Текущий тариф и дата следующего списания.
  - Счётчики: израсходовано/осталось видео в этом периоде.
  - Баланс токенов (отдельно от подписки).
  - История платежей.
  - Кнопки «Сменить тариф», «Купить токены», «Отменить подписку».
**F-BILL-3.** Интеграция с **ЮKassa**:
  - Одноразовые платежи (покупка пакета токенов).
  - Рекуррентные платежи (подписка ежемесячная/годовая).
  - Способы оплаты: СБП, карты РФ (Мир, Visa, Mastercard), ЮMoney.
  - Webhook `/api/billing/yookassa-webhook` для подтверждения платежей.
  - Тестовый и боевой режим переключается через env.
**F-BILL-4.** Логика списания при создании проекта:
  - Сначала проверяется квота тарифа (месячный лимит видео).
  - Если квота исчерпана — списываются токены (1 токен = 1 минута готового видео).
  - Если и токенов не хватает — рендер запрещён, показывается CTA «Купить токены».
**F-BILL-5.** Промокоды (опционально в MVP): фиксированная сумма или % скидки, одноразовые/многоразовые, срок действия.

### 4.3. Модуль создания проекта — Мастер из 6 шагов (F-WIZARD)

Главный функционал. Реализуется как stepper-форма с сохранением промежуточных состояний.

#### Шаг 1. Тема
- Поле: название проекта (обязательно, 3–100 символов).
- Поле: описание темы (обязательно, 20–1000 символов) — «О чём видео, для кого, какой тон, какие ключевые моменты».
- Select: целевая длительность (1, 3, 5, 10 минут; Standard/Pro — до 30/120 мин).
- Select: стиль визуала (реализм, иллюстрация, 3D, минимализм) — для Standard/Pro.
- Select: тип озвучки (мужской, женский, нейтральный; загрузка WAV — для Standard/Pro).
- Кнопка «Сгенерировать сценарий» → переход к шагу 2 и старт фоновой задачи generation.

#### Шаг 2. Сценарий
- Loader с прогрессом генерации (5–15 сек).
- Отображение сценария в виде **списка сцен** (editable). Для каждой сцены:
  - Заголовок сцены (напр. «Введение», «Формула», «Пример 1»).
  - Текст закадрового голоса (editable textarea).
  - Подсказка для генерации изображения (editable, prefilled от LLM).
  - Оценочная длительность (рассчитывается по длине текста при скорости 150 слов/мин).
- Кнопки: «Добавить сцену», «Удалить сцену», «Перегенерировать всё», «Перегенерировать эту сцену».
- Итого: общая длительность видео. Если превышает тариф — warning.
- Кнопка «Далее → генерация изображений».

#### Шаг 3. Фото
- Для каждой сцены отображается 1 изображение (после генерации через Kandinsky).
- Плейсхолдер со скелетоном во время генерации.
- На изображении — оверлей с кнопками: «Перегенерировать», «Загрузить своё», «Редактировать промпт».
- После редактирования промпта — кнопка «Перегенерировать» запускает Kandinsky повторно.
- Загрузка своего файла: JPG/PNG ≤ 10 МБ, валидация размеров (мин 1024×576).
- Кнопка «Далее → анимация».

#### Шаг 4. Анимация
- Preview проигрывается прямо в браузере (собранное превью без озвучки, с Ken Burns-эффектами).
- Для каждой сцены — select типа анимации:
  - `ken_burns_zoom_in`
  - `ken_burns_zoom_out`
  - `ken_burns_pan_left_right`
  - `parallax` (только Standard/Pro)
  - `static` (без движения)
- Select переходов между сценами: `fade`, `cut`, `slide_left`, `slide_up`.
- Кнопка «Далее → озвучка».

#### Шаг 5. Озвучка
- Generate TTS по всему сценарию (Silero для Free/Standard; ElevenLabs — post-MVP для Pro).
- Плеер: воспроизведение полной дорожки + отдельных сцен.
- Select: голос (из списка), скорость (0.8×–1.3×), тон.
- Для Standard+: кнопка «Загрузить свой голос» → upload WAV/MP3 ≤ 100 МБ. Дорожки нарезаются и матчатся по длительностям сцен (если пользовательская дорожка длиннее/короче — показываем предупреждение).
- Slider: громкость фоновой музыки (0–100%).
- Select: фоновая музыка (10–15 пресетов royalty-free + кнопка «Без музыки» + upload своей).
- Чекбокс: «Добавить субтитры» (по умолчанию ВКЛ).
- Кнопка «Далее → финальная сборка».

#### Шаг 6. Видео
- Экран рендеринга с прогрессбаром и статусом этапа (рендер идёт в очереди — видно позицию, ETA).
- По завершении:
  - Player с готовым MP4.
  - Кнопки: «Скачать MP4», «Скопировать ссылку» (паблик-ссылка на 30 дней в Object Storage), «Поделиться в VK/Telegram».
  - Блок «Правки»: пользователь может вернуться на любой шаг → запуск повторной сборки.
- Email-уведомление о готовности (async).

### 4.4. Модуль «Мои проекты» (F-DASH)
**F-DASH-1.** Список проектов пользователя с пагинацией (20 на страницу).
**F-DASH-2.** Для каждого проекта: обложка (превью-кадр), название, статус (черновик / в очереди / рендерится / готов / ошибка), длительность, дата создания.
**F-DASH-3.** Действия: открыть, переименовать, дублировать, удалить (soft delete с restore 30 дней), скачать MP4.
**F-DASH-4.** Фильтры: по статусу, по дате, поиск по названию.

### 4.5. Модуль «Лендинг» (F-LAND)
**F-LAND-1.** Статический лендинг: hero с видеодемо, блоки проблема/решение/тарифы/FAQ/отзывы, CTA-формы.
**F-LAND-2.** Публичная демо-страница: предгенерированный пример пайплайна с заранее созданным видео.
**F-LAND-3.** SEO: meta-теги, Open Graph, sitemap.xml, robots.txt, микроразметка Schema.org (Product, FAQPage).

### 4.6. Админ-панель (F-ADMIN)
**F-ADMIN-1.** Список пользователей + фильтры (тариф, дата регистрации, активность).
**F-ADMIN-2.** Просмотр проектов любого пользователя (debug).
**F-ADMIN-3.** Мониторинг очереди задач: pending / running / failed, кнопка «Перезапустить».
**F-ADMIN-4.** Управление промокодами.
**F-ADMIN-5.** Выгрузка аналитики в CSV: MAU, DAU, конверсия Free→Paid, средний чек.

---

## 5. Нефункциональные требования

### 5.1. Производительность
- Время рендера 10-минутного видео: **≤ 30 минут** (SLA); **≤ 10 минут** (target) при ненагруженной очереди.
- Latency API: p95 ≤ 500 мс на некомпьютные эндпоинты.
- Concurrency очереди: стартуем с 2 параллельных рендера, масштабируем через горизонтальные воркеры.

### 5.2. Надёжность
- Uptime: 99.0% для MVP (SLA для публичного запуска — 99.5%).
- Idempotency payment-webhooks (защита от дублирования списаний).
- Retry policy для внешних API (Kandinsky, ЮKassa): exponential backoff, до 3 попыток.
- Все фоновые задачи идемпотентны: можно безопасно перезапустить.

### 5.3. Безопасность
- HTTPS обязателен (Replit Deployments даёт сертификат автоматически).
- Хеширование паролей: bcrypt / argon2id.
- Секреты **только** в Replit Secrets (env), не в коде и не в git.
- CSRF-защита на state-changing POST (кроме API с JWT).
- CORS: whitelist доменов фронта.
- Rate limiting на все публичные эндпоинты (Redis-based).
- Upload-валидация: проверка MIME + магических байт, не только extension.
- Object Storage: подписанные URL с TTL 30 дней для шаринга, приватный доступ к исходным файлам.

### 5.4. Соответствие законодательству РФ
- ФЗ-152 «О персональных данных»: хранение ПДн российских пользователей только на серверах в РФ (Replit — проверить регион; если есть сомнения — хранить sensitive данные в Yandex Cloud PostgreSQL, а Replit использовать как compute).
- ФЗ-149: пользователь соглашается с правилами и политикой.
- Статьи 54-ФЗ: чеки через ЮKassa-фискализацию (autoreceipt).

### 5.5. Локализация
- **MVP: только русский язык.** Инфраструктура i18n закладывается (react-intl / next-intl), но в MVP активна одна локаль.

### 5.6. Доступность
- WCAG 2.1 Level A для основных пользовательских флоу.
- Адаптивность: desktop (основной), tablet, mobile (обязательно для лендинга; кабинет — desktop-first, mobile-friendly).

---

## 6. Архитектура системы

### 6.1. Высокоуровневая схема

```
┌─────────────────────┐
│  Клиент (браузер)   │
│  React SPA (Vite)   │
└──────────┬──────────┘
           │ HTTPS/REST
           ▼
┌─────────────────────────────────────────┐
│  Replit Deployment: API Gateway         │
│  FastAPI (Python 3.11)                  │
│  - Auth / Users / Billing               │
│  - Projects CRUD                        │
│  - Webhook handlers                     │
└─────┬──────────────┬────────────────────┘
      │              │
      ▼              ▼
┌──────────┐   ┌──────────────┐
│PostgreSQL│   │ Redis (queue │
│(Neon/    │   │ + cache +    │
│Supabase) │   │ rate limit)  │
└──────────┘   └──────┬───────┘
                      │
                      ▼
┌─────────────────────────────────────────┐
│  Replit Reserved VM: Worker Pool        │
│  Celery workers (Python)                │
│  - scriptgen_worker                     │
│  - imagegen_worker                      │
│  - tts_worker                           │
│  - render_worker (FFmpeg)               │
└──┬──────┬──────┬──────┬─────────────────┘
   │      │      │      │
   ▼      ▼      ▼      ▼
┌─────┐┌──────┐┌──────┐┌──────────────┐
│LLM  ││Kand- ││Silero││Replit Object │
│APIs ││insky ││ TTS  ││Storage       │
│     ││ API  ││local ││(видео, фото) │
└─────┘└──────┘└──────┘└──────────────┘
```

### 6.2. Компоненты

| Компонент | Роль | Где запускается |
|---|---|---|
| **Frontend SPA** | React + Vite, UI | Replit Static Deployment |
| **API Gateway** | FastAPI REST | Replit Autoscale Deployment |
| **Worker Pool** | Celery + FFmpeg | Replit Reserved VM (4 vCPU / 8 GB RAM минимум) |
| **PostgreSQL** | основная БД | Neon/Supabase (внешний managed DB) |
| **Redis** | очередь + кеш + rate limit | Upstash Redis (serverless) |
| **Object Storage** | файлы (фото, аудио, видео) | Replit Object Storage (S3-совместимое) |
| **Email** | транзакционная почта | Unisender / SMTP Яндекс 360 |

### 6.3. Почему такая схема на Replit
- **API Gateway как Autoscale Deployment** — нулевой scale-down, низкая стоимость при малом трафике.
- **Worker Pool как Reserved VM** — FFmpeg рендеринг долгий и CPU-тяжёлый; Autoscale не подходит, нужны гарантированные ресурсы.
- **PostgreSQL вовне (Neon)** — Replit-DB для продакшена слабоват по фичам (backup, read replicas); Neon даёт serverless PG с бесплатным тиром.
- **Redis вовне (Upstash)** — serverless Redis, оплата за операции.

---

## 7. Технологический стек

### 7.1. Frontend
| Технология | Версия | Роль |
|---|---|---|
| React | 18.x | UI |
| Vite | 5.x | Build |
| TypeScript | 5.x | Типизация |
| TailwindCSS | 3.x | Стилизация |
| shadcn/ui | latest | Компоненты |
| Zustand | 4.x | State management |
| TanStack Query | 5.x | Data fetching |
| React Hook Form + Zod | latest | Формы и валидация |
| React Router | 6.x | Роутинг |
| Plyr / Video.js | latest | Видео-плеер |

### 7.2. Backend
| Технология | Версия | Роль |
|---|---|---|
| Python | 3.11+ | Runtime |
| FastAPI | 0.110+ | Web framework |
| Uvicorn | latest | ASGI server |
| SQLAlchemy 2.0 + Alembic | latest | ORM + миграции |
| Pydantic v2 | latest | Валидация |
| Celery | 5.x | Очередь задач |
| Redis-py | latest | Клиент Redis |
| passlib[bcrypt] | latest | Хеширование паролей |
| python-jose | latest | JWT |
| boto3 | latest | S3/Object Storage клиент |
| httpx | latest | HTTP-клиент для внешних API |
| FFmpeg-python | latest | Обёртка над FFmpeg |
| Pillow | 10.x | Обработка изображений |
| pydub | latest | Обработка аудио |

### 7.3. Системные зависимости (installNixPackages в Replit)
```nix
pkgs.ffmpeg-full
pkgs.python311
pkgs.nodejs_20
pkgs.poppler_utils
```

### 7.4. Внешние сервисы
| Сервис | Назначение | Регион |
|---|---|---|
| **FusionBrain (Kandinsky 3.1 API)** | Генерация изображений | RU |
| **YandexGPT / GigaChat API** | Генерация сценариев (primary) | RU |
| **OpenAI GPT-4o API** | Fallback для сценариев (если YandexGPT недоступен) | не-RU |
| **Silero TTS** | Синтез речи (локально на воркере через torch) | локально |
| **ЮKassa** | Платежи | RU |
| **Unisender / Яндекс SMTP** | Email | RU |
| **Sentry** | Error tracking | self-host опционально |

---

## 8. API интеграции — детали

### 8.1. Kandinsky / FusionBrain
- Endpoint: `https://api-key.fusionbrain.ai/key/api/v1/text2image/run`
- Авторизация: `X-Key: Key <API_KEY>`, `X-Secret: Secret <SECRET>`.
- Параметры: `model_id`, `num_images=1`, `width=1920`, `height=1080`, `prompt`, `style` (KANDINSKY, UHD, ANIME, DEFAULT...), `negativePromptDecoder`.
- Ответ асинхронный: сначала `uuid`, затем polling `GET /status/{uuid}` до статуса `DONE`.
- Ожидаемое время генерации: 10–30 сек на изображение.
- Квоты API: учитывать в `imagegen_worker`, сразу разносить по rate-limit.
- Fallback: при длительной недоступности Kandinsky — переключаемся на Stable Diffusion локально на воркере (SDXL 1.0 через `diffusers` + CUDA, если доступен GPU; иначе CPU inference 1–2 мин/изобр.).

### 8.2. YandexGPT / GigaChat
- YandexGPT: `https://llm.api.cloud.yandex.net/foundationModels/v1/completion`, IAM-токен.
- GigaChat: `https://gigachat.devices.sberbank.ru/api/v1/chat/completions`, OAuth-токен.
- Промпт для генерации сценария (система):
  ```
  Ты — сценарист AI-видеопродакшна. Пользователь даёт тему, ты
  возвращаешь строго JSON со структурой:
  {
    "scenes": [
      { "title": "...", "narration": "...", "image_prompt": "...",
        "estimated_seconds": 30 },
      ...
    ]
  }
  Всего сцен: столько, чтобы сумма длительностей ≈ запрошенная.
  narration — закадровый текст, 1-3 предложения, разговорный стиль.
  image_prompt — на английском, для Kandinsky, 15-30 слов.
  ```
- JSON-mode строгий, ответ валидируется Pydantic-схемой. Если LLM вернул мусор — retry до 2 раз.

### 8.3. Silero TTS
- Модель: `silero_tts` (v4), языки: `ru`, голоса: `baya`, `kseniya`, `xenia`, `aidar`, `eugene`, `random`.
- Запуск: локально на воркере через `torch.hub.load('snakers4/silero-models', 'silero_tts')`.
- Sample rate: 48 kHz, выходной формат — WAV.
- Чанкование: текст длиннее 1000 символов нарезается по предложениям, дорожки склеиваются через pydub.
- Вес модели в памяти: ~500 МБ (грузим один раз при старте воркера).

### 8.4. ЮKassa
- SDK: `yookassa` (официальный Python SDK).
- Создание платежа: `Payment.create({ amount, confirmation: {type:'redirect', return_url}, capture: True, metadata:{user_id, purpose} })`.
- Webhook: `POST /api/billing/yookassa-webhook`. Проверка IP-белого списка + подпись. Обработка событий:
  - `payment.succeeded` → зачисление токенов / активация подписки.
  - `payment.canceled`, `payment.failed`, `refund.succeeded` → соответствующая логика.
- Рекуррентные: флаг `save_payment_method: True` на первом платеже, далее charge через `Payment.create` с `payment_method_id`.
- Автоматический чек: объект `receipt` с товарной позицией (наименование, количество, цена, НДС 20% / без НДС на USN).

### 8.5. FFmpeg (сборка видео)
- Используется `ffmpeg-python` как обёртка.
- Типовая команда для сцены с Ken Burns (zoompan):
  ```bash
  ffmpeg -loop 1 -i scene01.jpg -t 6 \
    -vf "zoompan=z='min(zoom+0.0015,1.5)':d=150:s=1920x1080, fade=in:0:15,fade=out:135:15" \
    -c:v libx264 -preset medium -crf 20 -pix_fmt yuv420p scene01.mp4
  ```
- Субтитры: генерируются как SRT из `narration`+таймингов, вшиваются фильтром `subtitles=`.
- Аудио-микширование: голос + фоновая музыка с ducking (`sidechaincompress`).
- Финальная сборка: concat demuxer + overlay субтитров + merge audio.
- Кодек: H.264 + AAC, контейнер MP4, средний битрейт 4–6 Мбит/с для 1080p.

---

## 9. Модель данных (основные таблицы)

```sql
-- Пользователи
users (
  id UUID PK,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT,  -- NULL если oauth-only
  oauth_provider TEXT,  -- 'vk' | 'yandex' | NULL
  oauth_id TEXT,
  name TEXT,
  avatar_url TEXT,
  phone TEXT,
  role TEXT DEFAULT 'user',  -- 'user' | 'admin'
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ  -- soft delete
);

-- Тарифы и подписки
plans (
  id TEXT PK,  -- 'free' | 'standard' | 'pro'
  name TEXT,
  price_month_rub INT,
  price_year_rub INT,
  videos_per_month INT,
  max_duration_min INT,
  features JSONB  -- флаги: watermark, voice_upload, shorts, api, ...
);

subscriptions (
  id UUID PK,
  user_id UUID FK → users,
  plan_id TEXT FK → plans,
  status TEXT,  -- 'active' | 'canceled' | 'expired' | 'past_due'
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  yookassa_payment_method_id TEXT,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ
);

-- Баланс токенов и движения
token_balances (
  user_id UUID PK FK → users,
  balance INT DEFAULT 0,
  updated_at TIMESTAMPTZ
);

token_transactions (
  id UUID PK,
  user_id UUID FK,
  delta INT,  -- +положительное = пополнение, -отрицательное = списание
  reason TEXT,  -- 'purchase' | 'render' | 'refund' | 'promo' | 'admin_adjust'
  ref_id UUID,  -- ссылка на payment/project
  created_at TIMESTAMPTZ
);

-- Платежи
payments (
  id UUID PK,
  user_id UUID FK,
  yookassa_payment_id TEXT UNIQUE,
  amount_rub NUMERIC(10,2),
  status TEXT,  -- 'pending' | 'succeeded' | 'canceled' | 'refunded'
  purpose TEXT,  -- 'subscription' | 'tokens_100' | 'tokens_500' | 'tokens_2000'
  metadata JSONB,
  created_at TIMESTAMPTZ,
  succeeded_at TIMESTAMPTZ
);

-- Проекты и сцены
projects (
  id UUID PK,
  user_id UUID FK,
  title TEXT,
  topic_description TEXT,
  target_duration_sec INT,
  visual_style TEXT,
  voice_id TEXT,
  status TEXT,  -- 'draft' | 'script_ready' | 'images_ready' | 'audio_ready' |
                -- 'rendering' | 'done' | 'failed'
  current_step SMALLINT,  -- 1..6
  final_video_url TEXT,
  thumbnail_url TEXT,
  duration_sec INT,
  error_message TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

scenes (
  id UUID PK,
  project_id UUID FK → projects ON DELETE CASCADE,
  order_index SMALLINT,
  title TEXT,
  narration TEXT,
  image_prompt TEXT,
  image_url TEXT,
  audio_url TEXT,
  duration_sec NUMERIC(6,2),
  animation_type TEXT,
  transition_type TEXT,
  updated_at TIMESTAMPTZ
);

-- Очередь задач (параллельно с Celery для аудита)
render_jobs (
  id UUID PK,
  project_id UUID FK,
  job_type TEXT,  -- 'script' | 'image' | 'tts' | 'render' | 'full_pipeline'
  celery_task_id TEXT,
  status TEXT,
  progress SMALLINT,  -- 0..100
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  retry_count SMALLINT DEFAULT 0
);

-- Промокоды
promo_codes (
  code TEXT PK,
  discount_type TEXT,  -- 'percent' | 'fixed' | 'tokens'
  discount_value INT,
  max_uses INT,
  used_count INT DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE
);

-- Логи действий пользователя (audit)
audit_log (
  id BIGSERIAL PK,
  user_id UUID,
  action TEXT,
  entity_type TEXT,
  entity_id UUID,
  metadata JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMPTZ
);
```

Индексы: `projects(user_id, created_at DESC)`, `scenes(project_id, order_index)`, `render_jobs(status, started_at)`, `token_transactions(user_id, created_at DESC)`, `audit_log(user_id, created_at DESC)`.

---

## 10. REST API (основные эндпоинты)

Все эндпоинты префиксуются `/api/v1/`. Ответы — JSON, ошибки — `{code, message, details}` + корректные HTTP-статусы.

### 10.1. Auth
| Метод | Путь | Описание |
|---|---|---|
| POST | `/auth/register` | Регистрация email+password |
| POST | `/auth/login` | Вход |
| POST | `/auth/refresh` | Обновление access-токена |
| POST | `/auth/logout` | Выход (инвалидация refresh) |
| GET | `/auth/oauth/vk/url` | Получить URL OAuth VK |
| GET | `/auth/oauth/vk/callback` | Колбэк VK |
| GET | `/auth/oauth/yandex/url` | OAuth Yandex |
| GET | `/auth/oauth/yandex/callback` | Колбэк Yandex |
| POST | `/auth/password/reset-request` | Запрос сброса пароля |
| POST | `/auth/password/reset` | Подтверждение сброса |

### 10.2. Profile & Billing
| Метод | Путь | Описание |
|---|---|---|
| GET | `/me` | Профиль + баланс + подписка |
| PATCH | `/me` | Изменить имя/аватар/телефон |
| GET | `/me/usage` | Квоты: видео/токены осталось |
| GET | `/plans` | Список тарифов |
| POST | `/billing/subscribe` | Создать платёж на подписку (возвращает confirmation_url) |
| POST | `/billing/tokens/purchase` | Купить пакет токенов |
| POST | `/billing/subscription/cancel` | Отменить подписку (на конце периода) |
| POST | `/billing/yookassa-webhook` | Webhook от ЮKassa |
| GET | `/billing/payments` | История платежей |

### 10.3. Projects
| Метод | Путь | Описание |
|---|---|---|
| GET | `/projects` | Список проектов пользователя |
| POST | `/projects` | Создать черновик (шаг 1) |
| GET | `/projects/{id}` | Получить проект со сценами |
| PATCH | `/projects/{id}` | Обновить метаданные |
| DELETE | `/projects/{id}` | Удалить (soft) |
| POST | `/projects/{id}/generate-script` | Запустить LLM-генерацию сценария |
| POST | `/projects/{id}/regenerate-script` | Перегенерировать |
| PATCH | `/projects/{id}/scenes/{scene_id}` | Обновить сцену |
| POST | `/projects/{id}/scenes` | Добавить сцену |
| DELETE | `/projects/{id}/scenes/{scene_id}` | Удалить сцену |
| POST | `/projects/{id}/generate-images` | Запустить Kandinsky для всех сцен |
| POST | `/projects/{id}/scenes/{scene_id}/regenerate-image` | Перегенерировать одно изображение |
| POST | `/projects/{id}/scenes/{scene_id}/upload-image` | Загрузить своё |
| POST | `/projects/{id}/generate-audio` | Запустить TTS |
| POST | `/projects/{id}/upload-voice` | Загрузить свой голос |
| POST | `/projects/{id}/render` | Запустить финальный рендер |
| GET | `/projects/{id}/progress` | Прогресс рендеринга (может быть SSE) |
| GET | `/projects/{id}/download` | Редирект на подписанный URL MP4 |

### 10.4. Admin
| Метод | Путь | Описание |
|---|---|---|
| GET | `/admin/users` | Список |
| GET | `/admin/users/{id}` | Детали |
| PATCH | `/admin/users/{id}` | Смена тарифа/роли вручную |
| GET | `/admin/jobs` | Очередь задач |
| POST | `/admin/jobs/{id}/retry` | Перезапуск |
| GET | `/admin/analytics` | Метрики |

---

## 11. Очереди задач (Celery)

### 11.1. Очереди
- `queue:script` — генерация сценариев (I/O-bound, concurrency 4).
- `queue:image` — Kandinsky (I/O-bound, concurrency 4).
- `queue:tts` — Silero TTS (CPU-bound, concurrency 2).
- `queue:render` — FFmpeg-рендеринг (CPU-bound, concurrency 1–2 на воркер).

### 11.2. Задачи
```python
@celery_app.task(bind=True, max_retries=2)
def generate_script_task(self, project_id: str): ...

@celery_app.task(bind=True, max_retries=3)
def generate_image_task(self, scene_id: str): ...

@celery_app.task(bind=True, max_retries=1)
def generate_tts_task(self, project_id: str): ...

@celery_app.task(bind=True, max_retries=0)
def render_video_task(self, project_id: str): ...

# Оркестратор полного пайплайна
@celery_app.task
def full_pipeline(project_id: str):
    chain(
        generate_script_task.s(project_id),
        group(*[generate_image_task.s(s.id) for s in scenes]),
        generate_tts_task.s(project_id),
        render_video_task.s(project_id)
    ).apply_async()
```

### 11.3. Прогресс
- Каждая задача пишет `progress` (0..100) в Redis (`project:{id}:progress`) и в `render_jobs.progress`.
- Фронт подписывается через Server-Sent Events `/projects/{id}/progress` или polling 2 сек.

---

## 12. Хранилище файлов

### 12.1. Структура бакета (Replit Object Storage)
```
neuroclip/
  users/{user_id}/
    avatars/{uuid}.jpg
    voice_samples/{project_id}/{uuid}.wav
  projects/{project_id}/
    images/scene_{order}.jpg
    audio/scene_{order}.wav
    audio/full.wav
    subtitles/full.srt
    output/final.mp4
    output/thumbnail.jpg
  assets/music/{id}.mp3  -- пресеты фоновой музыки
```

### 12.2. Правила доступа
- Все файлы приватны по умолчанию.
- Отдача через подписанные URL с TTL:
  - Превью, аудио, изображения при рендеринге — TTL 1 час.
  - Финальные MP4 для шаринга — TTL 30 дней.
- Загрузка с клиента: **pre-signed PUT** (прямая заливка в Storage, минуя API gateway) — для аватаров и своих файлов.

---

## 13. Frontend — структура и маршруты

### 13.1. Страницы
| Путь | Компонент | Описание |
|---|---|---|
| `/` | `LandingPage` | Публичный лендинг |
| `/demo` | `DemoPage` | Демо-видео |
| `/pricing` | `PricingPage` | Тарифы |
| `/login` | `LoginPage` | |
| `/register` | `RegisterPage` | |
| `/forgot-password` | `ForgotPasswordPage` | |
| `/dashboard` | `DashboardPage` | Мои проекты |
| `/projects/new` | `WizardPage` | Создание проекта (6 шагов через state) |
| `/projects/:id` | `WizardPage` | Редактирование проекта |
| `/projects/:id/watch` | `WatchPage` | Просмотр готового видео |
| `/settings` | `SettingsPage` | Профиль |
| `/billing` | `BillingPage` | Тариф и платежи |
| `/admin/*` | `AdminApp` | Админка (role=admin) |

### 13.2. Структура папок
```
frontend/src/
  api/                # http-клиенты, схемы запросов
  components/
    ui/               # shadcn/ui атомы
    wizard/           # Step1Topic, Step2Script, Step3Images, ...
    common/           # Header, Sidebar, Modal, Toast
  features/
    auth/
    projects/
    billing/
    admin/
  hooks/
  lib/                # utils, formatters, zod schemas
  pages/
  router/
  store/              # zustand stores
  styles/
  App.tsx
  main.tsx
```

---

## 14. Структура backend-проекта
```
backend/
  app/
    api/
      v1/
        auth.py
        users.py
        projects.py
        scenes.py
        billing.py
        admin.py
        webhooks.py
    core/
      config.py           # Pydantic Settings, env
      security.py         # JWT, password hashing
      deps.py             # FastAPI dependencies
      exceptions.py
    db/
      base.py
      session.py
      models/
        user.py
        project.py
        scene.py
        subscription.py
        payment.py
        token.py
      migrations/         # Alembic
    services/
      auth_service.py
      billing_service.py
      project_service.py
      storage_service.py  # Object Storage wrapper
      llm_service.py      # YandexGPT/GigaChat клиент
      image_service.py    # Kandinsky
      tts_service.py      # Silero
      render_service.py   # FFmpeg orchestration
      email_service.py
    workers/
      celery_app.py
      tasks/
        script.py
        image.py
        tts.py
        render.py
    schemas/              # Pydantic DTO
    main.py               # FastAPI entrypoint
  tests/
    unit/
    integration/
    e2e/
  alembic.ini
  pyproject.toml
  Dockerfile             # на случай переноса
  .replit                # конфиг Replit
  replit.nix             # системные пакеты
```

---

## 15. Replit-специфика

### 15.1. Конфигурация `.replit`
```toml
run = "bash run.sh"
entrypoint = "backend/app/main.py"
modules = ["python-3.11", "nodejs-20"]

[nix]
channel = "stable-23_11"

[deployment]
run = ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port $PORT"]
deploymentTarget = "autoscale"

[[ports]]
localPort = 8000
externalPort = 80
```

### 15.2. Replit Secrets (env)
Обязательный набор переменных окружения:
```
# Database
DATABASE_URL=postgresql://...neon.tech/neuroclip
REDIS_URL=rediss://...upstash.io

# Auth
JWT_SECRET=...
JWT_REFRESH_SECRET=...
VK_CLIENT_ID=...
VK_CLIENT_SECRET=...
YANDEX_CLIENT_ID=...
YANDEX_CLIENT_SECRET=...

# AI
KANDINSKY_API_KEY=...
KANDINSKY_SECRET=...
YANDEX_GPT_API_KEY=...
YANDEX_FOLDER_ID=...
GIGACHAT_CLIENT_ID=...
GIGACHAT_CLIENT_SECRET=...
OPENAI_API_KEY=...   # fallback

# Billing
YOOKASSA_SHOP_ID=...
YOOKASSA_SECRET_KEY=...
YOOKASSA_WEBHOOK_SECRET=...

# Storage
OBJECT_STORAGE_BUCKET=neuroclip
OBJECT_STORAGE_ACCESS_KEY=...
OBJECT_STORAGE_SECRET_KEY=...
OBJECT_STORAGE_ENDPOINT=...

# Email
SMTP_HOST=smtp.yandex.ru
SMTP_USER=...
SMTP_PASSWORD=...

# Misc
APP_BASE_URL=https://neuroclip.replit.app
SENTRY_DSN=...
ENV=production
```

### 15.3. Деплой
1. **Frontend** → Static Deployment (build `npm run build`, папка `dist/`).
2. **API** → Autoscale Deployment (масштабируется 0→N), min 0.
3. **Workers** → Reserved VM (4 vCPU / 8 GB). Один процесс `celery worker -Q script,image,tts,render -c 2`.
4. **Cron** → Scheduled Deployments: ежедневная очистка старых файлов (>30 дней в Object Storage), начисление месячной квоты бесплатным пользователям.

### 15.4. Ограничения Replit, которые важны
- **Autoscale-инстансы не имеют persistent storage** — все файлы только в Object Storage/БД.
- **Reserved VM не мигрирует автоматически** — перезапуск приводит к прерыванию рендеринга. Решение: задачи Celery идемпотентны, при рестарте checkpoint-ятся.
- **Лимит трафика на Autoscale** — следить за `egress`; файлы отдавать напрямую из Object Storage.
- **FFmpeg CPU-heavy** — если 2 параллельных 10-мин рендера на 4 vCPU тормозят, масштабируемся вертикально до 8 vCPU либо горизонтально (доп. Reserved VM).
- **Silero TTS в памяти** — ~500 МБ модель + ~1–2 ГБ на инференс. На 8 ГБ RAM это норма, но только 1 параллельная TTS-задача. Для Pro/масштаба — выносим TTS в отдельный воркер.

---

## 16. Этапы разработки (дорожная карта MVP)

### Спринт 0 (1 неделя) — подготовка
- Репозиторий, базовый CI на Replit (lint, tests).
- Регистрация API-ключей (Kandinsky, YandexGPT, ЮKassa test-mode).
- Настройка Neon + Upstash + Object Storage.
- Скелеты frontend/backend проектов.

### Спринт 1 (2 недели) — Auth + Профиль
- Регистрация/логин email+password, JWT.
- OAuth VK и Yandex.
- Страница профиля, загрузка аватара.
- Базовый layout: Header, Sidebar, Dashboard (пустой).

### Спринт 2 (2 недели) — Проекты CRUD + Мастер шаги 1–2
- БД-модели, миграции.
- Dashboard с проектами.
- Шаг 1: форма темы.
- Шаг 2: интеграция с YandexGPT, генерация сценария, UI редактирования сцен.

### Спринт 3 (2 недели) — Изображения
- Шаг 3: интеграция Kandinsky, генерация по сценам.
- Object Storage: загрузка/хранение/отдача.
- Регенерация, загрузка своего.

### Спринт 4 (2 недели) — TTS + Рендер
- Шаг 4: выбор анимаций (пока без превью).
- Шаг 5: Silero TTS, выбор голоса, фоновая музыка.
- Шаг 6: FFmpeg pipeline, Ken Burns, субтитры.
- Celery + Redis, очереди задач.
- SSE-прогресс.

### Спринт 5 (2 недели) — Биллинг
- ЮKassa интеграция (одноразовые + подписки).
- Тарифы, лимиты, токены.
- Страница «Тариф и платежи», история.
- Webhook и автоначисления.

### Спринт 6 (1 неделя) — Лендинг + Админка
- Публичный лендинг, демо.
- Админ-панель минимальная.
- Email-уведомления.

### Спринт 7 (1 неделя) — QA + Запуск беты
- Интеграционные тесты, нагрузочные тесты.
- Исправление критических багов.
- Закрытая бета: 50 пользователей, промокод, фидбэк-форма.

**Итого: ~11 недель до закрытой беты.**

---

## 17. Критерии приёмки MVP

1. ✅ Пользователь регистрируется через email или OAuth VK, подтверждает email.
2. ✅ Создаёт проект, описывает тему, получает AI-сгенерированный сценарий за ≤ 30 сек.
3. ✅ Правит сцены, перегенерирует отдельные, сохраняет.
4. ✅ Получает изображения от Kandinsky по всем сценам за ≤ 5 мин.
5. ✅ Получает озвучку Silero TTS за ≤ 3 мин.
6. ✅ Запускает финальный рендер, получает MP4 1080p за ≤ 15 мин на 10-минутное видео.
7. ✅ Скачивает MP4 или получает ссылку на шаринг.
8. ✅ Free-пользователь упирается в лимит 2 видео/неделя.
9. ✅ Покупает пакет 100 токенов через ЮKassa тестовым способом, баланс зачисляется.
10. ✅ Оформляет Standard-подписку, водяной знак снимается, лимит поднимается.
11. ✅ Админ видит очередь задач и может перезапустить упавшую.
12. ✅ Все UI-флоу проходятся на desktop (min 1280×720) без ошибок; лендинг адаптивен до 375×667.
13. ✅ 0 критических уязвимостей в OWASP Top-10 (проверено вручную или Snyk-сканером).

---

## 18. Риски и ограничения

| Риск | Вероятность | Влияние | Митигация |
|---|---|---|---|
| Kandinsky API даёт плохое качество | Средняя | Высокое | Fallback на Stable Diffusion + возможность загрузить своё фото |
| FFmpeg-рендер медленный на Replit Reserved VM | Средняя | Высокое | Горизонтальное масштабирование воркеров; оптимизация preset `veryfast`; для длинных видео — chunked рендеринг со сборкой через concat |
| Silero TTS звучит слишком «роботизированно» | Высокая | Среднее | Pro-тариф с ElevenLabs (post-MVP); UX-опция «загрузить свой голос» |
| ЮKassa откажет в подключении студенческому стартапу | Низкая | Высокое | Параллельно оформляем ИП/ООО; fallback: CloudPayments, Tinkoff-Эквайринг |
| Replit Deployments падает / региональная недоступность | Низкая | Среднее | Подготовлены Dockerfile и docker-compose для переноса на Yandex Cloud/Timeweb Cloud за 1–2 дня |
| YandexGPT генерирует нерелевантные сценарии | Средняя | Среднее | Fine-tuning промптов, few-shot примеры, fallback GPT-4 |
| Пользователи загружают противоправный контент | Средняя | Высокое | Модерация промптов (чёрный список), модерация финальных видео перед публичным шарингом, отчётные возможности Kandinsky (он сам модерирует) |
| ФЗ-152 / ПДн — данные на не-РФ серверах | Средняя | Критическое | БД пользователей перенести на РФ-хостинг (Yandex Cloud Managed PostgreSQL), Replit использовать только как compute |

---

## 19. Метрики успеха MVP

| Метрика | Целевое значение (3 мес после запуска) |
|---|---|
| Зарегистрировано пользователей | 500 |
| Создано проектов | 1500 |
| Завершено рендеров | 1200 |
| Конверсия Free → Paid | ≥ 5% |
| ARPU (по платным) | ≥ 1000 ₽/мес |
| MRR | ≥ 25 000 ₽ |
| Churn rate | ≤ 10% мес |
| NPS | ≥ 40 |
| Среднее время рендера 10-мин видео | ≤ 10 мин |
| Uptime | ≥ 99.0% |

---

## 20. Что передать подрядчику / AI-ассистенту Replit (Ghostwriter/Agent)

При инициализации проекта на Replit:
1. Загрузить этот документ в репозиторий как `DOCS/TZ.md`.
2. Создать `README.md` со ссылкой на ТЗ и quick-start.
3. Создать Replit-шаблон с двумя Deployment-ами (Autoscale API + Reserved VM worker) и одним Static (frontend).
4. Зарегистрировать все env из раздела 15.2 в Replit Secrets.
5. Запустить Alembic-миграции на Neon.
6. Начать с Спринта 0 по разделу 16.

---

**Конец документа.**
Дальнейшие уточнения, дизайн-макеты и копирайтинг — отдельными документами (`DOCS/DESIGN.md`, `DOCS/COPY.md`).
