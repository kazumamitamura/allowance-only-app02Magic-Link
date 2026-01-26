# トラブルシューティングガイド

## エラー: 「問い合わせテーブルが作成されていません」

### 確認手順

1. **Supabase Dashboard でテーブルの存在を確認**
   - Supabase Dashboard → Table Editor
   - `inquiries` テーブルが存在するか確認
   - `documents` テーブルが存在するか確認
   - `user_profiles` テーブルが存在するか確認

2. **SQLでテーブルを確認**
   - `CHECK_TABLES.sql` を実行して、テーブルが作成されているか確認

3. **SQLファイルを再実行**
   - `SETUP_INQUIRIES_AND_DOCUMENTS.sql` を再度実行
   - エラーが出た場合は、エラーメッセージを確認

### よくある問題と解決方法

#### 問題1: テーブルは存在するが、エラーが出る

**原因**: RLS（Row Level Security）ポリシーが正しく設定されていない可能性があります。

**解決方法**:
```sql
-- RLSポリシーを確認
SELECT * FROM pg_policies WHERE tablename = 'inquiries';

-- ポリシーを再作成
DROP POLICY IF EXISTS "Users can view their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Users can create their own inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can view all inquiries" ON inquiries;
DROP POLICY IF EXISTS "Admins can update all inquiries" ON inquiries;

-- ポリシーを再作成（SETUP_INQUIRIES_AND_DOCUMENTS.sql から該当部分をコピー）
```

#### 問題2: SQL実行時にエラーが出る

**原因**: 既存のテーブルやポリシーと競合している可能性があります。

**解決方法**:
- `SETUP_INQUIRIES_AND_DOCUMENTS.sql` は `DROP POLICY IF EXISTS` と `CREATE TABLE IF NOT EXISTS` を使用しているので、何度でも実行できます
- エラーが出ても、その後の処理は続行されます

#### 問題3: ブラウザのキャッシュ

**解決方法**:
- `Ctrl + Shift + R` (Windows) または `Cmd + Shift + R` (Mac) でハードリロード
- ブラウザのキャッシュをクリア

---

## エラー: 「Bucket not found」

### 確認手順

1. **Supabase Dashboard で Storage バケットを確認**
   - Supabase Dashboard → Storage
   - `documents` バケットが存在するか確認

2. **バケットが存在しない場合**
   - Storage → New bucket
   - Name: `documents`
   - Public bucket: **チェックを外す**
   - Create bucket

3. **Storage ポリシーを設定**
   - Storage → `documents` → Policies
   - 3つのポリシーを設定（SETUP_INQUIRIES_AND_DOCUMENTS.md を参照）

---

## デバッグ方法

### ブラウザのコンソールを確認

1. `F12` キーを押して開発者ツールを開く
2. **Console** タブを確認
3. エラーメッセージをコピー

### Supabase のログを確認

1. Supabase Dashboard → Logs
2. API ログを確認
3. エラーメッセージを確認

---

## テーブル作成確認SQL

`CHECK_TABLES.sql` を実行して、テーブルが正しく作成されているか確認してください。
