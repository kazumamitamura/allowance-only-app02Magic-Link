-- ========================================
-- monthly_applicationsテーブルのスキーマ修正
-- ========================================
-- 実行日: 2026-01-21
-- 目的: application_type カラムが存在しない場合に追加

-- 1. 現在のテーブル構造を確認
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'monthly_applications'
ORDER BY ordinal_position;

-- 2. application_type カラムを追加（存在しない場合）
ALTER TABLE monthly_applications 
ADD COLUMN IF NOT EXISTS application_type TEXT DEFAULT 'allowance';

-- 3. 既存データにデフォルト値を設定
UPDATE monthly_applications 
SET application_type = 'allowance' 
WHERE application_type IS NULL;

-- 4. 追加後のスキーマを確認
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'monthly_applications'
ORDER BY ordinal_position;

-- ========================================
-- 実行手順:
-- ========================================
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. 上記のSQLを貼り付けて実行
-- 3. "Success" と表示されればOK
-- ========================================

-- ========================================
-- 想定されるテーブル構造:
-- ========================================
-- id (bigint, primary key)
-- user_id (uuid, foreign key -> auth.users)
-- user_email (text)
-- year_month (text, 例: '2026-01')
-- application_type (text, 'allowance' など) ← これが追加される
-- status (text, 'draft', 'submitted', 'approved' など)
-- submitted_at (timestamp)
-- approved_at (timestamp)
-- created_at (timestamp)
-- updated_at (timestamp)
-- ========================================
