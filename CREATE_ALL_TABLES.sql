-- ========================================
-- すべての必要なテーブルを作成
-- ========================================
-- 実行日: 2026-01-28
-- 目的: アプリケーションに必要なすべてのテーブルを作成

-- ========================================
-- 1. allowancesテーブルの作成
-- ========================================
CREATE TABLE IF NOT EXISTS public.allowances (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT,
  date DATE NOT NULL,
  activity_type TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0,
  destination_type TEXT,
  destination_detail TEXT,
  is_driving BOOLEAN NOT NULL DEFAULT false,
  is_accommodation BOOLEAN NOT NULL DEFAULT false,
  custom_amount INTEGER,
  custom_description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE INDEX IF NOT EXISTS idx_allowances_user_id ON public.allowances(user_id);
CREATE INDEX IF NOT EXISTS idx_allowances_date ON public.allowances(date);
CREATE INDEX IF NOT EXISTS idx_allowances_user_date ON public.allowances(user_id, date);

ALTER TABLE public.allowances ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（既存のポリシーを削除してから作成）
DROP POLICY IF EXISTS "Users can view their own allowances" ON public.allowances;
DROP POLICY IF EXISTS "Users can insert their own allowances" ON public.allowances;
DROP POLICY IF EXISTS "Users can update their own allowances" ON public.allowances;
DROP POLICY IF EXISTS "Users can delete their own allowances" ON public.allowances;

CREATE POLICY "Users can view their own allowances"
  ON public.allowances FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own allowances"
  ON public.allowances FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own allowances"
  ON public.allowances FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own allowances"
  ON public.allowances FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 2. monthly_applicationsテーブルの作成
-- ========================================
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

CREATE INDEX IF NOT EXISTS idx_monthly_applications_user_id ON public.monthly_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_monthly_applications_year_month ON public.monthly_applications(year_month);
CREATE INDEX IF NOT EXISTS idx_monthly_applications_status ON public.monthly_applications(status);
CREATE INDEX IF NOT EXISTS idx_monthly_applications_user_year_month ON public.monthly_applications(user_id, year_month);

ALTER TABLE public.monthly_applications ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（既存のポリシーを削除してから作成）
DROP POLICY IF EXISTS "Users can view their own monthly applications" ON public.monthly_applications;
DROP POLICY IF EXISTS "Users can insert their own monthly applications" ON public.monthly_applications;
DROP POLICY IF EXISTS "Users can update their own monthly applications" ON public.monthly_applications;
DROP POLICY IF EXISTS "Users can delete their own monthly applications" ON public.monthly_applications;

CREATE POLICY "Users can view their own monthly applications"
  ON public.monthly_applications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own monthly applications"
  ON public.monthly_applications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly applications"
  ON public.monthly_applications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly applications"
  ON public.monthly_applications FOR DELETE
  USING (auth.uid() = user_id);

-- ========================================
-- 3. updated_atを自動更新するトリガー関数
-- ========================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. updated_atトリガーの作成
-- ========================================
DROP TRIGGER IF EXISTS update_allowances_updated_at ON public.allowances;
CREATE TRIGGER update_allowances_updated_at
  BEFORE UPDATE ON public.allowances
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_monthly_applications_updated_at ON public.monthly_applications;
CREATE TRIGGER update_monthly_applications_updated_at
  BEFORE UPDATE ON public.monthly_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 5. テーブル作成確認
-- ========================================
SELECT 
  'allowances' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'allowances')
    THEN '✓ 作成されました'
    ELSE '✗ 作成されていません'
  END as status
UNION ALL
SELECT 
  'monthly_applications' as table_name,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'monthly_applications')
    THEN '✓ 作成されました'
    ELSE '✗ 作成されていません'
  END as status;

-- ========================================
-- 実行手順:
-- ========================================
-- 1. Supabase Dashboard → SQL Editor を開く
-- 2. 上記のSQLを貼り付けて実行
-- 3. "Success" と表示されればOK
-- 4. スキーマキャッシュをリフレッシュするため、数秒待ってからアプリをリロード
-- ========================================
