# allowance-app-simple プロジェクトの修正手順

対象 Supabase プロジェクト: **allowance-app-simple**  
URL: https://supabase.com/dashboard/project/plzhnarbdazwzfuxogfe

---

## 実行する SQL

1. 上記 URL で Supabase Dashboard を開く
2. 左メニュー **SQL Editor** → **New query**
3. リポジトリ内の **`RUN_IN_ALLOWANCE_APP_SIMPLE.sql`** の内容をすべてコピーして貼り付け
4. **Run**（または Ctrl+Enter）で実行
5. エラーが出た場合はメッセージを確認し、該当するステップだけスキップするか、エラー内容に合わせて修正

---

## この SQL で行うこと

| 番号 | 内容 |
|------|------|
| 1 | `user_profiles.id` がある場合、デフォルト値を設定（トリガー用） |
| 2 | `user_profiles.updated_at` がない場合に追加 |
| 3 | 新規ユーザー作成時に `user_profiles` に氏名（full_name）を保存するトリガーを設定 |
| 5–7 | RLS ポリシー（自分のプロフィールの INSERT/UPDATE、管理者の SELECT） |
| 8 | RLS 有効化 |
| 9 | 既存の auth.users のうち、user_profiles にいないユーザーを 1 件ずつ補完 |

---

## 注意

- **テーブル構造**: `user_profiles` に `user_id` カラムがあることを前提にしています。`id` が PK で `user_id` が別カラムの構成でも動作するようにしています。
- **重複**: 9 の INSERT で「重複」エラーが出る場合は、該当ユーザーはすでに `user_profiles` にいるため、そのステップはスキップしてかまいません。
- アプリの環境変数（`NEXT_PUBLIC_SUPABASE_URL` など）が、この **allowance-app-simple** のプロジェクト URL になっているかもあわせて確認してください。
