# НейроКлип — контекст для Claude

## Стек
- **Монорепо**: pnpm workspaces
- **Backend**: `artifacts/api-server` — Express 5, TypeScript, ESM
- **Frontend**: `artifacts/neuroclip` — Vite, React 18, TanStack Query v5, shadcn/ui
- **БД**: Supabase self-hosted (`https://superbase.aiinvestor360.ru`)
- **ORM**: Drizzle убран из runtime → `@supabase/supabase-js` + 5 Postgres RPC функций
- **Типы схемы**: `lib/db/src/schema/*.ts` (Drizzle-схемы, только для типов)
- **Supabase клиент**: `lib/db/src/sb-client.ts` → `sbFrom()`, `sbRpc()`, `TABLE` map
- **Миграции**: `scripts/src/apply-migrations.ts` → `/pg/query` endpoint

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

## Postgres RPC функции (в public схеме)
| Функция | Назначение |
|---|---|
| `neyroclip_register_user(email, name, password_hash)` | Атомарная регистрация + 200 токенов |
| `neyroclip_spend_tokens(user_id, amount, ref_id, reason)` | Атомарное списание, проверка баланса |
| `neyroclip_refund_tokens(user_id, amount, ref_id, reason)` | Возврат токенов |
| `neyroclip_admin_analytics()` | Все dashboard-метрики одним вызовом |
| `neyroclip_add_tokens(user_id, delta, reason, ref_id?)` | Admin: добавить токены |

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
- [ ] `lib/session.ts` — JOIN sessions+users, на каждый запрос
- [ ] `routes/auth.ts` — регистрация → RPC neyroclip_register_user
- [ ] `routes/billing.ts` — atomic balance → RPC neyroclip_add_tokens
- [ ] `routes/pipeline.ts` — spend/refund → RPC neyroclip_spend/refund_tokens

**Уровень 4** (завершение):
- [ ] `routes/admin.ts` — analytics → RPC neyroclip_admin_analytics
- [ ] `lib/seed.ts` — upsert plans через /pg/query

## Known tech debt for post-pitch cleanup

1. **[POST-PITCH] neyroclip_refund_tokens idempotency**: добавить проверку
   уникальности ref_id+reason в SQL функцию — защита от двойного refund при retry.

2. **[POST-PITCH] Promo used_count**: переписать на RPC `neyroclip_increment_promo`
   с atomic `UPDATE ... WHERE max_uses=0 OR used_count < max_uses`.

3. **[POST-PITCH] Типизация**: заменить `(p as any)` на типизированные интерфейсы —
   руками в `lib/db/src/types.ts` или через `supabase gen types typescript`.

## Запуск миграций
```bash
scripts/node_modules/.bin/tsx --env-file=.env scripts/src/apply-migrations.ts
```

## Build
```bash
pnpm --filter @workspace/api-server run build
PORT=20274 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/neuroclip run build
```
