-- ========================================
-- user_profiles テーブルのデータ更新
-- ========================================

-- まず、現在の状態を確認
SELECT 
  user_id,
  email,
  display_name,
  created_at
FROM user_profiles
ORDER BY created_at DESC;

-- ========================================
-- パターン1：display_name カラムが存在する場合
-- ========================================

-- mitamuraka@haguroko.ed.jp の display_name を更新
UPDATE user_profiles 
SET display_name = '三田村 和真'
WHERE email = 'mitamuraka@haguroko.ed.jp';

-- 友野工三の display_name を更新（もし必要なら）
UPDATE user_profiles 
SET display_name = '友野 工三'
WHERE email = 'tomonoem@haguroko.ed.jp';

-- 羽黒太郎の display_name を更新（もし必要なら）
UPDATE user_profiles 
SET display_name = '羽黒 太郎'
WHERE email = 'waw2716@gmail.com';

-- 羽黒花子の display_name を更新（もし必要なら）
UPDATE user_profiles 
SET display_name = '羽黒 花子'
WHERE email = 'waw27215@gmail.com';

-- ========================================
-- パターン2：full_name カラムしかない場合
-- ========================================

-- display_name カラムを追加
-- ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS display_name TEXT;

-- full_name から display_name にコピー
-- UPDATE user_profiles SET display_name = full_name WHERE full_name IS NOT NULL;

-- または、個別に設定
-- UPDATE user_profiles 
-- SET display_name = '三田村 和真'
-- WHERE email = 'mitamuraka@haguroko.ed.jp';

-- ========================================
-- 更新後の確認
-- ========================================

SELECT 
  user_id,
  email,
  display_name,
  updated_at
FROM user_profiles
ORDER BY created_at DESC;

-- mitamuraka@haguroko.ed.jp の情報を確認
SELECT * FROM user_profiles WHERE email = 'mitamuraka@haguroko.ed.jp';
