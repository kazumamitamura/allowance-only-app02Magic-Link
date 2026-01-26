# Storageポリシー設定のUI問題の解決方法

## 🔍 問題の詳細

ユーザーが報告している問題：
1. 「Buckets」セクションの「New policy」ボタンをクリックして作成する
2. `bucket_id = 'documents'` を削除してSQLコードを入力すると、自動的に「Schema」セクションに移動してしまう
3. `bucket_id = 'documents'` を削除しないでコードを入力するとエラーが出る

## ✅ 解決方法

### 方法1: バケット選択を確認する

「Buckets」セクションでポリシーを作成する際、**バケットが正しく選択されているか確認**してください。

1. **「Buckets」セクション**で `documents` バケットを探す
2. `documents` バケットの右側にある**「New policy」ボタン**をクリック
3. **ポリシー作成画面で、バケット選択を確認**
   - 画面上部に「Bucket: documents」と表示されているか確認
   - 表示されていない場合は、バケットを選択してください

### 方法2: Policy definition に `bucket_id` を含める（正しい方法）

実は、**「Buckets」セクションでポリシーを作成する場合でも、Policy definition に `bucket_id` を含める必要がある**場合があります。

#### ポリシー1: 認証ユーザーは資料を閲覧可能

**Policy definition** フィールドに、以下の**すべて**をコピーして貼り付けてください：

```
bucket_id = 'documents' AND auth.role() = 'authenticated'
```

**⚠️ 注意**: 
- `bucket_id = 'documents'` を含めてください
- `AND` でつなげてください

#### ポリシー2: 管理者のみ資料をアップロード可能

**Policy definition** フィールドに、以下の**すべて**をコピーして貼り付けてください：

```
bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.user_id = auth.uid()
  AND user_profiles.email IN (
    'mitamuraka@haguroko.ed.jp',
    'tomonoem@haguroko.ed.jp'
  )
)
```

#### ポリシー3: 管理者のみ資料を削除可能

**Policy definition** フィールドに、以下の**すべて**をコピーして貼り付けてください（ポリシー2と同じ）：

```
bucket_id = 'documents' AND EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.user_id = auth.uid()
  AND user_profiles.email IN (
    'mitamuraka@haguroko.ed.jp',
    'tomonoem@haguroko.ed.jp'
  )
)
```

### 方法3: 「Schema」セクションで作成する（代替方法）

もし「Buckets」セクションで作成できない場合は、「Schema」セクションで作成することも可能です。

1. **「Schema」セクション**の「OTHER POLICIES UNDER STORAGE.OBJECTS」の**「New policy」ボタン**をクリック
2. 上記の方法2と同じSQLコードを入力（`bucket_id = 'documents'` を含める）
3. これで、`documents` バケット専用のポリシーが作成されます

## 🔍 エラーが出る場合の確認事項

### エラー: 「syntax error at or near "bucket_id"」

**原因**: `bucket_id = 'documents'` が重複している

**解決方法**: 
- Policy definition に `bucket_id = 'documents'` を**1回だけ**含めてください
- 既存の `bucket_id` 条件がある場合は、削除してから新しいコードを貼り付けてください

### エラー: ポリシーが「Schema」セクションに移動する

**原因**: Policy definition に `bucket_id` が含まれていない、またはバケットが選択されていない

**解決方法**: 
- Policy definition に `bucket_id = 'documents'` を含めてください
- または、バケット選択を確認してください

## 📋 推奨される手順

### ステップ1: 「Buckets」セクションで作成を試す

1. **「Buckets」セクション**で `documents` バケットを探す
2. `documents` バケットの右側にある**「New policy」ボタン**をクリック
3. **バケット選択を確認**（画面上部に「Bucket: documents」と表示されているか）
4. Policy definition に、上記の方法2のSQLコードを入力（`bucket_id = 'documents'` を含める）

### ステップ2: エラーが出る場合は「Schema」セクションで作成

1. **「Schema」セクション**の「OTHER POLICIES UNDER STORAGE.OBJECTS」の**「New policy」ボタン**をクリック
2. 上記の方法2と同じSQLコードを入力（`bucket_id = 'documents'` を含める）
3. これで、`documents` バケット専用のポリシーが作成されます

## ✅ 設定後の確認

ポリシーを正しく設定した後、以下のように表示されるはずです：

1. **「Buckets」セクション**または**「Schema」セクション**に、3つのポリシーが表示される
2. 各ポリシーのPolicy definition に `bucket_id = 'documents'` が含まれている
3. アプリケーションでPDFのアップロード・ダウンロードが正常に動作する

## 🧪 動作確認

ポリシーを正しく設定した後、以下を確認してください：

1. **スキーマキャッシュをリフレッシュ**
   - Settings → API → 「Reload schema cache」

2. **アプリケーションで動作確認**
   - 管理者でログイン
   - 資料管理ページでPDFをアップロード
   - エラーが出ないか確認

## 📝 まとめ

- **Policy definition に `bucket_id = 'documents'` を含めてください**
- 「Buckets」セクションで作成できない場合は、「Schema」セクションで作成しても問題ありません
- 重要なのは、Policy definition に `bucket_id = 'documents'` が含まれていることです
