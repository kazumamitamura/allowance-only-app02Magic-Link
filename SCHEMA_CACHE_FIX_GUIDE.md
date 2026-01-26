# スキーマキャッシュエラー（PGRST205）の解決ガイド

## 問題
`PGRST205: Could not find the table 'public.inquiries' in the schema cache`

このエラーは、テーブルは作成されているが、SupabaseのAPI層（PostgREST）のスキーマキャッシュが更新されていない場合に発生します。

## 解決方法（順番に試してください）

### 方法1: Supabase Dashboard からスキーマキャッシュをリフレッシュ

1. **Supabase Dashboard を開く**
   - https://supabase.com/dashboard にアクセス
   - プロジェクトを選択

2. **Settings → API に移動**
   - 左サイドバーから「Settings」をクリック
   - 「API」タブを選択

3. **スキーマキャッシュをリフレッシュ**
   - 「Reload schema cache」または「Refresh schema」ボタンを探す
   - ボタンが見つからない場合は、以下の方法を試してください

### 方法2: テーブルを削除して再作成（データが空の場合のみ）

**⚠️ 注意: この方法は既存のデータを削除します**

1. **Supabase Dashboard → SQL Editor を開く**
2. **`FORCE_REFRESH_SCHEMA.sql` の内容をコピー**
3. **SQL Editor に貼り付けて実行**
4. **数秒待つ**
5. **アプリケーションで再度お問い合わせを送信**

### 方法3: テーブルに直接アクセスしてキャッシュを更新

以下のSQLを Supabase Dashboard の SQL Editor で実行：

```sql
-- テーブルの存在を確認
SELECT COUNT(*) FROM inquiries;

-- テーブルの構造を確認
SELECT * FROM inquiries LIMIT 1;
```

### 方法4: Supabaseプロジェクトを再起動

1. **Supabase Dashboard → Settings → General**
2. **プロジェクトを一時停止**（Pause Project）
3. **数分待つ**
4. **プロジェクトを再開**（Resume Project）
5. **数分待ってから再度試す**

### 方法5: 手動でテーブルを確認して再作成

1. **Supabase Dashboard → Table Editor を開く**
2. **`inquiries` テーブルが存在するか確認**
3. **存在しない場合:**
   - `SETUP_INQUIRIES_AND_DOCUMENTS.sql` を再実行
4. **存在する場合:**
   - テーブルを一度削除
   - `FORCE_REFRESH_SCHEMA.sql` を実行して再作成

## 確認方法

スキーマキャッシュが更新されたかどうかを確認：

1. **Supabase Dashboard → Table Editor**
2. **`inquiries` テーブルが表示されるか確認**
3. **アプリケーションでお問い合わせフォームを開く**
4. **ブラウザのコンソール（F12）を開く**
5. **お問い合わせを送信**
6. **エラーが出なくなれば成功**

## トラブルシューティング

### まだエラーが出る場合

1. **ブラウザのキャッシュをクリア**
   - `Ctrl + Shift + Delete`（Windows）または `Cmd + Shift + Delete`（Mac）
   - キャッシュされたファイルと画像を削除

2. **ハードリロード**
   - `Ctrl + Shift + R`（Windows）または `Cmd + Shift + R`（Mac）

3. **別のブラウザで試す**
   - Chrome、Firefox、Edgeなど

4. **Supabaseのサポートに問い合わせ**
   - Dashboard → Support → Create a support ticket

## 補足情報

- スキーマキャッシュの更新には通常数秒から数分かかります
- 複数のテーブルを同時に作成した場合、すべてのテーブルが一度に更新されるとは限りません
- プロジェクトの再起動は最終手段として使用してください
