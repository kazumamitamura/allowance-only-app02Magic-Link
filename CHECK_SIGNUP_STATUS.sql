-- ========================================
-- 新規登録エラーの診断: user_profiles とトリガーの状態確認
-- ========================================
-- 実行: Supabase Dashboard → SQL Editor で実行
-- 結果: user_profiles テーブルとトリガーが正しく設定されているか確認
-- ========================================

-- 1. user_profiles テーブルの存在確認
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN '✓ user_profiles テーブルは存在します'
    ELSE '✗ user_profiles テーブルが存在しません → FIX_SIGNUP_USER_PROFILES.sql を実行してください'
  END AS status;

-- 2. handle_new_user トリガー関数の存在確認
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'handle_new_user' AND pronamespace = 'public'::regnamespace)
    THEN '✓ handle_new_user 関数は存在します'
    ELSE '✗ handle_new_user 関数が存在しません → FIX_SIGNUP_USER_PROFILES.sql を実行してください'
  END AS status;

-- 3. auth.users に対するトリガーの存在確認
SELECT 
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_trigger t
      JOIN pg_class c ON t.tgrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'auth' AND c.relname = 'users' AND t.tgname = 'on_auth_user_created'
    )
    THEN '✓ on_auth_user_created トリガーは存在します'
    ELSE '✗ on_auth_user_created トリガーが存在しません → FIX_SIGNUP_USER_PROFILES.sql を実行してください'
  END AS status;

-- 4. user_profiles のレコード数（既存ユーザー数）
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN (SELECT COUNT(*)::text || ' 件のレコードがあります' FROM public.user_profiles)
    ELSE 'テーブルが存在しないため確認できません'
  END AS record_count;

-- 5. auth.users と user_profiles の差分（user_profiles にいないユーザー）
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN (
      SELECT COUNT(*)::text || ' 人のユーザーが user_profiles に存在しません' 
      FROM auth.users u
      WHERE NOT EXISTS (SELECT 1 FROM public.user_profiles p WHERE p.user_id = u.id)
    )
    ELSE 'テーブルが存在しないため確認できません'
  END AS missing_profiles;

-- 6. profiles テーブルの存在確認（Supabase のデフォルトプロフィールテーブル）
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
    THEN '✓ profiles テーブルが存在します（NOT NULL 制約を確認してください）'
    ELSE 'profiles テーブルは存在しません（問題ありません）'
  END AS status;

-- 7. profiles の NOT NULL カラム確認（profiles が存在する場合のみ）
SELECT 
  column_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'profiles'
  AND column_name IN ('name', 'grade', 'class_name', 'email')
  AND is_nullable = 'NO'
ORDER BY column_name;

-- 結果の見方:
-- - user_profiles テーブルまたはトリガーが ✗ の場合 → RUN_SIGNUP_FIX_ALL.sql を実行
-- - profiles の NOT NULL カラムが表示される場合 → RUN_SIGNUP_FIX_ALL.sql で profiles も修正されます
