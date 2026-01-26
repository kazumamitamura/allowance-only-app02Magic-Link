# 完全なセットアップガイド

## 📋 セットアップチェックリスト

### ✅ ステップ1: データベーステーブルの確認

1. **Supabase Dashboard → SQL Editor を開く**
2. **`COMPLETE_SETUP_CHECK.sql` を実行**
3. **結果を確認**:
   - すべてのテーブルが「✓ 存在します」と表示されるか確認
   - RLSが有効になっているか確認
   - ポリシーが十分に設定されているか確認

### ✅ ステップ2: Storageバケットの確認と作成

#### 2-1. Storageバケットの確認

1. **Supabase Dashboard → Storage** を開く
2. **`documents` バケットが存在するか確認**
   - 存在する場合: ✅ 完了
   - 存在しない場合: 以下の手順で作成

#### 2-2. Storageバケットの作成（存在しない場合）

1. **Storage セクションで「New bucket」ボタンをクリック**
2. **以下の設定を入力**:
   - **Name**: `documents`
   - **Public bucket**: **チェックを外す**（プライベートバケット）
3. **「Create bucket」をクリック**

#### 2-3. Storageポリシーの設定

Storage バケットを作成した後、以下のポリシーを設定します：

##### ポリシー1: 認証ユーザーは資料を閲覧可能

1. **Storage → `documents` バケット → Policies タブ** に移動
2. **「New Policy」をクリック**
3. **「For full customization」を選択**
4. **以下の設定を入力**:
   - **Policy name**: `Authenticated users can view documents`
   - **Allowed operation**: `SELECT`
   - **Policy definition**: 以下のSQLコードをコピー:
     ```
     auth.role() = 'authenticated'
     ```
5. **「Review」をクリックして保存**

##### ポリシー2: 管理者のみ資料をアップロード可能

1. **「New Policy」をクリック**
2. **「For full customization」を選択**
3. **以下の設定を入力**:
   - **Policy name**: `Admins can upload documents`
   - **Allowed operation**: `INSERT`
   - **Policy definition**: 以下のSQLコードをコピー:
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
4. **「Review」をクリックして保存**

##### ポリシー3: 管理者のみ資料を削除可能

1. **「New Policy」をクリック**
2. **「For full customization」を選択**
3. **以下の設定を入力**:
   - **Policy name**: `Admins can delete documents`
   - **Allowed operation**: `DELETE`
   - **Policy definition**: 以下のSQLコードをコピー:
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
4. **「Review」をクリックして保存**

### ✅ ステップ3: スキーマキャッシュのリフレッシュ

1. **Supabase Dashboard → Settings → API** を開く
2. **「Reload schema cache」または「Refresh schema」ボタンをクリック**
3. **数秒待つ**

### ✅ ステップ4: 動作確認

#### 4-1. お問い合わせ機能の確認

1. **アプリケーションにログイン**
2. **「📧 お問い合わせ」ボタンをクリック**
3. **件名とメッセージを入力して送信**
4. **エラーが出ないか確認**

#### 4-2. 規約閲覧機能の確認

1. **「📄 規約閲覧」ボタンをクリック**
2. **資料一覧が表示されるか確認**

#### 4-3. 資料アップロード機能の確認（管理者のみ）

1. **管理者でログイン**
2. **管理者ダッシュボード → 「📄 資料管理」をクリック**
3. **PDFファイルをアップロード**
4. **エラーが出ないか確認**

## 🔍 問題が発生した場合

### エラー: 「テーブルが存在しません」

**解決方法**:
1. `SETUP_INQUIRIES_AND_DOCUMENTS.sql` を再実行
2. エラーメッセージを確認
3. エラーが解決しない場合は、エラーメッセージを共有してください

### エラー: 「Bucket not found」

**解決方法**:
1. Storage バケット `documents` が作成されているか確認
2. 作成されていない場合は、ステップ2-2を実行

### エラー: 「スキーマキャッシュが更新されていません」（PGRST205）

**解決方法**:
1. ステップ3を実行（スキーマキャッシュのリフレッシュ）
2. 数分待ってから再度試す
3. それでも解決しない場合は、`FORCE_REFRESH_SCHEMA.sql` を実行

### エラー: 「permission denied」または「RLS」

**解決方法**:
1. `COMPLETE_SETUP_CHECK.sql` を実行
2. RLSポリシーが正しく設定されているか確認
3. 不足している場合は、`SETUP_INQUIRIES_AND_DOCUMENTS.sql` を再実行

## 📝 セットアップ完了の確認

以下のすべてが「✓」になれば、セットアップは完了です：

- [ ] `user_profiles` テーブルが存在する
- [ ] `inquiries` テーブルが存在する
- [ ] `documents` テーブルが存在する
- [ ] すべてのテーブルでRLSが有効
- [ ] すべてのテーブルに十分なポリシーが設定されている
- [ ] Storage バケット `documents` が作成されている
- [ ] Storage ポリシーが設定されている
- [ ] スキーマキャッシュがリフレッシュされている
- [ ] お問い合わせ機能が動作する
- [ ] 規約閲覧機能が動作する
- [ ] 資料アップロード機能が動作する（管理者）

## 🆘 サポート

問題が解決しない場合は、以下を共有してください：

1. **エラーメッセージ**（画面に表示されたもの）
2. **ブラウザのコンソールのエラー**（F12 → Console）
3. **`COMPLETE_SETUP_CHECK.sql` の実行結果**
4. **Storage バケットの状態**（作成されているか、ポリシーが設定されているか）
