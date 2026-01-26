-- =========================================
-- PostgRESTスキーマキャッシュのリフレッシュ
-- ========================================
-- 
-- このSQLを実行すると、SupabaseのAPI層（PostgREST）が
-- データベーススキーマを再読み込みします。
-- 
-- 注意: このコマンドはSupabaseの内部APIを呼び出すため、
-- 直接SQLでは実行できません。
-- 
-- 代わりに、以下のいずれかの方法でキャッシュをリフレッシュしてください：
-- 
-- 方法1: Supabase Dashboard の API Settings から
-- 1. Supabase Dashboard → Settings → API
-- 2. "Reload schema cache" ボタンをクリック
-- 
-- 方法2: REST API を直接呼び出す
-- POST https://<project-ref>.supabase.co/rest/v1/
-- ヘッダー: { "apikey": "<anon-key>" }
-- 
-- 方法3: テーブルにアクセスしてキャッシュを更新
-- 以下のクエリを実行すると、PostgRESTがスキーマを再読み込みします

-- テーブルの存在を再確認（これによりキャッシュが更新される可能性があります）
SELECT 
  table_name,
  table_schema
FROM information_schema.tables
WHERE table_schema = 'public' 
  AND table_name = 'inquiries';

-- テーブルのカラム情報を取得（これもキャッシュ更新に役立ちます）
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'inquiries'
ORDER BY ordinal_position;

-- テーブルに直接アクセス（SELECT権限がある場合）
SELECT COUNT(*) as row_count FROM inquiries;
