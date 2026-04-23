# НейроКлип — AI Video Production Platform

## Overview
НейроКлип is a Russian-language multi-page web platform designed to transform a text idea into a complete video (script generation, image selection, animation, voice-over, and final rendering) within approximately 30 minutes. The platform aims to streamline video production using AI, catering to a wide range of categories from educational to marketing content.

## User Preferences
The user prefers a clear and engaging interface with interactive elements that guide them through the video creation process. They value detailed feedback, real-time updates on progress, and clear cost breakdowns for rendering. The user expects robust handling of various document types for text extraction and a flexible system for customizing video elements. They also appreciate in-app tutorials and onboarding mechanisms to facilitate understanding and usage of the platform.

## System Architecture
The project is built as a monorepo using pnpm workspaces.
- **Backend:** `artifacts/api-server` utilizes Express 5, TypeScript, Drizzle ORM, and PostgreSQL.
- **Frontend:** `artifacts/neuroclip` is developed with Vite, React 18, wouter, TanStack Query v5, shadcn/ui, Tailwind CSS v4, framer-motion, recharts, and lucide-react.
- **Shared Libraries:** `lib/api-spec` uses OpenAPI YAML for API specification, generating React-Query hooks via orval in `lib/api-client-react`. `lib/db` contains Drizzle schemas.

**Key Features and Design Choices:**
- **Authentication & Sessions:** Cookie-based sessions (`neuroclip.sid` with httpOnly, lax, 30 days expiry) and `bcryptjs` for password hashing. The first registered user is automatically an admin and receives initial tokens.
- **Video Pipeline (Mocked):** The AI and rendering pipeline are currently mocked for demonstration and development purposes.
    - Script generation uses deterministic Russian narration templates based on topics, splitting into 3-6 scenes.
    - Images are Unsplash placeholder URLs.
    - Audio uses SoundHelix samples.
    - Rendering is simulated with a 6-second `setTimeout` followed by a sample MP4.
- **Video Creation Wizard (6 Steps):**
    1.  **Category & Details:** Users select a video category (e.g., educational, marketing), leading to tailored forms with smart defaults. Source file uploads (`.txt`, `.md`, `.csv`, `.json`, `.html`, `.pdf`, `.docx`, images for OCR) are supported, with text extraction handled by `pdf-parse`, `mammoth`, and `tesseract.js`.
    2.  **Script Editing:** A split workspace with a scene editor and an AI chat for refining the script. The AI chat (`script_messages` table) can perform deterministic edits like shortening, expanding, or rephrasing based on Russian intents.
    3.  **Image Selection:** A drag-and-drop tile studio for managing scene images, including regeneration, custom URLs, and animation presets.
    4.  **Animation & Transitions:** Four one-click style presets (Cinematic, Slideshow, Dynamic, Calm) apply animations and transitions across all scenes.
    5.  **Voice-over & Music:** Selection of voice, speed, music, volume, and subtitle styles (simple, bold, karaoke) with live preview.
    6.  **Final Video:** Displays project summary, allows selection of render quality (720p, 1080p PRO, 4K UHD PRO), watermark toggling, and a transparent cost breakdown card. Users can download, share, or re-render the video.
- **Billing & Token System:** New users receive 200 tokens. A `cost.ts` helper calculates per-project costs based on scenes, voice-over length, animation, music, subtitles, quality multipliers, and a service fee. Token transactions are atomic and race-safe.
- **Onboarding & Tutorials:** Includes a welcome modal, an onboarding checklist on the dashboard, step-specific instructions, help tips for fields, a floating help button, and a "How It Works" strip for new users.
- **Project Management:** Redesigned `ProjectCard` for `done` status, offering immediate play and download options. Inline preview modal with "Download MP4", "Open in new tab", "Refine in editor" actions.
- **Competitive Tools (Tier 1):**
    - **Templates Gallery** (`/app/templates`): 14 curated video templates across Reels/long-form/ads/education/vlog with category filters and search. Selecting a template prefills the wizard via `?template=<slug>` query param; Step 1 shows a "Шаблон применён" badge with "Сменить" reset button. Template catalog: `src/lib/video-templates.ts`.
    - **URL/Article Importer:** Server route `/api/extract-url` (in `routes/extract.ts`) fetches public web pages, strips HTML to plain text. Hardened against SSRF: blocks private/loopback/link-local IPs via DNS resolution + per-redirect re-validation (`redirect: "manual"`, max 4 hops). 1.5MB byte cap, 8s timeout. UI block in Step 1 (`components/projects/url-import.tsx`) — uses `<div>` + button onClick (NOT nested `<form>`) to avoid breaking the outer wizard form.
    - **Social Post Generator:** Server route `/api/projects/:id/social-caption` (in `routes/pipeline.ts`) generates VK / Telegram / YouTube captions with emoji + Russian-pluralized duration + hashtags (#нейроклип, #видео, plus topic-derived tags). UI tabs in Step 6 (`components/projects/social-post-generator.tsx`) with copy-to-clipboard and regenerate. Requires `project.status === "done"`.
- **Design System & Motion:**
    - Consistent button animations (`active:scale-[0.97]`, smooth shadows, focus-rings).
    - Global CSS animations (`blob-float`, `shimmer`, `pulse-ring`, `gradient-shift`, `confetti-fall`).
    - Custom thin scrollbars, smooth scroll behavior.
    - Decorative animated blobs and counters.
    - Page transitions (`AnimatePresence` with fade/slide).
    - Confetti burst on successful render.
    - Animated sidebar with `layoutId` for smooth transitions.
    - Dashboard hero section features animated gradients, blobs, floating icons, and a pulse-ring CTA.
    - KPI tiles with hover-lift effects and animated counters.

## External Dependencies
- **Database:** PostgreSQL (via Drizzle ORM).
- **Text Extraction:**
    - `pdf-parse` (for PDF files)
    - `mammoth` (for DOCX files)
    - `tesseract.js` (for OCR on image uploads, supporting Russian and English)
- **API Specification:** OpenAPI YAML.
- **Component Libraries:**
    - `shadcn/ui`
    - `lucide-react`
- **Animation:** `framer-motion`.
- **Charting:** `recharts`.
- **Hashing:** `bcryptjs`.
## Launch-readiness pass (final)
- **Восстановление пароля**: `components/forgot-password-dialog.tsx` — модал по «Забыли?», 2 шага (email → выбор канала: mailto на `support@neuroclip.ru`, Telegram, копирование шаблона).
- **Дружелюбные ошибки**: `components/error-state.tsx` (`role="alert"`/`aria-live`) — заменил плоский «Ошибка загрузки» на дашборде и в визарде, кнопки «Попробовать снова» + «На дашборд/К проектам».
- **Мобильный степпер визарда**: `components/wizard-mobile-stepper.tsx` — sticky-заголовок «Шаг N из 6 · Название», градиентный прогресс-бар, 6 кружков-точек. Виден только на `<md`.
- **404 вместо 500 при некорректном UUID проекта**: гард `UUID_RE` в `loadProjectOr404` (`artifacts/api-server/src/routes/projects.ts`).
- **Fail-fast на 4xx в react-query**: `App.tsx` queryClient — на 4xx ретраев нет, на 5xx до 2-х. `refetchOnWindowFocus: false`.
- **Подсказка про email** на странице Профиля: «(используется как логин)» + ссылка «напишите в поддержку».
- **Step 6**: «ETA: ~X сек» → «Осталось ~X сек» (русификация).
- **Step 5 «Озвучка»**: баннер-предупреждение «Превью — это иллюстрация настроения; в готовом видео ваш текст будет полностью озвучен выбранным голосом».
- **Admin queue**: «Повтор» работает не только для `failed`, но и для зависших `rendering`/`queued` (с подтверждением). Пустая очередь — кнопка «Обновить».

## Design system & motion
- Все `<Button>` сжимаются при тапе (`active:scale-[0.97]`), focus-ring `ring-2 ring-ring`.
- Глобальные CSS-анимации в `index.css`: `blob-float`, `shimmer`, `pulse-ring`, `gradient-shift`, `confetti-fall` + утилиты `.blob`, `.shimmer`, `.pulse-ring`, `.animate-gradient`, `.glass`. Кастомный тонкий скролл, `scroll-behavior: smooth`.
- `components/animated-blobs.tsx` — декоративные плавающие «блобы» (3 пресета).
- `components/animated-counter.tsx` — счётчик 0→N с ease-out cubic + IntersectionObserver, локаль ru-RU.
- `components/page-transition.tsx` — `AnimatePresence` fade/slide между страницами `/app/*`.
- `components/confetti-burst.tsx` — салют конфетти на финальном экране Step 6.
- Сайдбар: активный пункт через `motion.div layoutId="sidebar-active"` (пружина), градиентный логотип с hover-rotate.
- Дашборд hero: анимированный градиент + блобы + парящие иконки + бейдж «ИИ-студия видео», CTA с `pulse-ring`.
- KPI: hover-lift, gradient-glow в углу, анимированный счётчик, спиннер на «В работе» при активных рендерах.

## Onboarding & tutorials
- `WelcomeModal` — 6-слайдовый тур при первом заходе. `OnboardingChecklist` — 4 реальных задачи на дашборде. `StepInstructions` — плашка в начале каждого из 6 шагов визарда. `HelpFab` — плавающая «?» в углу. `HelpTip` — точечные popover-подсказки. `HowItWorksStrip` — лента «4 шага» в списке проектов.
- Все `localStorage`-ключи user-scoped через `lib/user-storage.ts` (`nc:u:<uid>:<suffix>`).
- Флаг `visited:billing` пишется только при реальном открытии страницы `/app/billing`.

## Просмотр / скачивание / доработка готовых проектов
- `ProjectCard`: для `done` — hover overlay ▶, кнопки «Смотреть» и «Скачать», inline preview-модал с `<video controls>` + «Доработать в редакторе» / «Открыть в новой вкладке» / «Скачать MP4». Для `rendering` — overlay со спиннером, для `failed` — «Исправить и пересобрать».
- Скачивание: программный `<a download="<title>.mp4">` с очисткой имени через `/[^\p{L}\p{N}\-_ ]+/gu` (кириллица сохраняется).

## Market launch readiness (April 2026)
- **Лендинг (`pages/landing.tsx`) полностью переработан**: стэкап Hero → Stats strip → Features grid (6 карточек) → 3-step «Как это работает» → testimonial → Pricing (3 тарифа: Старт/Про/Студия) → FAQ accordion → Final CTA → Footer. Sticky-хедер с якорной навигацией (Возможности/Как это работает/Тарифы/Вопросы), демо-модалка, плашки доверия (без карты, 3 в подарок, русский интерфейс), бейдж «Лучший русскоязычный AI-видеосервис 2026». Декоративные blur-блобы фона.
- **Фикс роутинга `/app`**: был 404 при заходе на голый `/app`. Добавлен `<Route path="/app"><Redirect to="/app/dashboard" /></Route>` верхнего уровня (внутри protected-блока `/app/*` wouter не матчил bare `/app`).
- **Tier 2 шипнут полностью** (см. отдельные секции): aspect ratio, project duplication UI, brand kit, public share links, viral hooks library — все e2e-валидированы.

## Известные транзитивные уязвимости (на момент апреля 2026)
- `brace-expansion 2.0.2` (DoS), `lodash 4.17.23` (proto-pollution + code injection в `_.template`), `path-to-regexp 8.3.0` (ReDoS). Все — moderate/high, фиксы существуют, требуют апгрейда транзитивных зависимостей. Не блокируют запуск, но желательно поднять при первом плановом обновлении.
