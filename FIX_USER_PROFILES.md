# 🔧 ユーザープロフィール修正ガイド

## 問題の状況

`mitamuraka@haguroko.ed.jp` のアカウントで以下の問題が発生しています：

1. ✅ ログインはできる
2. ✅ データ入力もできる
3. ❌ 氏名（display_name）がSupabaseに保存されていない
4. ❌ データプレビューでuser_idで表示される
5. ❌ Excel出力の個別選択に出てこない

---

## 🚨 緊急対応：Supabaseで直接修正

### ステップ1：現在の状態を確認

1. **Supabase Dashboard → SQL Editor**を開く
2. 以下のSQLを実行して現在の状態を確認：

```sql
-- 全ユーザーのプロフィールを確認
SELECT 
  user_id,
  email,
  display_name,
  created_at
FROM user_profiles
ORDER BY created_at DESC;
```

### ステップ2：mitamuraka@haguroko.ed.jp の display_name を更新

1. **SQL Editor**で以下のSQLを実行：

```sql
-- mitamuraka@haguroko.ed.jp の display_name を設定
UPDATE user_profiles 
SET display_name = '三田村 和真'
WHERE email = 'mitamuraka@haguroko.ed.jp';

-- 更新結果を確認
SELECT 
  user_id,
  email,
  display_name
FROM user_profiles
WHERE email = 'mitamuraka@haguroko.ed.jp';
```

**期待される結果：**
```
user_id: 0948a58e-6b9b-42ca-8088-e135d96e45aa
email: mitamuraka@haguroko.ed.jp
display_name: 三田村 和真
```

### ステップ3：他のユーザーも確認

```sql
-- display_name が NULL のユーザーを確認
SELECT 
  user_id,
  email,
  display_name
FROM user_profiles
WHERE display_name IS NULL OR display_name = '';
```

もし他にも display_name が空のユーザーがいる場合は、同様に更新してください。

---

## 🔍 根本原因の調査

### 原因1：user_profiles テーブルのスキーマ確認

```sql
-- user_profiles テーブルの構造を確認
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;
```

**必要なカラム：**
- `user_id` (UUID, PRIMARY KEY)
- `email` (TEXT, NOT NULL)
- `display_name` (TEXT, NULL) ← このカラムが存在するか確認

### もし display_name カラムが存在しない場合

```sql
-- display_name カラムを追加
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS display_name TEXT;
```

### 原因2：RLS（Row Level Security）ポリシーの確認

```sql
-- user_profiles テーブルのRLSポリシーを確認
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'user_profiles';
```

**必要なポリシー：**

```sql
-- ユーザーが自分のプロフィールを更新できるポリシー
CREATE POLICY "Users can update own profile"
ON user_profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- ユーザーが自分のプロフィールを挿入できるポリシー
CREATE POLICY "Users can insert own profile"
ON user_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- 全員が全プロフィールを読めるポリシー（管理者がExcel出力するため）
CREATE POLICY "Anyone can view profiles"
ON user_profiles
FOR SELECT
USING (true);
```

---

## ✅ 修正後の確認

### 1. アプリで確認

1. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）
2. アプリにログイン（`mitamuraka@haguroko.ed.jp`）
3. 右上のユーザー名が「三田村 和真」と表示されるか確認

### 2. データプレビューで確認

1. 管理者アカウントでログイン
2. 「📊 データプレビュー」を開く
3. ユーザー名が「三田村 和真」と表示されるか確認

### 3. Excel出力で確認

1. 管理者画面 → 「📄 Excel出力」
2. 「個別月次レポート」の職員選択ドロップダウンを開く
3. 「三田村 和真」が表示されるか確認

---

## 🛡️ 今後の対策

### 新規ユーザー登録時に必ず display_name を保存

アプリのコードで以下を確認済み：

1. **signup 関数**（`app/auth/actions.ts`）:
   - 新規登録時に `display_name` を `upsert` で保存
   
2. **handleSaveProfile 関数**（`app/page.tsx`）:
   - 氏名登録モーダルで `display_name` を `update`

### トリガーの設定（オプション）

新規ユーザー作成時に自動でプロフィールを作成するトリガー：

```sql
-- auth.users に新規ユーザーが作成されたら user_profiles を自動作成
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, display_name)
  VALUES (
    NEW.id, 
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '') -- signupのoptionsから取得
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- トリガーを作成
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## 📝 チェックリスト

修正後、以下を確認してください：

- [ ] Supabase Dashboard で `mitamuraka@haguroko.ed.jp` の `display_name` が「三田村 和真」になっている
- [ ] アプリのヘッダーに「三田村 和真」と表示される
- [ ] データプレビューで「三田村 和真」と表示される
- [ ] Excel出力の個別選択で「三田村 和真」が選べる
- [ ] 他のユーザー（友野工三、羽黒太郎、羽黒花子）も正しく表示される

すべてチェックが完了したら、問題は解決です！🎉
