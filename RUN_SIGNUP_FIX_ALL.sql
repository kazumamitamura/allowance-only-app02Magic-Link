-- ========================================
-- 新規登録エラー「Database error saving new user」を一括で直す
-- ========================================
-- 次の2つをまとめて実行します:
--   A. user_profiles テーブル + 新規ユーザー作成トリガー
--   B. profiles テーブルがある場合のみ NOT NULL/CHECK を緩和
-- 実行: 手当アプリが接続している Supabase プロジェクトで
--       SQL Editor → このファイルを貼り付け → Run
-- ========================================

-- ========== A. user_profiles とトリガー ==========
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;

CREATE POLICY "Users can view their own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.user_profiles FOR SELECT
  USING (
    email IN (
      'mitamuraka@haguroko.ed.jp',
      'tomonoem@haguroko.ed.jp'
    )
  );

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    UPDATE public.user_profiles
    SET email = COALESCE(NEW.email, ''),
        display_name = COALESCE(NEW.raw_user_meta_data->>'full_name', display_name),
        updated_at = NOW()
    WHERE user_id = NEW.id;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.user_profiles (user_id, email, display_name)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', '')
FROM auth.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id
)
ON CONFLICT (user_id) DO UPDATE SET
  email = EXCLUDED.email,
  display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), user_profiles.display_name),
  updated_at = NOW();


-- ========== B. profiles がある場合のみ NOT NULL/CHECK を緩和 ==========
-- （Supabase の「Create profile on signup」等で profiles に挿入している場合のエラー対策）

-- B-1. profiles の CHECK 制約（class_name 等）を削除（テーブルがある場合のみ）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    EXECUTE 'ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_class_name_check';
  END IF;
END $$;

-- B-2. profiles の NOT NULL を緩和（カラムが存在する場合のみ）
DO $$
DECLARE
  col TEXT;
  cols TEXT[] := ARRAY['name', 'grade', 'class_name', 'email'];
  data_type TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    RAISE NOTICE 'profiles テーブルは存在しません。スキップします。';
    RETURN;
  END IF;
  FOREACH col IN ARRAY cols
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = col
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.profiles ALTER COLUMN %I DROP NOT NULL',
        col
      );
      SELECT c.data_type INTO data_type
        FROM information_schema.columns c
        WHERE c.table_schema = 'public' AND c.table_name = 'profiles' AND c.column_name = col;
      IF data_type IN ('text', 'character varying', 'character') THEN
        EXECUTE format(
          'ALTER TABLE public.profiles ALTER COLUMN %I SET DEFAULT %L',
          col, ''
        );
      END IF;
      RAISE NOTICE 'profiles.% を NULL 可にしました', col;
    END IF;
  END LOOP;
END $$;

-- 完了（profiles が無い場合は B-1 で relation "profiles" does not exist が出る場合があります。
-- その場合は B-1 を手動で削除して実行するか、A 部分だけ実行済みなら新規登録は通る可能性があります）
