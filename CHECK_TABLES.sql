-- ========================================
-- テーブル作成確認用SQL
-- ========================================

-- 1. user_profiles テーブルの確認
SELECT 
  'user_profiles' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在します' ELSE '✗ 存在しません' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'user_profiles';

-- 2. inquiries テーブルの確認
SELECT 
  'inquiries' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在します' ELSE '✗ 存在しません' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'inquiries';

-- 3. documents テーブルの確認
SELECT 
  'documents' as table_name,
  COUNT(*) as record_count,
  CASE WHEN COUNT(*) > 0 THEN '✓ 存在します' ELSE '✗ 存在しません' END as status
FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name = 'documents';

-- 4. すべてのテーブル構造を確認
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name IN ('user_profiles', 'inquiries', 'documents')
ORDER BY table_name, ordinal_position;

-- 5. RLSポリシーの確認
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
WHERE tablename IN ('user_profiles', 'inquiries', 'documents')
ORDER BY tablename, policyname;
