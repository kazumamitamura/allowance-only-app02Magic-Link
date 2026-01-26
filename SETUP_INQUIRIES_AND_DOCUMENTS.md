# 問い合わせ機能とPDF管理機能のセットアップガイド

このドキュメントでは、新しく追加された「問い合わせ機能」と「PDF管理機能」のセットアップ手順を説明します。

## 📋 目次

1. [データベースのセットアップ](#データベースのセットアップ)
2. [Supabase Storage のセットアップ](#supabase-storage-のセットアップ)
3. [メール通知機能のセットアップ（オプション）](#メール通知機能のセットアップオプション)
4. [機能の確認](#機能の確認)

---

## データベースのセットアップ

### ステップ1: SQLファイルの実行

1. Supabase Dashboard にログインします
2. **SQL Editor** を開きます
3. `SETUP_INQUIRIES_AND_DOCUMENTS.sql` ファイルの内容をコピーします
   - **⚠️ 重要**: `.sql` ファイルを直接開いて、その内容をコピーしてください
   - Markdownファイル（`.md`）内のコードブロック（```sql ... ```）はコピーしないでください
4. SQL Editor に貼り付けて実行します

これにより、以下のテーブルが作成されます：
- `inquiries` - 問い合わせデータ
- `documents` - PDF資料のメタデータ

### ステップ2: テーブルの確認

SQL Editor で以下のクエリを実行して、テーブルが正しく作成されたか確認します：

**⚠️ 重要: 以下のSQLコードのみをコピーしてください。Markdownのコードブロック記号（```）は含めないでください。**

```sql
-- 問い合わせテーブルの確認
SELECT * FROM inquiries LIMIT 1;

-- 資料テーブルの確認
SELECT * FROM documents LIMIT 1;
```

**コピーする内容（```sql と ``` は除く）:**
```
-- 問い合わせテーブルの確認
SELECT * FROM inquiries LIMIT 1;

-- 資料テーブルの確認
SELECT * FROM documents LIMIT 1;
```

---

## Supabase Storage のセットアップ

### ステップ1: Storage バケットの作成

1. Supabase Dashboard で **Storage** セクションに移動します
2. **"New bucket"** ボタンをクリックします
3. 以下の設定を入力します：
   - **Name**: `documents`
   - **Public bucket**: **チェックを外す**（プライベートバケット）
4. **"Create bucket"** をクリックします

### ステップ2: Storage ポリシーの設定

Storage バケットを作成した後、以下のポリシーを設定します：

#### ポリシー1: 認証ユーザーは資料を閲覧可能

1. Storage > `documents` バケット > **Policies** タブに移動
2. **"New Policy"** をクリック
3. **"For full customization"** を選択
4. 以下の設定を入力：
   - **Policy name**: `Authenticated users can view documents`
   - **Allowed operation**: `SELECT`
   - **Policy definition**: 以下のSQLコードのみをコピー（```sql と ``` は除く）:
     ```
     auth.role() = 'authenticated'
     ```
5. **"Review"** をクリックして保存

#### ポリシー2: 管理者のみ資料をアップロード可能

1. **"New Policy"** をクリック
2. **"For full customization"** を選択
3. 以下の設定を入力：
   - **Policy name**: `Admins can upload documents`
   - **Allowed operation**: `INSERT`
   - **Policy definition**: 以下のSQLコードのみをコピー（```sql と ``` は除く）:
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
4. **"Review"** をクリックして保存

#### ポリシー3: 管理者のみ資料を削除可能

1. **"New Policy"** をクリック
2. **"For full customization"** を選択
3. 以下の設定を入力：
   - **Policy name**: `Admins can delete documents`
   - **Allowed operation**: `DELETE`
   - **Policy definition**: 以下のSQLコードのみをコピー（```sql と ``` は除く）:
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
4. **"Review"** をクリックして保存

---

## メール通知機能のセットアップ（オプション）

問い合わせ受信時に管理者にメール通知を送信するには、以下のいずれかの方法を実装します。

### オプション1: Resend を使用（推奨）

1. [Resend](https://resend.com) にアカウントを作成します
2. API キーを取得します
3. `.env.local` ファイルに以下を追加：
   ```env
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   NEXT_PUBLIC_SITE_URL=https://your-domain.com
   ```
4. `package.json` に Resend を追加：
   ```bash
   npm install resend
   ```
5. `app/contact/email-service.ts` のコメントアウトされたコードを有効化します

### オプション2: Supabase Edge Functions を使用

1. Supabase Dashboard で **Edge Functions** セクションに移動
2. 新しい Edge Function を作成
3. メール送信ロジックを実装

### オプション3: その他のメールサービス

- SendGrid
- Mailgun
- AWS SES
- Nodemailer (SMTP)

---

## 機能の確認

### 問い合わせ機能の確認

1. 一般ユーザーとしてログインします
2. メイン画面のヘッダーから **"📧 お問い合わせ"** をクリックします
3. 問い合わせフォームに件名とメッセージを入力して送信します
4. 管理者としてログインします
5. 管理者ダッシュボードから **"📧 お問い合わせ管理"** をクリックします
6. 送信した問い合わせが表示されることを確認します

### PDF管理機能の確認

1. 管理者としてログインします
2. 管理者ダッシュボードから **"📄 資料管理"** をクリックします
3. PDFファイルをアップロードします
4. 一般ユーザーとしてログインします
5. メイン画面のヘッダーから **"📄 規約・資料"** をクリックします
6. アップロードしたPDFが表示され、ダウンロードできることを確認します

---

## トラブルシューティング

### 問い合わせが保存されない

- Supabase の `inquiries` テーブルが正しく作成されているか確認
- RLS ポリシーが正しく設定されているか確認
- ブラウザのコンソールでエラーメッセージを確認

### PDFがアップロードできない

- Supabase Storage の `documents` バケットが作成されているか確認
- Storage ポリシーが正しく設定されているか確認
- ファイルサイズが10MB以下であることを確認
- ファイル形式がPDFであることを確認

### PDFがダウンロードできない

- Storage ポリシーで `SELECT` 操作が許可されているか確認
- ブラウザのコンソールでエラーメッセージを確認

### メール通知が届かない

- メール送信サービス（Resend等）の設定が完了しているか確認
- `.env.local` に環境変数が正しく設定されているか確認
- `app/contact/email-service.ts` のコードが有効化されているか確認

---

## 追加のカスタマイズ

### 管理者メールアドレスの変更

管理者メールアドレスを変更する場合は、以下のファイルを編集してください：

- `app/contact/actions.ts`
- `app/contact/email-service.ts`
- `app/admin/inquiries/page.tsx`
- `app/admin/documents/page.tsx`
- `SETUP_INQUIRIES_AND_DOCUMENTS.sql`（RLS ポリシー部分）

### ファイルサイズ制限の変更

PDFファイルのサイズ制限を変更する場合は、`app/admin/documents/page.tsx` の以下の部分を編集：

```typescript
if (file.size > 10 * 1024 * 1024) {
  alert('ファイルサイズは10MB以下にしてください')
  return
}
```

---

## 完了

セットアップが完了したら、以下の機能が使用可能になります：

✅ ユーザーが管理者に問い合わせを送信できる  
✅ 管理者が問い合わせを確認・管理できる  
✅ 管理者がPDF資料をアップロードできる  
✅ ユーザーがPDF資料を閲覧・ダウンロードできる  
✅ （オプション）問い合わせ受信時に管理者にメール通知が送信される

問題が発生した場合は、ブラウザのコンソールや Supabase Dashboard のログを確認してください。
