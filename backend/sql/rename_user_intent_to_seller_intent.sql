-- One-time: align DB with TypeORM entity table name `seller_intent`.
-- Idempotent: safe if `user_intent` is already gone or `seller_intent` already exists.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_intent'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'seller_intent'
  ) THEN
    ALTER TABLE user_intent RENAME TO seller_intent;
  END IF;
END
$$;
