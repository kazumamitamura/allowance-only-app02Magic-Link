# Storageポリシーエラーの修正方法

## 🔍 エラーの原因

エラーメッセージを見ると、`bucket_id = 'documents'` が2回出現しています：

```
bucket_id = 'documents' bucket_id = 'documents' AND auth.role() = 'authenticated'
```

これは、SupabaseのStorageポリシー設定画面で、**既に `bucket_id = 'documents'` が自動的に追加されている**ためです。

## ✅ 正しい設定方法

### 方法1: `bucket_id` を削除する（推奨）

SupabaseのStorageポリシー設定では、**バケットを選択すると自動的に `bucket_id` 条件が追加される**ため、Policy definition には `bucket_id` を含めないでください。

#### ポリシー1: 認証ユーザーは資料を閲覧可能

**Policy definition** フィールドに、以下の**のみ**をコピーして貼り付けてください：

```
auth.role() = 'authenticated'
```

**⚠️ 注意**: `bucket_id = 'documents'` は含めないでください（自動的に追加されます）

#### ポリシー2: 管理者のみ資料をアップロード可能

**Policy definition** フィールドに、以下の**のみ**をコピーして貼り付けてください：

```
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.user_id = auth.uid()
  AND user_profiles.email IN (
    'mitamuraka@haguroko.ed.jp',
    'tomonoem@haguroko.ed.jp'
  )
)
```

**⚠️ 注意**: `bucket_id = 'documents'` は含めないでください（自動的に追加されます）

#### ポリシー3: 管理者のみ資料を削除可能

**Policy definition** フィールドに、以下の**のみ**をコピーして貼り付けてください（ポリシー2と同じ）：

```
EXISTS (
  SELECT 1 FROM user_profiles
  WHERE user_profiles.user_id = auth.uid()
  AND user_profiles.email IN (
    'mitamuraka@haguroko.ed.jp',
    'tomonoem@haguroko.ed.jp'
  )
)
```

**⚠️ 注意**: `bucket_id = 'documents'` は含めないでください（自動的に追加されます）

### 方法2: 既存のポリシーを削除して再作成

もし既に間違ったポリシーが作成されている場合は、削除してから再作成してください。

1. **Storage → Files → Policies → Buckets** セクション
2. 間違ったポリシーを探す（右側の「...」メニューから削除）
3. 上記の方法1で正しく再作成

## 📋 設定手順（詳細）

### ステップ1: ポリシー作成画面を開く

1. **Supabase Dashboard → Storage → Files** を開く
2. **「Policies」タブ** をクリック
3. **「Buckets」セクション** で `documents` バケットを探す
4. **「New policy」ボタン** をクリック

### ステップ2: ポリシー1を設定

1. **「For full customization」** を選択
2. 以下の設定を入力：
   - **Policy name**: `Authenticated users can view documents`
   - **Allowed operations**: `SELECT` にチェック
   - **Policy definition**: 以下の**のみ**をコピー（`bucket_id` は含めない）:
     ```
     auth.role() = 'authenticated'
     ```
3. **「Review」** → **「Create policy」** をクリック

### ステップ3: ポリシー2を設定

1. **「New policy」** をクリック
2. **「For full customization」** を選択
3. 以下の設定を入力：
   - **Policy name**: `Admins can upload documents`
   - **Allowed operations**: `INSERT` にチェック
   - **Policy definition**: 以下の**のみ**をコピー（`bucket_id` は含めない）:
     ```
     EXISTS (
       SELECT 1 FROM user_profiles
       WHERE user_profiles.user_id = auth.uid()
       AND user_profiles.email IN (
         'mitamuraka@haguroko.ed.jp',
         'tomonoem@haguroko.ed.jp'
       )
     )
     ```
4. **「Review」** → **「Create policy」** をクリック

### ステップ4: ポリシー3を設定

1. **「New policy」** をクリック
2. **「For full customization」** を選択
3. 以下の設定を入力：
   - **Policy name**: `Admins can delete documents`
   - **Allowed operations**: `DELETE` にチェック
   - **Policy definition**: 以下の**のみ**をコピー（`bucket_id` は含めない、ポリシー2と同じ）:
     ```
     EXISTS (
       SELECT 1 FROM user_profiles
       WHERE user_profiles.user_id = auth.uid()
       AND user_profiles.email IN (
         'mitamuraka@haguroko.ed.jp',
         'tomonoem@haguroko.ed.jp'
       )
     )
     ```
4. **「Review」** → **「Create policy」** をクリック

## ✅ 設定後の確認

ポリシーを正しく設定した後、以下のように表示されるはずです：

1. **Storage → Files → Policies → Buckets** セクション
2. `documents` バケットの下に、3つのポリシーが表示される
3. 各ポリシーをクリックして、Policy definition に `bucket_id` が含まれていないことを確認（Supabaseが自動的に追加します）

## 🧪 動作確認

ポリシーを設定した後、以下を確認してください：

1. **スキーマキャッシュをリフレッシュ**
   - Settings → API → 「Reload schema cache」

2. **アプリケーションで動作確認**
   - 管理者でログイン
   - 資料管理ページでPDFをアップロード
   - エラーが出ないか確認

## 📝 まとめ

- **`bucket_id = 'documents'` は含めないでください**
- Supabaseが自動的に `bucket_id` 条件を追加します
- Policy definition には、認証条件や管理者チェック条件のみを入力してください
