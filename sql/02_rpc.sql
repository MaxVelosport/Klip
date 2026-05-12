-- =============================================================
-- Neyroclip — RPC Functions
-- Run AFTER 01_tables.sql
-- IMPORTANT: SET search_path = public is required for SECURITY DEFINER
-- functions — without it Postgres can't resolve unqualified table names.
-- After applying, run: NOTIFY pgrst, 'reload schema';
-- =============================================================

CREATE OR REPLACE FUNCTION neyroclip_register_user(
  p_email         TEXT,
  p_name          TEXT,
  p_password_hash TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_count  BIGINT;
  v_role        TEXT;
  v_user_id     UUID;
  v_period_end  TIMESTAMPTZ := NOW() + INTERVAL '30 days';
BEGIN
  SELECT COUNT(*) INTO v_user_count FROM "Neyroclip_users";
  v_role := CASE WHEN v_user_count = 0 THEN 'admin' ELSE 'user' END;

  INSERT INTO "Neyroclip_users"
    (email, name, password_hash, role, plan_id, current_period_end)
  VALUES
    (p_email, p_name, p_password_hash, v_role, 'free', v_period_end)
  RETURNING id INTO v_user_id;

  INSERT INTO "Neyroclip_token_balances" (user_id, balance)
  VALUES (v_user_id, 200)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN json_build_object(
    'id',      v_user_id,
    'email',   p_email,
    'name',    p_name,
    'role',    v_role,
    'plan_id', 'free'
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'EMAIL_TAKEN' USING ERRCODE = 'P0001';
END;
$$;

GRANT EXECUTE ON FUNCTION neyroclip_register_user(TEXT, TEXT, TEXT)
  TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION neyroclip_spend_tokens(
  p_user_id  UUID,
  p_amount   INT,
  p_ref_id   TEXT,
  p_reason   TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;

  UPDATE "Neyroclip_token_balances"
  SET
    balance    = balance - p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
    AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'INSUFFICIENT_TOKENS' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO "Neyroclip_token_transactions" (user_id, delta, reason, ref_id)
  VALUES (p_user_id, -p_amount, p_reason, p_ref_id);

  RETURN json_build_object(
    'new_balance', v_new_balance,
    'spent',       p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION neyroclip_spend_tokens(UUID, INT, TEXT, TEXT)
  TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION neyroclip_refund_tokens(
  p_user_id  UUID,
  p_amount   INT,
  p_ref_id   TEXT,
  p_reason   TEXT
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT' USING ERRCODE = 'P0001';
  END IF;

  UPDATE "Neyroclip_token_balances"
  SET
    balance    = balance + p_amount,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO "Neyroclip_token_transactions" (user_id, delta, reason, ref_id)
  VALUES (p_user_id, p_amount, p_reason, p_ref_id);

  RETURN json_build_object(
    'new_balance', v_new_balance,
    'refunded',    p_amount
  );
END;
$$;

GRANT EXECUTE ON FUNCTION neyroclip_refund_tokens(UUID, INT, TEXT, TEXT)
  TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION neyroclip_admin_analytics()
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_users    BIGINT;
  v_total_projects BIGINT;
  v_total_revenue  NUMERIC;
  v_paid_count     BIGINT;
  v_mau            BIGINT;
  v_dau            BIGINT;
  v_avg_cheque     NUMERIC;
  v_conv           NUMERIC;
  v_free_count     BIGINT;
  v_monthly_rev    JSON;
  v_users_by_plan  JSON;
BEGIN
  SELECT COUNT(*) INTO v_total_users FROM "Neyroclip_users";

  SELECT COUNT(*) INTO v_total_projects
  FROM "Neyroclip_projects"
  WHERE deleted_at IS NULL;

  SELECT COALESCE(SUM(amount_rub), 0) INTO v_total_revenue
  FROM "Neyroclip_payments"
  WHERE status = 'succeeded';

  SELECT COUNT(*) INTO v_paid_count
  FROM "Neyroclip_payments"
  WHERE status = 'succeeded';

  SELECT COUNT(DISTINCT user_id) INTO v_mau
  FROM "Neyroclip_projects"
  WHERE updated_at >= NOW() - INTERVAL '30 days';

  SELECT COUNT(DISTINCT user_id) INTO v_dau
  FROM "Neyroclip_projects"
  WHERE updated_at >= NOW() - INTERVAL '1 day';

  SELECT COUNT(*) INTO v_free_count
  FROM "Neyroclip_users"
  WHERE plan_id = 'free';

  v_avg_cheque := CASE WHEN v_paid_count > 0 THEN v_total_revenue / v_paid_count ELSE 0 END;
  v_conv       := CASE WHEN v_total_users > 0
                       THEN (v_total_users - v_free_count)::NUMERIC / v_total_users
                       ELSE 0 END;

  SELECT json_agg(r ORDER BY r.month) INTO v_monthly_rev
  FROM (
    SELECT
      to_char(created_at, 'YYYY-MM')        AS month,
      COALESCE(SUM(amount_rub), 0)::NUMERIC AS revenue
    FROM "Neyroclip_payments"
    WHERE status = 'succeeded'
    GROUP BY to_char(created_at, 'YYYY-MM')
  ) r;

  SELECT json_agg(r) INTO v_users_by_plan
  FROM (
    SELECT u.plan_id, p.name AS plan_name, COUNT(u.id)::INT AS count
    FROM "Neyroclip_users" u
    LEFT JOIN "Neyroclip_plans" p ON p.id = u.plan_id
    GROUP BY u.plan_id, p.name
  ) r;

  RETURN json_build_object(
    'total_users',             v_total_users,
    'total_projects',          v_total_projects,
    'total_revenue_rub',       v_total_revenue,
    'mau',                     v_mau,
    'dau',                     v_dau,
    'free_to_paid_conversion', ROUND(v_conv, 4),
    'avg_cheque_rub',          ROUND(v_avg_cheque, 2),
    'revenue_by_month',        COALESCE(v_monthly_rev, '[]'::json),
    'users_by_plan',           COALESCE(v_users_by_plan, '[]'::json)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION neyroclip_admin_analytics()
  TO anon, authenticated, service_role;


CREATE OR REPLACE FUNCTION neyroclip_add_tokens(
  p_user_id  UUID,
  p_delta    INT,
  p_reason   TEXT,
  p_ref_id   TEXT DEFAULT NULL
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance INT;
BEGIN
  UPDATE "Neyroclip_token_balances"
  SET
    balance    = balance + p_delta,
    updated_at = NOW()
  WHERE user_id = p_user_id
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO "Neyroclip_token_transactions" (user_id, delta, reason, ref_id)
  VALUES (p_user_id, p_delta, p_reason, p_ref_id);

  RETURN json_build_object(
    'new_balance', v_new_balance,
    'delta',       p_delta
  );
END;
$$;

GRANT EXECUTE ON FUNCTION neyroclip_add_tokens(UUID, INT, TEXT, TEXT)
  TO anon, authenticated, service_role;


NOTIFY pgrst, 'reload schema';
