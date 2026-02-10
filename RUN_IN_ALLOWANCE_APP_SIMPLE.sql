-- ========================================
-- allowance-app-simple プロジェクト用 修正スクリプト
-- ========================================
-- 実行先: https://supabase.com/dashboard/project/plzhnarbdazwzfuxogfe
-- 手順: SQL Editor → New query → このファイルの内容を貼り付け → Run
-- ========================================
-- 内容: user_profiles のトリガー・RLS を整え、新規登録時の氏名がアカウントに自動登録されるようにする
-- ========================================

-- 1. user_profiles に id がある場合、INSERT 時に自動採番されるようにする（トリガー用）
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'id') THEN
    EXECUTE 'ALTER TABLE public.user_profiles ALTER COLUMN id SET DEFAULT gen_random_uuid()';
  END IF;
END $$;

-- 2. updated_at がない場合は追加（任意）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'user_profiles' AND column_name = 'updated_at') THEN
    ALTER TABLE public.user_profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 3. 新規ユーザー作成時に user_profiles に氏名（full_name）を入れるトリガー
--    （id が PK のテーブルでも、user_id のみのテーブルでも動作）
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name, avatar_url)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  );
  RETURN new;
EXCEPTION
  WHEN unique_violation THEN RETURN new;
  WHEN OTHERS THEN RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. 認証ユーザーが自分のプロフィールを 1 件だけ INSERT できるようにする（アプリの upsert 用）
DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 6. 認証ユーザーが自分のプロフィールを UPDATE できるようにする
DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 7. 管理者が全プロフィールを閲覧できるようにする
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.user_profiles;
CREATE POLICY "Admins can view all profiles" ON public.user_profiles FOR SELECT
  USING (email IN ('mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp'));

-- 8. RLS 有効化
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 9. 既存の auth.users のうち user_profiles にいないユーザーを補完
INSERT INTO public.user_profiles (user_id, email, display_name, avatar_url)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)), u.raw_user_meta_data->>'avatar_url'
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id);
-- ※ 重複エラーが出る場合は、すでに全員 user_profiles にいるためスキップして問題ありません。
