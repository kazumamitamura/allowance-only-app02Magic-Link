-- ========================================
-- RLSポリシーの詳細確認
-- ========================================

-- 1. inquiries テーブルの存在確認
SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

-- 2. RLSが有効か確認
SELECT 
  tablename,
  rowsecurity as rls_enabled,
  CASE 
    WHEN rowsecurity THEN '✓ RLS有効'
    ELSE '✗ RLS無効 - セキュリティ上の問題があります'
  END as status
FROM pg_tables
WHERE schemaname = 'public' 
  AND tablename = 'inquiries';

-- 3. RLSポリシーの詳細確認
SELECT 
  policyname as ポリシー名,
  cmd as 操作,
  roles as ロール,
  qual as 条件,
  with_check as チェック条件
FROM pg_policies
WHERE tablename = 'inquiries'
ORDER BY policyname;

-- 4. ポリシーの数確認（最低4つ必要）
SELECT 
  COUNT(*) as ポリシー数,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✓ 十分なポリシーが設定されています'
    WHEN COUNT(*) > 0 THEN '⚠ ポリシーが不足している可能性があります'
    ELSE '✗ ポリシーが設定されていません'
  END as status
FROM pg_policies
WHERE tablename = 'inquiries';

-- 5. 必要なポリシーの確認
SELECT 
  policyname,
  CASE 
    WHEN policyname LIKE '%view%' OR policyname LIKE '%select%' THEN 'SELECT用'
    WHEN policyname LIKE '%create%' OR policyname LIKE '%insert%' THEN 'INSERT用'
    WHEN policyname LIKE '%update%' THEN 'UPDATE用'
    WHEN policyname LIKE '%admin%' THEN '管理者用'
    ELSE 'その他'
  END as 用途
FROM pg_policies
WHERE tablename = 'inquiries'
ORDER BY policyname;
