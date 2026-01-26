-- ========================================
-- クイックチェック: inquiries テーブルの存在確認
-- ========================================

-- 1. inquiries テーブルが存在するか確認
SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません - SETUP_INQUIRIES_AND_DOCUMENTS.sql を実行してください'
  END as status;

-- 2. inquiries テーブルのカラム確認（存在する場合）
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
ORDER BY ordinal_position;

-- 3. RLSが有効か確認
SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'inquiries';

-- 4. RLSポリシーの確認
SELECT 
  policyname,
  cmd as operation,
  roles
FROM pg_policies
WHERE tablename = 'inquiries'
ORDER BY policyname;

-- 5. テスト: 現在のユーザーでSELECTができるか確認
-- （このクエリはエラーが出る可能性がありますが、それは正常です）
SELECT COUNT(*) as test_count FROM inquiries;
