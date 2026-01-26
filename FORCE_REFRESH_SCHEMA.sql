-- =========================================
-- スキーマキャッシュを強制的にリフレッシュする方法
-- =========================================

-- 方法1: テーブルを一度削除して再作成（データが空の場合のみ）
-- 注意: この方法は既存のデータを削除します
-- データが重要な場合は、方法2を使用してください

-- テーブルを削除
DROP TABLE IF EXISTS inquiries CASCADE;

-- テーブルを再作成
CREATE TABLE inquiries (
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
CREATE INDEX idx_inquiries_user_id ON inquiries(user_id);
CREATE INDEX idx_inquiries_status ON inquiries(status);
CREATE INDEX idx_inquiries_created_at ON inquiries(created_at DESC);

-- RLS (Row Level Security) の設定
ALTER TABLE inquiries ENABLE ROW LEVEL SECURITY;

-- ポリシーの作成
DROP POLICY IF EXISTS "Users can view their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Users can create their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can update all inquiries" ON inquiries;

CREATE POLICY "Users can view their own inquiries"
  ON inquiries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own inquiries"
  ON inquiries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

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

-- テーブルにアクセスしてキャッシュを更新
SELECT COUNT(*) FROM inquiries;

-- テーブルの存在を確認
SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ テーブルが作成されました'
    ELSE '✗ テーブルの作成に失敗しました'
  END as status;
