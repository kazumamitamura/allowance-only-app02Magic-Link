-- ========================================
-- monthly_applicationsテーブルの作成
-- ========================================
-- 実行日: 2026-01-28
-- 目的: 月次申請データを保存するテーブルを作成

-- 1. テーブルが存在しない場合のみ作成
CREATE TABLE IF NOT EXISTS public.monthly_applications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  year_month TEXT NOT NULL,
  application_type TEXT NOT NULL DEFAULT 'allowance',
  status TEXT NOT NULL DEFAULT 'draft',
  submitted_at TIMESTAMPTZ,
  approver_id UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, year_month, application_type)
);

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_monthly_applications_user_id ON public.monthly_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_applications_year_month ON public.monthly_applications(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_applications_status ON public.monthly_applications(status);
CREATE INDEX IF NOT EXISTS idx_monthly_applications_user_year_month ON public.monthly_applications(user_id, year_month);

-- 3. RLS (Row Level Security) を有効化
ALTER TABLE public.monthly_applications ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシーの作成
-- ユーザーは自分のデータのみ閲覧・編集可能
CREATE POLICY "Users can view their own monthly applications"
  ON public.monthly_applications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly applications"
  ON public.monthly_applications
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly applications"
  ON public.monthly_applications
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly applications"
  ON public.monthly_applications
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. updated_atを自動更新するトリガー関数（既に存在する場合はスキップ）
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. updated_atトリガーの作成
DROP TRIGGER IF EXISTS update_monthly_applications_updated_at ON public.monthly_applications;
CREATE TRIGGER update_monthly_applications_updated_at
  BEFORE UPDATE ON public.monthly_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 実行手順:
-- ========================================
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. 上記のSQLを貼り付けて実行
-- 3. "Success" と表示されればOK
-- 4. スキーマキャッシュをリフレッシュ（必要に応じて）
-- ========================================
