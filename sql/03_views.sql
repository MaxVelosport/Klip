-- =============================================================
-- Neyroclip — Views
-- Run AFTER 01_tables.sql
-- =============================================================

-- Ежемесячная выручка (для графика в admin dashboard)
-- Доступна через PostgREST как обычная таблица:
--   supabase.from('Neyroclip_payments_monthly').select('*')
CREATE OR REPLACE VIEW "Neyroclip_payments_monthly" AS
SELECT
  to_char(created_at, 'YYYY-MM')        AS month,
  COALESCE(SUM(amount_rub), 0)::NUMERIC AS revenue,
  COUNT(*)::INT                          AS payment_count
FROM "Neyroclip_payments"
WHERE status = 'succeeded'
GROUP BY to_char(created_at, 'YYYY-MM')
ORDER BY to_char(created_at, 'YYYY-MM');
