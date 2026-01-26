-- ========================================
-- セットアップ確認用SQL
-- このSQLを実行して、テーブルが正しく作成されているか確認してください
-- ========================================

-- 1. テーブルの存在確認
SELECT 
  'user_profiles' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

SELECT 
  'documents' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

-- 2. テーブルのカラム確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'inquiries', 'documents')
ORDER BY table_name, ordinal_position;

-- 3. RLSが有効か確認
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'inquiries', 'documents');

-- 4. RLSポリシーの確認
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename IN ('user_profiles', 'inquiries', 'documents')
ORDER BY tablename, policyname;

-- 5. サンプルデータの確認（存在する場合）
SELECT 'user_profiles' as table_name, COUNT(*) as record_count FROM user_profiles;
SELECT 'inquiries' as table_name, COUNT(*) as record_count FROM inquiries;
SELECT 'documents' as table_name, COUNT(*) as record_count FROM documents;
