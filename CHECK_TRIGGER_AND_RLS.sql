-- ========================================
-- 新規登録エラーの詳細診断: トリガーと RLS ポリシーの確認
-- ========================================
-- 実行: Supabase Dashboard → SQL Editor で実行
-- 結果: トリガー、関数、RLS ポリシーの状態を確認
-- ========================================

-- 1. handle_new_user 関数の詳細確認
SELECT 
  p.proname AS function_name,
  pg_get_functiondef(p.oid) AS function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' AND p.proname = 'handle_new_user';

-- 2. auth.users に対するトリガーの詳細確認
SELECT 
  t.tgname AS trigger_name,
  c.relname AS table_name,
  n.nspname AS schema_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'auth' 
  AND c.relname = 'users' 
  AND t.tgname = 'on_auth_user_created';

-- 3. user_profiles の RLS ポリシー詳細確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'user_profiles'
ORDER BY policyname;

-- 4. user_profiles テーブルの RLS 有効/無効確認
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'user_profiles';

-- 5. profiles テーブルの存在と RLS 状態確認
SELECT 
  schemaname,
  tablename,
  rowsecurity AS rls_enabled,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles')
    THEN '存在します'
    ELSE '存在しません'
  END AS table_exists
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 6. profiles テーブルに対するトリガーの確認（profiles に挿入するトリガーがあるか）
SELECT 
  t.tgname AS trigger_name,
  c.relname AS table_name,
  n.nspname AS schema_name,
  pg_get_triggerdef(t.oid) AS trigger_definition
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE n.nspname = 'public' 
  AND c.relname = 'profiles'
  AND t.tgisinternal = false
ORDER BY t.tgname;

-- 結果の見方:
-- 1. function_definition に "SECURITY DEFINER" が含まれているか確認
-- 2. trigger_definition でトリガーが正しく設定されているか確認
-- 3. RLS ポリシーの with_check 条件を確認（INSERT 時に auth.uid() = user_id をチェックしているか）
-- 4. profiles テーブルにトリガーがある場合、それが原因の可能性があります
