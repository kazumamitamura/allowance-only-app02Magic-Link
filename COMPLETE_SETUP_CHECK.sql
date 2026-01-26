-- =========================================
-- 完全なセットアップ確認SQL
-- =========================================

-- 1. すべてのテーブルの存在確認
SELECT 
  'user_profiles' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'user_profiles')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status
UNION ALL
SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status
UNION ALL
SELECT 
  'documents' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

-- 2. RLSが有効か確認
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS有効'
    ELSE '✗ RLS無効'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename IN ('user_profiles', 'inquiries', 'documents')
ORDER BY tablename;

-- 3. RLSポリシーの確認
SELECT 
  tablename,
  COUNT(*) as policy_count,
  CASE 
    WHEN tablename = 'user_profiles' AND COUNT(*) >= 4 THEN '✓ 十分'
    WHEN tablename = 'inquiries' AND COUNT(*) >= 4 THEN '✓ 十分'
    WHEN tablename = 'documents' AND COUNT(*) >= 4 THEN '✓ 十分'
    ELSE '⚠ 不足している可能性があります'
  END as status
FROM pg_policies
WHERE tablename IN ('user_profiles', 'inquiries', 'documents')
GROUP BY tablename
ORDER BY tablename;

-- 4. 各テーブルのポリシー詳細
SELECT 
  tablename,
  policyname,
  cmd as operation
FROM pg_policies
WHERE tablename IN ('user_profiles', 'inquiries', 'documents')
ORDER BY tablename, policyname;
