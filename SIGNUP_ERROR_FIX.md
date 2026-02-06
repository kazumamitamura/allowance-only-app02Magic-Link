# 新規登録エラー「Database error saving new user」の対処

## まず試すこと（推奨）

**手当アプリが接続している Supabase プロジェクト**で、次の1本を実行してください。

1. Supabase Dashboard → **SQL Editor** → New query
2. プロジェクト内の **`RUN_SIGNUP_FIX_ALL.sql`** の内容をすべてコピーして貼り付け
3. **Run** で実行する（エラーが出ないことを確認）
4. アプリの新規登録画面でもう一度「新規登録してログイン」を試す

この SQL で **user_profiles テーブルとトリガー** に加え、**profiles テーブルがある場合の NOT NULL/CHECK 制約** もまとめて直します。多くの場合はこれで登録できるようになります。

---

## 症状

新規登録画面で「新規登録してログイン」を押すと、次のメッセージが表示される：

**「登録に失敗しました: Database error saving new user」**

Auth ログに **`/signup | 500: Database error saving new user`** が出ている状態です。

## 以前は登録できていたのに、今エラーが出る場合

以前は新規登録が成功していたのに、今はエラーが出る場合は、**user_profiles テーブルやトリガーが削除された**可能性があります。

### 診断手順

1. Supabase Dashboard → **SQL Editor** → New query
2. **`CHECK_SIGNUP_STATUS.sql`** の内容をコピーして貼り付け、**Run** で実行
3. 結果を確認：
   - **✗** が表示された項目があれば、それが原因です
   - すべて **✓** でもエラーが出る場合は、**profiles テーブルの NOT NULL 制約**を確認してください

### 対処

診断結果に **✗** がある場合、または原因が分からない場合は、**`RUN_SIGNUP_FIX_ALL.sql`** を実行してください。これで user_profiles とトリガーを再作成し、profiles の制約も緩和します。

## 重要：どこの Supabase で実行するか

**手当アプリが実際に使っている Supabase プロジェクト** で SQL を実行してください。

- ブラウザで開いている Supabase のプロジェクト名（例: Master-Portfolio-DB）が、**手当アプリの環境変数 `NEXT_PUBLIC_SUPABASE_URL` の URL に含まれるプロジェクト**と一致しているか確認してください。
- 一致していない場合：Supabase のプロジェクト一覧から、手当アプリ用のプロジェクトを選んでから SQL Editor を開き、そこで以下を実行してください。

**確認用**: 先に **`CHECK_PROFILES_TABLE.sql`** を実行すると、このプロジェクトに `profiles` テーブルがあるか・`name` の状態が分かります。結果が 1 行以上出れば、このプロジェクトで **`FIX_PROFILES_NAME_CONSTRAINT.sql`** を実行して問題ありません。

## 原因

Supabase で新規ユーザー（`auth.users`）を作成する際、次のいずれかで失敗しています。

1. **`user_profiles` テーブルが存在しない**  
   新規ユーザー作成時にプロフィールを挿入するトリガーやアプリの処理が、存在しないテーブルに挿入しようとして失敗している。
2. **`auth.users` にトリガーがあるが、権限不足**  
   トリガー関数が RLS（Row Level Security）でブロックされ、`user_profiles` への挿入に失敗している。

## 解決手順（推奨）

### 1. Supabase で SQL を実行する

1. **Supabase Dashboard** を開く  
   https://app.supabase.com でプロジェクトを選択
2. 左メニューから **SQL Editor** を開く
3. **New query** で新規クエリを作成
4. プロジェクト内の **`FIX_SIGNUP_USER_PROFILES.sql`** の内容をすべてコピーして貼り付け
5. **Run**（または Ctrl+Enter）で実行する
6. エラーが出ないことを確認する

この SQL で行うこと：

- `user_profiles` テーブルが無ければ作成する
- 新規ユーザー作成時に `user_profiles` に1行挿入する **トリガー** を、権限を正しく設定して作成する（`SECURITY DEFINER`）
- 既存の `auth.users` のうち、`user_profiles` にまだいないユーザーを補完する

### 2. 再度新規登録を試す

1. アプリの **新規登録** 画面に戻る  
   （例: https://haguro-allowance-app.vercel.app/login → 「新規登録」タブ）
2. 氏名・メールアドレス・パスワードを入力して **「新規登録してログイン」** を押す
3. エラーが出ずにトップ画面に遷移すれば対処完了です

## エラーが「profiles」の name / grade / class_name の場合（Auth ログに 23502 と出る場合）

Auth ログに次のように出ている場合：

- `null value in column "name" of relation "profiles" violates not-null constraint (SQLSTATE 23502)`
- `null value in column "grade" of relation "profiles" violates not-null constraint (SQLSTATE 23502)`
- `null value in column "class_name" of relation "profiles" violates not-null constraint (SQLSTATE 23502)`
- **`new row for relation "profiles" violates check constraint "profiles_class_name_check" (SQLSTATE 23514)`** → `class_name` に CHECK 制約があり、トリガーが入れる値が許可されていません。**`FIX_PROFILES_CLASS_NAME_CHECK.sql`** を実行して制約を削除してください。

**原因**: Supabase 側の **`public.profiles`** に、NOT NULL のカラム（`name`・`grade`・`class_name` など）があり、新規ユーザー作成時のトリガーがそれらを設定していないため挿入に失敗しています。

**対処（この手順で解決します）**:

1. **手当アプリ用の Supabase プロジェクト**を開く（上記「重要」を参照）
2. **SQL Editor** → **New query**
3. **`FIX_PROFILES_ALL_NULLABLE.sql`** の内容をすべてコピーして貼り付け、**Run** で実行する  
   - `name`・`grade`・`class_name` のうち存在するカラムが、NULL 可・デフォルト空文字になります。最後の SELECT で `is_nullable = YES` になっていれば OK です。
4. アプリの新規登録画面に戻り、もう一度「新規登録してログイン」を実行する

これで登録が通るようになります。氏名はアプリ側で `user_profiles.display_name` に保存されるため、`profiles` の該当カラムが空でも問題ありません。

**SQL を実行したのにまだ登録できない場合**:
- エラーになっているのは **`profiles`** テーブルです（`user_profiles`・`allowance_users` ではありません）。PostgreSQL のテーブル名はハイフンではなく **アンダースコア**（`user_profiles` / `allowance_users`）です。
- **`CHECK_PROFILES_NOT_NULL_COLUMNS.sql`** の結果で **`email`** が `is_nullable: NO` かつ `column_default: NULL` の場合は、トリガーが `email` を入れていない可能性が高いです。**`FIX_PROFILES_EMAIL_NULLABLE.sql`** を実行して `email` を NULL 可にしてください。
- その他の NOT NULL カラムもまとめて直す場合は **`FIX_PROFILES_EVERY_COLUMN_NULLABLE.sql`** を実行してください（**id 以外**の全カラムを NULL 可にします）。
- 必ず **手当アプリの環境変数（NEXT_PUBLIC_SUPABASE_URL）と同じ Supabase プロジェクト** で実行してください。別プロジェクトで実行しても本番の登録は直りません。

**個別に直したい場合**: `name` だけなら **`FIX_PROFILES_NAME_CONSTRAINT.sql`** のみ実行しても構いません。

**エラーが出る場合**:
- `relation "public.profiles" does not exist` → 今開いている Supabase プロジェクトが手当アプリ用ではない可能性があります。環境変数 `NEXT_PUBLIC_SUPABASE_URL` のプロジェクトを開き直してください。

## それでも失敗する場合

- **Supabase → Logs → Auth logs** で、登録時のエラー内容を確認する
- **Supabase → Logs → Postgres logs** で、トリガー実行時のエラーが出ていないか確認する
- `user_profiles` が別の SQL（例: `SETUP_INQUIRIES_AND_DOCUMENTS.sql`）で既に作成されている場合は、**トリガー部分だけ**（`FIX_SIGNUP_USER_PROFILES.sql` の「2. トリガー関数」と「3. トリガー」）を実行しても構いません。その場合、テーブル作成部分はスキップしてください。

## 参考

- [Supabase: Database error saving new user](https://supabase.com/docs/guides/troubleshooting/database-error-saving-new-user-RU_EwB)
- 本プロジェクトの `SETUP_INQUIRIES_AND_DOCUMENTS.sql` にも `user_profiles` の定義があります。先にこちらを実行している場合は、上記の「トリガー関数」と「トリガー」の作成だけを実行すればよい場合があります。
