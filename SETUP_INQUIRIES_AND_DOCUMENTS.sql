-- ========================================
-- 問い合わせ機能とPDF管理機能のセットアップ
-- ========================================

-- 0. user_profiles テーブルの作成（存在しない場合）
-- ========================================

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- RLS (Row Level Security) の設定
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;

-- ポリシー: ユーザーは自分のプロフィールのみ閲覧・更新可能
CREATE POLICY "Users can view their own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ポリシー: 管理者はすべてのプロフィールを閲覧可能
CREATE POLICY "Admins can view all profiles"
  ON user_profiles FOR SELECT
  USING (
    email IN (
      'mitamuraka@haguroko.ed.jp',
      'tomonoem@haguroko.ed.jp'
    )
  );

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_user_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_user_profiles_updated_at_trigger ON user_profiles;
CREATE TRIGGER update_user_profiles_updated_at_trigger
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_user_profiles_updated_at();

-- ========================================
-- 1. 問い合わせテーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS inquiries (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'replied', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON inquiries(created_at DESC);

-- RLS (Row Level Security) の設定
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Users can view their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Users can create their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can update all inquiries" ON inquiries;

-- ポリシー: ユーザーは自分の問い合わせのみ閲覧可能
CREATE POLICY "Users can view their own inquiries"
  ON inquiries FOR SELECT
  USING (auth.uid() = user_id);

-- ポリシー: ユーザーは自分の問い合わせを作成可能
CREATE POLICY "Users can create their own inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ポリシー: 管理者はすべての問い合わせを閲覧・更新可能
CREATE POLICY "Admins can view all inquiries"
  ON inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.email IN (
        'mitamuraka@haguroko.ed.jp',
        'tomonoem@haguroko.ed.jp'
      )
    )
  );

CREATE POLICY "Admins can update all inquiries"
  ON inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.email IN (
        'mitamuraka@haguroko.ed.jp',
        'tomonoem@haguroko.ed.jp'
      )
    )
  );

-- updated_at を自動更新するトリガー
CREATE OR REPLACE FUNCTION update_inquiries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_inquiries_updated_at_trigger ON inquiries;
CREATE TRIGGER update_inquiries_updated_at_trigger
  BEFORE UPDATE ON inquiries
  FOR EACH ROW
  EXECUTE FUNCTION update_inquiries_updated_at();

-- ========================================
-- 2. 資料（PDF）管理テーブルの作成
-- ========================================

CREATE TABLE IF NOT EXISTS documents (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  file_path TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  uploaded_by TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON documents(created_at DESC);

-- RLS (Row Level Security) の設定
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Authenticated users can view documents" ON documents;
DROP POLICY IF EXISTS "Admins can insert documents" ON documents;
DROP POLICY IF EXISTS "Admins can delete documents" ON documents;

-- ポリシー: すべての認証ユーザーは資料を閲覧可能
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT
  USING (auth.role() = 'authenticated');

-- ポリシー: 管理者のみ資料をアップロード可能
CREATE POLICY "Admins can insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.email IN (
        'mitamuraka@haguroko.ed.jp',
        'tomonoem@haguroko.ed.jp'
      )
    )
  );

-- ポリシー: 管理者のみ資料を削除可能
CREATE POLICY "Admins can delete documents"
  ON documents FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.email IN (
        'mitamuraka@haguroko.ed.jp',
        'tomonoem@haguroko.ed.jp'
      )
    )
  );

-- ========================================
-- 3. Supabase Storage バケットの作成
-- ========================================

-- 注意: Storage バケットは Supabase Dashboard から手動で作成する必要があります
-- 以下の手順を実行してください：
--
-- 1. Supabase Dashboard にログイン
-- 2. Storage セクションに移動
-- 3. "New bucket" をクリック
-- 4. バケット名: "documents"
-- 5. Public bucket: チェックを外す（プライベートバケット）
-- 6. "Create bucket" をクリック
--
-- バケット作成後、以下のポリシーを設定してください：

-- Storage ポリシー（Supabase Dashboard の SQL Editor で実行）
-- または、Supabase Dashboard の Storage > Policies から設定

-- ポリシー1: 認証ユーザーは資料を閲覧可能
-- INSERT INTO storage.policies (name, bucket_id, definition, check_expression)
-- VALUES (
--   'Authenticated users can view documents',
--   'documents',
--   'SELECT',
--   'auth.role() = ''authenticated'''
-- );

-- ポリシー2: 管理者のみ資料をアップロード可能
-- INSERT INTO storage.policies (name, bucket_id, definition, check_expression)
-- VALUES (
--   'Admins can upload documents',
--   'documents',
--   'INSERT',
--   'EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE user_profiles.user_id = auth.uid()
--     AND user_profiles.email IN (
--       ''mitamuraka@haguroko.ed.jp'',
--       ''tomonoem@haguroko.ed.jp''
--     )
--   )'
-- );

-- ポリシー3: 管理者のみ資料を削除可能
-- INSERT INTO storage.policies (name, bucket_id, definition, check_expression)
-- VALUES (
--   'Admins can delete documents',
--   'documents',
--   'DELETE',
--   'EXISTS (
--     SELECT 1 FROM user_profiles
--     WHERE user_profiles.user_id = auth.uid()
--     AND user_profiles.email IN (
--       ''mitamuraka@haguroko.ed.jp'',
--       ''tomonoem@haguroko.ed.jp''
--     )
--   )'
-- );

-- ========================================
-- 完了メッセージ
-- ========================================

-- このSQLファイルを実行した後、以下を確認してください：
-- 1. Supabase Dashboard で Storage バケット "documents" を作成
-- 2. Storage ポリシーを設定（上記のコメントを参照）
-- 3. メール通知機能を実装（Resend などの外部サービスを使用）
