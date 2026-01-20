# 🔧 Supabase 設定ガイド（緊急対応）

## 問題の原因

新規登録後にログインできない原因は、**Supabaseのメール確認設定**が有効になっているためです。
メール確認が完了していないユーザーはログインできません。

---

## ✅ 解決手順

### **ステップ1：メール確認を無効化する**

1. **Supabase Dashboardにアクセス**
   - URL: https://supabase.com/dashboard/project/plzhnarbdazwfuxoqfe

2. **左メニューから「Authentication」をクリック**

3. **「Providers」タブをクリック**

4. **「Email」プロバイダーの設定を開く**
   - 「Email」の行にある歯車アイコンまたは「Edit」をクリック

5. **「Confirm email」をOFFにする**
   - 「Confirm email」のトグルスイッチを**無効（OFF）**に設定
   - これにより、新規登録時にメール確認が不要になります

6. **「Save」をクリック**

---

### **ステップ2：既存ユーザーのメール確認ステータスを確認済みにする**

現在登録されているユーザーがメール未確認のため、ログインできません。
以下のSQLを実行して、すべてのユーザーを確認済みにします。

1. **左メニューから「SQL Editor」をクリック**

2. **「New query」をクリック**

3. **以下のSQLをコピー＆ペーストして実行**

```sql
-- すべてのユーザーのメール確認を完了させる
UPDATE auth.users 
SET email_confirmed_at = NOW(),
    confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;

-- 確認: ユーザー一覧を表示
SELECT 
  id,
  email,
  email_confirmed_at,
  created_at
FROM auth.users
ORDER BY created_at DESC;
```

4. **「Run」ボタンをクリック**

5. **結果を確認**
   - すべてのユーザーの `email_confirmed_at` カラムに日時が入っていればOK

---

### **ステップ3：ユーザー削除を可能にする（カスケード削除設定）**

ユーザーを削除できない原因は、関連テーブル（`user_profiles`, `allowances`など）にデータが残っているためです。
以下のSQLで外部キー制約を修正し、ユーザー削除時に関連データも自動削除されるようにします。

1. **SQL Editorで新しいクエリを作成**

2. **以下のSQLをコピー＆ペーストして実行**

```sql
-- user_profiles テーブルのカスケード削除設定
ALTER TABLE user_profiles
DROP CONSTRAINT IF EXISTS user_profiles_user_id_fkey,
ADD CONSTRAINT user_profiles_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- allowances テーブルのカスケード削除設定
ALTER TABLE allowances
DROP CONSTRAINT IF EXISTS allowances_user_id_fkey,
ADD CONSTRAINT allowances_user_id_fkey 
  FOREIGN KEY (user_id) 
  REFERENCES auth.users(id) 
  ON DELETE CASCADE;

-- 確認: 外部キー制約を確認
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table,
  confdeltype AS delete_action
FROM pg_constraint
WHERE confrelid = 'auth.users'::regclass
  AND contype = 'f';
```

3. **「Run」ボタンをクリック**

4. **結果を確認**
   - `delete_action` が `c`（CASCADE）になっていればOK

---

### **ステップ4：テストユーザーを削除してクリーンアップ**

設定が完了したら、既存のテストユーザーを削除して新規登録をテストします。

1. **左メニューから「Authentication」をクリック**

2. **「Users」タブをクリック**

3. **テストユーザーを選択**
   - `waw2716@gmail.com` などのテストアカウント

4. **右上の「...」メニューから「Delete user」をクリック**

5. **確認ダイアログで「Delete」をクリック**

6. **エラーが出ずに削除されればOK**

---

## 🚀 設定完了後のテスト手順

### 1. 新規登録テスト

1. ブラウザのシークレットモード/プライベートウィンドウを開く
2. アプリにアクセス: `https://haguor-allowance-app.vercel.app/login`
3. **新規登録**タブをクリック
4. 新しいメールアドレス、姓、名、パスワードを入力
5. 「新規登録してログイン」をクリック
6. **期待結果**：
   - ✅ 自動的にトップページ（カレンダー画面）にリダイレクトされる
   - ✅ メール確認は不要
   - ✅ すぐに手当入力ができる

### 2. ログアウト・ログインテスト

1. 右上の「ログアウト」をクリック
2. ログイン画面に戻る
3. 先ほど登録したメールアドレスとパスワードを入力
4. 「ログイン」をクリック
5. **期待結果**：
   - ✅ トップページにログインできる

---

## ⚠️ トラブルシューティング

### もし「Email not confirmed」エラーが出る場合

1. **ステップ2のSQLを再実行**してください
2. ブラウザのキャッシュをクリア（Ctrl+Shift+Delete）
3. 新しいシークレットウィンドウで再テスト

### もしログイン画面にループする場合

1. ブラウザのコンソール（F12キー）を開く
2. **Console**タブでエラーメッセージを確認
3. エラーメッセージをコピーしてお知らせください

### もしユーザー削除に失敗する場合

1. **ステップ3のSQLを再実行**してください
2. 他のテーブルがある場合、同様の設定が必要な可能性があります

---

## 📝 重要なポイント

- ✅ **メール確認を無効化**しないと、新規登録したユーザーはログインできません
- ✅ **カスケード削除**を設定しないと、ユーザーを削除できません
- ✅ これらの設定は**Supabase側**で行う必要があります（コードでは解決できません）

---

## 🎯 設定完了のチェックリスト

- [ ] ステップ1：メール確認を無効化（Authentication > Providers > Email > Confirm email OFF）
- [ ] ステップ2：既存ユーザーのメール確認ステータスをSQLで更新
- [ ] ステップ3：カスケード削除設定をSQLで実行
- [ ] ステップ4：テストユーザーを削除してクリーンアップ
- [ ] 新規登録テスト（シークレットモードで）
- [ ] ログイン・ログアウトテスト

すべてのチェックが完了したら、問題が解決しているはずです！🎉
