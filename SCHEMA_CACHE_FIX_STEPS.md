# スキーマキャッシュエラー（PGRST205）の解決手順

## 🔍 エラーの原因

`PGRST205: Could not find the table 'public.inquiries' in the schema cache`

このエラーは、テーブルは作成されているが、SupabaseのAPI層（PostgREST）のスキーマキャッシュが更新されていないために発生します。

## ✅ 解決手順（順番に試してください）

### ステップ1: SQL Editor でテーブルに直接アクセス（推奨）

1. **Supabase Dashboard → SQL Editor** を開く
2. 以下のSQLを実行：

```sql
-- テーブルの存在を確認
SELECT 
  'inquiries' as table_name,
  CASE 
    WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'inquiries')
    THEN '✓ 存在します'
    ELSE '✗ 存在しません'
  END as status;

-- テーブルに直接アクセスしてキャッシュを更新
SELECT COUNT(*) FROM inquiries;
```

3. **結果を確認**:
   - 「✓ 存在します」と表示されれば、テーブルは作成されています
   - `COUNT(*)` が正常に実行されれば、テーブルにアクセスできます

### ステップ2: Supabase Dashboard からスキーマキャッシュをリフレッシュ

1. **Supabase Dashboard → Settings → API** を開く
2. **「Reload schema cache」** または **「Refresh schema」** ボタンを探す
   - ボタンが見つからない場合は、ステップ3を試してください
3. **ボタンをクリック**
4. **数秒待つ**（キャッシュが更新されるまで）

### ステップ3: ブラウザのキャッシュをクリア

1. **ブラウザで `Ctrl + Shift + Delete`**（Windows）または `Cmd + Shift + Delete`（Mac）
2. **「キャッシュされたファイルと画像」**を選択して削除
3. **ブラウザを再起動**

### ステップ4: アプリケーションで再度試す

1. **アプリケーションにログイン**
2. **「📧 お問い合わせ」ボタン**をクリック
3. **件名とメッセージを入力**して送信
4. **エラーが出ないか確認**

### ステップ5: 少し待つ（自動更新を待つ）

通常、テーブルを作成してから5-10分で自動的にスキーマキャッシュが更新されます。

1. **5-10分待つ**
2. **ブラウザをハードリロード**（`Ctrl + Shift + R`）
3. **アプリケーションで再度試す**

### ステップ6: Supabaseプロジェクトを再起動（最終手段）

1. **Supabase Dashboard → Settings → General**
2. **プロジェクトを一時停止**（Pause Project）
3. **数分待つ**
4. **プロジェクトを再開**（Resume Project）
5. **数分待ってから再度試す**

## 🔍 テーブルが存在しない場合

もしステップ1で「✗ 存在しません」と表示された場合は、テーブルが作成されていません。

**解決方法**:
1. **`SETUP_INQUIRIES_AND_DOCUMENTS.sql`** を再実行してください
2. エラーが出た場合は、エラーメッセージを確認してください

## 📝 確認方法

スキーマキャッシュが更新されたかどうかを確認するには：

1. **ブラウザのコンソール**（F12 → Console）を開く
2. **アプリケーションで「📧 お問い合わせ」を開く**
3. **問い合わせを送信**
4. **エラーが出なくなれば成功**

## 🆘 まだエラーが出る場合

1. **エラーメッセージを確認**（画面に表示されたもの）
2. **ブラウザのコンソール**（F12 → Console）でエラーの詳細を確認
3. **Supabase Dashboard の Logs** セクションでエラーを確認
4. **上記の手順をすべて試したか確認**
