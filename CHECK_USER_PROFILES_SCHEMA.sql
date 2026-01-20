-- ========================================
-- user_profiles テーブルの構造確認
-- ========================================

-- 1. テーブルの全カラムを確認
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. 現在のデータを確認
SELECT 
  user_id,
  email,
  display_name,
  full_name,  -- もしこのカラムがあるなら
  created_at,
  updated_at
FROM user_profiles
ORDER BY created_at DESC;

-- 3. もし display_name カラムが存在しない場合は追加
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- 4. もし full_name カラムがあって、display_name に移行したい場合
-- UPDATE user_profiles SET display_name = full_name WHERE display_name IS NULL AND full_name IS NOT NULL;

-- 5. mitamuraka@haguroko.ed.jp の情報を確認
SELECT * FROM user_profiles WHERE email = 'mitamuraka@haguroko.ed.jp';
