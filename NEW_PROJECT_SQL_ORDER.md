# 新規 Supabase プロジェクトで一から作る手順

**結論**: 以前の設定を引きずらないため、**新規プロジェクトを作成してから次の SQL だけ実行する**のがいちばん簡単で確実です。

---

## 1. 新規プロジェクトを作成する

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. **New project** で新しいプロジェクトを作成（リージョン・パスワードを設定）
3. 作成完了まで数分待つ

---

## 2. 実行する SQL の順番（この順で 1 回ずつ）

| 順番 | ファイル | 内容 |
|------|----------|------|
| **1** | **`setup.sql`** | テーブル・RLS・トリガーをまとめて作成（user_profiles, allowances, monthly_applications, inquiries, documents, annual_schedules, allowance_types, school_calendar など） |

**この 1 本だけ実行すれば十分です。**  
（`setup.sql` に全部入っています。）

### 実行手順

1. 新しいプロジェクトを開く → 左メニュー **SQL Editor** → **New query**
2. リポジトリの **`setup.sql`** を開き、**中身をすべてコピー**して SQL Editor に貼り付け
3. **Run** で実行
4. エラーが出ないことを確認

---

## 3. SQL のあとにやること（必須）

| やること | 場所 |
|----------|------|
| **メール確認をオフにする** | Authentication → **Providers** → **Email** → **Confirm email** のチェックを**外す** → Save |
| **環境変数を新しいプロジェクトに合わせる** | アプリ（Vercel など）の **Settings → Environment Variables** で、`NEXT_PUBLIC_SUPABASE_URL` と `NEXT_PUBLIC_SUPABASE_ANON_KEY` を**新プロジェクトの値**に変更 |

---

## 4. あると便利な作業（任意）

| やること | 説明 |
|----------|------|
| **Storage バケット「documents」を作成** | 規約 PDF などを置く場合。Storage → New bucket → 名前 `documents` → Create |
| **既存ユーザーを「確認済み」にする** | すでに登録したユーザーが「メール未確認」でログインできない場合だけ、SQL Editor で **`CONFIRM_EXISTING_USERS_EMAIL.sql`** を実行 |

---

## まとめ（実行順）

1. Supabase で **新規プロジェクト作成**
2. そのプロジェクトの **SQL Editor で `setup.sql` を 1 回だけ実行**
3. **Confirm email をオフ**にする
4. アプリの **環境変数** を新プロジェクトの URL・ANON KEY に更新
5. アプリを再デプロイ（またはブラウザで再読み込み）して、**新規登録**からやり直す

以前のプロジェクトのデータは使わず、新プロジェクトだけで動かす想定です。ログインは「新規登録」で作り直したアカウントで行ってください。
