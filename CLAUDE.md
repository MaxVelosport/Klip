# НейроКлип — контекст для Claude

## Стек
- **Монорепо**: pnpm workspaces
- **Backend**: `artifacts/api-server` — Express 5, TypeScript, ESM
- **Frontend**: `artifacts/neuroclip` — Vite, React 18, TanStack Query v5, shadcn/ui
- **БД**: Supabase self-hosted (`https://superbase.aiinvestor360.ru`)
- **ORM**: Drizzle убран из runtime → `@supabase/supabase-js` + 6 Postgres RPC функций
- **Типы**: `lib/db/src/types.ts` — snake_case интерфейсы для всех 14 таблиц (User, Session, Project, Scene и др.)
- **Drizzle-схемы**: `lib/db/src/schema/*.ts` — только как референс, в runtime не используются
- **Supabase клиент**: `lib/db/src/sb-client.ts` → `sbFrom()`, `sbRpc()`, `TABLE` map
- **Миграции**: `scripts/src/apply-migrations.ts` → `/pg/query` endpoint
- **LLM провайдеры**: DeepSeek (primary) + Claude (fallback) + GigaChat (stub)
  - Модуль: `artifacts/api-server/src/lib/llm/` (types, deepseek, claude, gigachat, factory)
  - Выбор через env `LLM_PROVIDER`, fallback через `LLM_FALLBACK`
  - Прокси `HTTPS_PROXY` используется ТОЛЬКО для Anthropic (через `undici` ProxyAgent)
- **Script generator**: `artifacts/api-server/src/lib/script-generator.ts` — Zod-валидация, retry x3
- **Script editor**: `artifacts/api-server/src/lib/script-editor.ts` — LLM-правки сценария через чат
- **image_prompt**: хранится в DB как JSON `{"ru":"...","en":"..."}` в TEXT поле; парсить через `parseImagePrompt()`, сериализовать через `serializeImagePrompt()` из `lib/db/src/types.ts`
- **Image провайдеры**: `artifacts/api-server/src/lib/images/` (types, factory, kandinsky-gigachat, nano-banana-flash/pro, flux-schnell)
  - Primary: `kandinsky-gigachat` (GigaChat OAuth2 + Kandinsky, бесплатно, Россия)
  - Secondary: `nano-banana-flash` (Google Imagen, нужен billing)
  - Stubs: `nano-banana-pro`, `flux-schnell`
  - Выбор через env `IMAGE_PROVIDER`, fallback через `IMAGE_FALLBACK_PROVIDER`
- **Storage**: `/home/deploy/projects/neuroclip/storage/images/{project_id}/{scene_id}.jpg`
  - URL: `https://neuroklip.ru/storage/images/{project_id}/{scene_id}.jpg`
  - Nginx раздаёт с `expires 7d` и `Cache-Control: public, immutable`
  - `image-storage.ts` — `saveImage()`, `imageSeedFromProjectId()`
- **TTS провайдеры**: `artifacts/api-server/src/lib/tts/` (types, factory, salute-speech, silero, yandex-speechkit, elevenlabs)
  - Primary: `silero` (локальный Python, бесплатно, ~5-10s/сцена, требует Python venv + модель)
  - Secondary: `salute-speech` (SberCloud, бесплатно 1M chars/mo, требует `SALUTESPEECH_AUTH_KEY` с SALUTE_SPEECH_PERS scope — отдельный от GigaChat!)
  - Stubs: `yandex-speechkit`, `elevenlabs`
  - Выбор через env `TTS_PROVIDER`, fallback через `TTS_FALLBACK`
  - Silero: venv в `/home/deploy/projects/neuroclip/silero/venv/`, модель `models/v4_ru.pt` (39MB)
  - Audio storage: `/home/deploy/projects/neuroclip/storage/audio/{project_id}/{scene_id}.mp3`
  - `audio-storage.ts` — `saveAudio()` → возвращает URL `/storage/audio/...`
  - nginx: `generate-audio` location с `proxy_read_timeout 120s`
- **Video renderer**: `artifacts/api-server/src/lib/video/` (types, ffmpeg-renderer, ken-burns, transitions, subtitles, factory)
  - Единственный рендерер: `FFmpegRenderer` — ffmpeg subprocess
  - Ken Burns: zoompan filter, 6 эффектов (zoom-in/out + 4 pan directions), случайный выбор по индексу сцены
  - Переходы: xfade (fade/dissolve/wipeleft/wiperight/slideleft/slideright) + acrossfade аудио, 0.5s
  - Субтитры: SRT генерация + libass subtitles filter
  - Качество: H.264 + AAC, 2500k, 30fps, 1920x1080 (16:9), 1080x1920 (9:16), 1080x1080 (1:1)
  - Video storage: `/home/deploy/projects/neuroclip/storage/videos/{project_id}.mp4`
  - URL: `https://neuroklip.ru/storage/videos/{project_id}.mp4`
  - nginx раздаёт через существующий `/storage/` location с 7d cache
  - Рендер async (fire-and-forget в startRenderJob), статус через Neyroclip_render_jobs
  - Время рендера: ~9s/сцена × N сцен + 17s concat + 17s subtitles ≈ 50-120s суммарно

## Переменные окружения (`.env` в корне)
```
NODE_ENV=production
PORT=8080
SUPABASE_URL=https://superbase.aiinvestor360.ru
SUPABASE_SERVICE_KEY=<service_role key>
SUPABASE_ANON_KEY=<anon key>
ALLOWED_ORIGINS=http://194.156.117.132,http://194.156.117.132:8080
BASE_PATH=/
```

## Префиксы таблиц
Все 14 таблиц: `Neyroclip_*` (с заглавной N, shared БД с другими проектами)

## RPC функции (6)

Все функции: `SECURITY DEFINER SET search_path = public` + `GRANT EXECUTE TO anon, authenticated, service_role`.
После `CREATE OR REPLACE` всегда: `NOTIFY pgrst, 'reload schema';`

| Функция | Назначение |
|---|---|
| `neyroclip_register_user(email, name, password_hash)` | Атомарная регистрация + 200 токенов на баланс. Ошибка: `EMAIL_TAKEN` |
| `neyroclip_spend_tokens(user_id, amount, ref_id, reason)` | Атомарное списание с проверкой баланса. Ошибки: `INSUFFICIENT_TOKENS`, `INVALID_AMOUNT` |
| `neyroclip_refund_tokens(user_id, amount, ref_id, reason)` | Возврат токенов с idempotency по `(user_id, ref_id, reason)`. Ошибки: `ALREADY_REFUNDED`, `USER_NOT_FOUND` |
| `neyroclip_add_tokens(user_id, delta, reason, ref_id?)` | Admin/billing: начислить произвольное кол-во токенов. Ошибка: `USER_NOT_FOUND` |
| `neyroclip_use_promo_code(code, user_id)` | Атомарное применение промокода: `FOR UPDATE` lock, per-user idempotency, проверки срока/лимита. Ошибки: `PROMO_NOT_FOUND`, `PROMO_EXPIRED`, `PROMO_LIMIT_REACHED`, `PROMO_ALREADY_USED`, `PROMO_NOT_STARTED` |
| `neyroclip_admin_analytics()` | Все dashboard-метрики одним вызовом (users, projects, revenue, MAU/DAU, conversion) |

## Важные ловушки

### 1. Supabase self-hosted: нет прямого Postgres-доступа снаружи
Supavisor (порты 5432/6543) требует tenant ID в username (`postgres.TENANT_ID`).
Прямой psql/Drizzle push не работают. Tenant ID = `default`, но Supavisor всё равно не пускает.
**Решение**: DDL через `/pg/query` endpoint (Community Edition), CRUD через REST API.

### 2. /pg/query требует оба заголовка
```
apikey: <service_key>
Authorization: Bearer <service_key>
```
Без `apikey` → "No API key found in request". Без `Authorization` → 401.

### 3. PostgREST schema cache
После `CREATE FUNCTION` или `CREATE TABLE` обязательно:
```sql
NOTIFY pgrst, 'reload schema';
```
Без reload PostgREST не видит новые функции (PGRST202).

### 4. GRANT EXECUTE на каждую функцию
```sql
GRANT EXECUTE ON FUNCTION my_fn(...) TO anon, authenticated, service_role;
```
Без этого PostgREST не вызовет функцию даже после reload.

### 5. SECURITY DEFINER + SET search_path = public
```sql
CREATE FUNCTION ... SECURITY DEFINER SET search_path = public AS $$...$$;
```
Без `SET search_path = public` функция не находит таблицы по имени.

### 6. Таблицы создавать ТОЛЬКО через /pg/query
Создание через Supabase Studio SQL Editor оставляет таблицы без нужных
прав для PostgREST — они появляются в `pg_tables`, но `SELECT` через REST
падает с 404. `/pg/query` применяет правильные дефолтные права.

### 7. HEAD с count:exact не проверяет ошибки надёжно
`c.from('table').select('*', { count:'exact', head:true })` может вернуть
`{ error: null, count: null }` даже если таблица не существует.
Для верификации использовать полный `.select('*').limit(1)`.

### 8. preinstall hook блокирует pnpm add
`pnpm --filter @workspace/foo add pkg` падает с preinstall.
**Обход**: добавить в package.json вручную, затем `pnpm install --ignore-scripts`.

### 9. tsx в scripts
tsx находится в `scripts/node_modules/.bin/tsx`, не в корне.
Запуск: `scripts/node_modules/.bin/tsx --env-file=.env scripts/src/file.ts`
В ESM-пакете (`"type":"module"`) нет `__dirname` — использовать:
```ts
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
```

## Статус миграции (Этап 3)
Файлы для переписывания с Drizzle на supabase-js:

**Уровень 1** (простые):
- [ ] `lib/db/src/cost.ts` — только type imports
- [ ] `routes/plans.ts` — 1 SELECT
- [ ] `routes/users-helpers.ts` — 2 SELECT
- [ ] `routes/dashboard.ts` — несколько SELECT
- [ ] `routes/users.ts` — CRUD профиля

**Уровень 2** (средние):
- [ ] `routes/scenes.ts` — 4 ops + 2 упрощённых "транзакции"
- [ ] `routes/projects.ts` — 7 ops
- [ ] `routes/script-chat.ts` — 4 ops, большой файл

**Уровень 3** (критичные):
- [x] `lib/session.ts` — Session + Pick<User> типы, no any
- [x] `routes/auth.ts` — sbRpc typed, User cast, EMAIL_TAKEN → 400
- [x] `routes/billing.ts` — neyroclip_use_promo_code RPC, PROMO_* ошибки → 400
- [x] `routes/pipeline.ts` — serializeProject из projects.ts, ALREADY_REFUNDED handled

**Уровень 4** (завершение):
- [x] `routes/admin.ts` — analytics → RPC neyroclip_admin_analytics
- [x] `lib/seed.ts` — upsert plans через sbFrom

## Запуск миграций
```bash
scripts/node_modules/.bin/tsx --env-file=.env scripts/src/apply-migrations.ts
```

## Build
```bash
pnpm --filter @workspace/api-server run build
PORT=20274 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/neuroclip run build
```

## Ловушки — Этап 5 (LLM)

### 10. LLM JSON mode: DeepSeek vs Claude
DeepSeek поддерживает `response_format: { type: "json_object" }` нативно.
Claude — только через system prompt "Respond only with valid JSON. Do not include markdown code blocks."
Эмуляция в `claude.ts` добавляет hint в systemPrompt автоматически при `jsonMode: true`.

### 11. undici ProxyAgent — ТОЛЬКО для Anthropic
`ProxyAgent` из `undici` используется ТОЛЬКО в `claude.ts` для запросов к `api.anthropic.com`.
DeepSeek (`deepseek.ts`) использует нативный `fetch` без прокси — прямой доступ из РФ работает.
`HTTPS_PROXY` в env существует, но Node.js native fetch его НЕ подхватывает автоматически.

### 12. После изменений в lib/db пересобрать declarations
`pnpm --filter @workspace/db exec tsc -p tsconfig.json` — обновляет `lib/db/dist/*.d.ts`.
Без этого api-server typecheck не увидит новые типы/функции из `lib/db/src/types.ts`.

### 14. GigaChat OAuth — singleton token + rate limits
Токен живёт ~30 минут, кэшируется в модуле. Несколько параллельных запросов могут триггерить 429.
Решение: `tokenFetchInFlight` — singleton promise на получение токена (dedup).
Параллельная генерация картинок для GigaChat ЗАПРЕЩЕНА — используй sequential с задержкой 2s.
Количество бесплатных запросов ограничено (примерно 50-100 изображений в сутки на аккаунт).

### 15. GigaChat TLS — Russian Trusted CA
`ngw.devices.sberbank.ru` и `gigachat.devices.sberbank.ru` используют Sber CA.
Используем `rejectUnauthorized: false` в undici Agent — TODO: добавить CA после питча.
GigaChat доступен напрямую с российских серверов, прокси не нужен.

### 16. GigaChat image ID — в атрибуте src, не fuse
Ответ GigaChat: `<img src="UUID" fuse="true"/>`. UUID — в `src`, `fuse` — просто флаг.
Правильный regex: `/<img[^>]+src="([^"]+)"/`.

### 17. Google AI API (nano-banana-flash) — нужен billing
Ключ `AIzaSy...` работает для Gemini text (quota limited), но Imagen 3 (predict endpoint)
требует Google Cloud billing. 404 на `imagen-3.0-fast-generate-001` → BILLING_REQUIRED.
Для production: создать Google Cloud project с enabled Vertex AI API.

### 18. nginx /storage/ — chmod o+rX обязателен
```bash
chmod -R o+rX /home/deploy/projects/neuroclip/storage
```
Nginx worker (www-data) должен читать файлы. После добавления новых поддиректорий
пересматривать права. image-storage.ts автоматически ставит 0o644 на каждый файл.

### 13. image_prompt в Neyroclip_scenes — JSON в TEXT
Хранится как `{"ru":"...","en":"..."}` в TEXT поле.
Парсить: `parseImagePrompt(raw)` → `{ ru, en }` (graceful fallback для старых plain-string данных).
Сериализовать: `serializeImagePrompt(ru, en)` → JSON string.
`serializeScene()` в `projects.ts` автоматически парсит и добавляет `imagePromptEn` в ответ.

### 19. ffmpeg zoompan — scale input BEFORE zoompan
zoompan z=1.0 shows the ENTIRE input at output size. For zoom headroom, scale input to 1.5× first:
`scale=sw:sh:force_original_aspect_ratio=increase,crop=sw:sh,zoompan=z='...'`
Without pre-scale, zoompan cannot zoom in (nothing beyond the image edge).

### 20. xfade offset — cumulative, NOT per-clip duration
`offset` for xfade between clip N and N+1:
`offset = sum(clipDurations[0..N-1]) - N * TRANSITION_DURATION`
Each transition reduces total duration by TRANSITION_DURATION (clips overlap).
Incorrect offset → silent "offset too large" error and ffmpeg produces garbage output.

### 21. acrossfade — must chain from left to right
acrossfade between N audio streams must chain: [a01][2:a]acrossfade → [a12], etc.
Cannot use the concat filter for audio if video uses xfade (they must run in parallel filter chains).

### 22. subtitles filter — SRT path colon must be escaped on Linux
`subtitles=path/to/file.srt` → if path contains `:` (drive letters, port) it breaks.
On Linux: `subtitles=\/home\/...\/subs.srt` or escape colons: `subtitles=/path/to/file.srt` (no colons on Linux paths, usually fine as-is).

### 23. torchaudio 2.11+ requires torchcodec for save()
`torchaudio.save()` in 2.11+ tries torchcodec first, throws ImportError if missing.
Fix: use `scipy.io.wavfile.write(path, sample_rate, audio.numpy())` instead.

### 24. Pixabay API — Cloudflare блокирует датацентровые IP
Pixabay за Cloudflare. Node.js fetch и undici с датацентрового IP дают 403 "Just a moment...".
curl работает потому что системный HTTPS_PROXY в env перенаправляет через прокси.
Решение: использовать undici ProxyAgent(process.env.HTTPS_PROXY) для Pixabay запросов.
Аналогичная проблема может быть у других CDN/Cloudflare сайтов.

### 25. GigaChat rate limit — exponential backoff обязателен
429 ошибки случаются после 4-5 последовательных запросов даже с 2s задержкой.
Решение: RETRY_DELAYS_MS = [2000, 5000, 10000, 20000, 40000] — 5 попыток с ростом задержки.
Между сценами: 3s (было 2s). Fallback: kandinsky → pixabay (через proxy).

### 26. Yandex SpeechKit — FOLDER_ID берётся из сервис-аккаунта, не из консоли
YANDEX_FOLDER_ID должен совпадать с folder ID сервис-аккаунта API ключа.
При несовпадении: HTTP 401 "Specified folder ID 'X' does not match with service account folder ID 'Y'".
Правильный ID возвращается прямо в тексте ошибки — взять оттуда.
Аутентификация: `Authorization: Api-Key ${YANDEX_API_KEY}` (не Bearer). folderId передаётся в form-data.

### 27. ElevenLabs — geo-блокировка России
ElevenLabs редиректит российские IP на страницу ограничений (help.elevenlabs.io).
Даже через HTTPS_PROXY прокси — redirect на help-страницу (не audio).
Код реализован правильно, но не работает с российских серверов. Работает из EU/US.

### 28. fal.ai — НЕ требует прокси, использовать синхронный endpoint
fal.ai (queue.fal.run, fal.run) доступен напрямую без прокси с российских серверов.
Для Flux Pro: синхронный `POST https://fal.run/fal-ai/flux-pro/v1.1` возвращает результат сразу.
НЕ использовать queue API для Flux Pro — response_url возвращает 404 (путь без версии).
Для image-to-video (Kling): синхронный endpoint `fal.run` работает но занимает ~3 мин/клип.

### 29. fal.ai queue response_url — НЕ работает для versioned endpoints
`response_url` из submit response: `https://queue.fal.run/fal-ai/MODEL/requests/{id}` 
При GET возвращает `{"detail":"Path /v1.5/pro/image-to-video/submit not found"}` — 404.
Причина: versioned path (v1.5/pro/...) не включается в routing для result fetch.
Workaround: использовать синхронный `fal.run` endpoint вместо queue.

### 30. fal.ai Seedance — правильное название модели
`fal-ai/seedance-2-fast` не существует. `fal-ai/seedance-2` — существует но result URL сломан.
Рабочий AI image-to-video на fal.ai: `fal-ai/kling-video/v1.5/pro/image-to-video` (Kling Video).
Синхронный endpoint: `https://fal.run/fal-ai/kling-video/v1.5/pro/image-to-video` → ~3 мин/5сек клип.
`SeedanceProvider` реализован через Kling Video backend (публично называем "AI Video").

### 31. generate-clips — fire-and-forget из-за долгой генерации
Kling Video занимает ~3 мин на 5-секундный клип. generate-clips должен быть async (fire-and-forget)
иначе HTTP timeout даже при 600s nginx. Реализовано: endpoint возвращает проект сразу,
генерация идёт в фоне. Frontend может поллить scenes.video_url для отслеживания прогресса.
