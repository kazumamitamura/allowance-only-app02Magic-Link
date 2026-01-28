-- ========================================
-- allowancesテーブルの作成
-- ========================================
-- 実行日: 2026-01-28
-- 目的: 手当データを保存するテーブルを作成

-- 1. テーブルが存在しない場合のみ作成
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

-- 2. インデックスの作成
CREATE INDEX IF NOT EXISTS idx_allowances_user_id ON public.allowances(user_id);
CREATE INDEX IF NOT EXISTS idx_allowances_date ON public.allowances(date);
CREATE INDEX IF NOT EXISTS idx_allowances_user_date ON public.allowances(user_id, date);

-- 3. RLS (Row Level Security) を有効化
ALTER TABLE public.allowances ENABLE ROW LEVEL SECURITY;

-- 4. RLSポリシーの作成
-- ユーザーは自分のデータのみ閲覧・編集可能
CREATE POLICY "Users can view their own allowances"
  ON public.allowances
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own allowances"
  ON public.allowances
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own allowances"
  ON public.allowances
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own allowances"
  ON public.allowances
  FOR DELETE
  USING (auth.uid() = user_id);

-- 5. updated_atを自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. updated_atトリガーの作成
DROP TRIGGER IF EXISTS update_allowances_updated_at ON public.allowances;
CREATE TRIGGER update_allowances_updated_at
  BEFORE UPDATE ON public.allowances
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
