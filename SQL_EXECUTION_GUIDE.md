# SQL実行ガイド

## ✅ 正しい実行場所

**Supabase Dashboard の SQL Editor** で実行するのが正しいです。

## 📋 実行手順（詳細）

### ステップ1: Supabase Dashboard にアクセス

1. https://supabase.com/dashboard にアクセス
2. ログイン
3. **正しいプロジェクトを選択**（Master-Portfolio-DB など）

### ステップ2: SQL Editor を開く

1. 左サイドバーから **「SQL Editor」** をクリック
2. 新しいクエリタブが開きます

### ステップ3: SQLファイルの内容をコピー

1. **`SETUP_INQUIRIES_AND_DOCUMENTS.sql`** ファイルを開く
   - エディタ（VS Code、Cursor など）で開く
   - **⚠️ 重要**: `.sql` ファイルを直接開いてください
   - Markdownファイル（`.md`）内のコードブロックは使わないでください

2. **ファイルの内容をすべてコピー**
   - `Ctrl + A`（Windows）または `Cmd + A`（Mac）で全選択
   - `Ctrl + C`（Windows）または `Cmd + C`（Mac）でコピー
   - **⚠️ 注意**: 最初の行（`-- ========================================`）から最後の行まで、すべてコピーしてください

### ステップ4: SQL Editor に貼り付けて実行

1. SQL Editor の編集エリアをクリック
2. `Ctrl + V`（Windows）または `Cmd + V`（Mac）で貼り付け
3. **「Run」ボタン**（または `Ctrl + Enter`）をクリック
4. 実行結果を確認
   - **成功**: "Success. No rows returned." または "Success. X rows returned."
   - **エラー**: エラーメッセージが表示される

## 🔍 よくある問題と解決方法

### 問題1: 「relation does not exist」エラー

**原因**: テーブルがまだ作成されていない

**解決方法**:
- `SETUP_INQUIRIES_AND_DOCUMENTS.sql` を最初から最後まで実行してください
- エラーが出た場合は、エラーメッセージを確認してください

### 問題2: 「policy already exists」エラー

**原因**: ポリシーが既に存在している

**解決方法**:
- このエラーは無視して大丈夫です
- SQLファイルには `DROP POLICY IF EXISTS` が含まれているので、再実行しても問題ありません

### 問題3: 「schema cache」エラー（PGRST205）

**原因**: PostgRESTのスキーマキャッシュが更新されていない

**解決方法**:
1. Supabase Dashboard → Settings → API を開く
2. 「Reload schema cache」または「Refresh schema」ボタンをクリック
3. 数秒待つ
4. アプリケーションで再度試す

### 問題4: SQLが実行されない

**確認事項**:
- ✅ 正しいプロジェクトを選択しているか
- ✅ SQL Editor のタブが開いているか
- ✅ SQLコードが正しく貼り付けられているか（コメント行も含む）
- ✅ 「Run」ボタンをクリックしたか

## 📝 実行後の確認

SQLを実行した後、以下のクエリでテーブルが作成されたか確認してください：

```sql
-- テーブルの存在確認
SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

SELECT 
  'documents' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;
```

## ⚠️ 重要な注意事項

1. **Markdownのコードブロック記号（```sql と ```）は含めない**
   - `.sql` ファイルを直接開いてコピーしてください

2. **すべてのSQLコードを実行する**
   - ファイルの最初から最後まで、すべてのSQLコードを実行してください
   - 一部だけを実行すると、エラーが発生する可能性があります

3. **正しいプロジェクトを選択**
   - 複数のSupabaseプロジェクトがある場合、正しいプロジェクトを選択しているか確認してください

4. **実行結果を確認**
   - エラーが出た場合は、エラーメッセージを確認してください
   - 成功した場合は、テーブルが作成されたか確認してください

## 🆘 まだ問題が解決しない場合

1. **エラーメッセージを確認**
   - SQL Editor に表示されたエラーメッセージをコピーしてください

2. **ブラウザのコンソールを確認**
   - `F12` キーを押して開発者ツールを開く
   - Console タブでエラーを確認

3. **Supabase Dashboard の Table Editor で確認**
   - Table Editor を開く
   - `inquiries` と `documents` テーブルが表示されるか確認

4. **サポートに問い合わせ**
   - エラーメッセージとスクリーンショットを添付して、問題を報告してください
