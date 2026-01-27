-- annual_schedules テーブルの作成
-- 年間勤務表のCSVデータを保存するテーブル

-- テーブルの作成
CREATE TABLE IF NOT EXISTS annual_schedules (
  id BIGSERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  work_type TEXT NOT NULL,
  event_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- インデックスの作成
CREATE INDEX IF NOT EXISTS idx_annual_schedules_date ON annual_schedules(date);

-- RLS (Row Level Security) の設定
ALTER TABLE annual_schedules ENABLE ROW LEVEL SECURITY;

-- 既存のポリシーを削除（存在する場合）
DROP POLICY IF EXISTS "Anyone can view annual schedules" ON annual_schedules;
DROP POLICY IF EXISTS "Admins can manage annual schedules" ON annual_schedules;

-- ポリシー: すべての認証ユーザーが閲覧可能
CREATE POLICY "Anyone can view annual schedules"
  ON annual_schedules FOR SELECT
  USING (auth.role() = 'authenticated');

-- ポリシー: 管理者のみが管理可能
CREATE POLICY "Admins can manage annual schedules"
  ON annual_schedules FOR ALL
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
CREATE OR REPLACE FUNCTION update_annual_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_annual_schedules_updated_at_trigger ON annual_schedules;
CREATE TRIGGER update_annual_schedules_updated_at_trigger
  BEFORE UPDATE ON annual_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_annual_schedules_updated_at();

-- スキーマキャッシュをリフレッシュ
NOTIFY pgrst, 'reload schema';
