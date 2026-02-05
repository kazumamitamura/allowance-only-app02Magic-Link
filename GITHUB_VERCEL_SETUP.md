# GitHub と Vercel の連携手順

## 現在の状態

- **Git リモート**: `origin` → `https://github.com/kazumamitamura/allowance-simple.git`
- **ブランチ**: `main`

---

## 1. GitHub へのプッシュ

### 初回または変更を反映するとき

```bash
# プロジェクトフォルダで実行
git add .
git commit -m "操作マニュアル・検索機能・GitHub/Vercel連携"
git push -u origin main
```

- GitHub にログインしていない場合は、ブラウザまたは Git Credential Manager で認証します。
- リポジトリがまだない場合は [GitHub で New repository](https://github.com/new) を作成し、表示される手順の「push an existing repository」で上記の `git remote add` と `git push` を実行します。

---

## 2. Vercel との連携（デプロイ）

### 2.1 Vercel で GitHub を接続

1. [Vercel](https://vercel.com) にアクセスし、**Sign Up** または **Log In** します。
2. **Continue with GitHub** を選び、GitHub アカウントで認証します。
3. 初回は「Import Git Repository」で GitHub のアクセスを許可します。

### 2.2 プロジェクトのインポート

1. Vercel ダッシュボードで **Add New…** → **Project** をクリックします。
2. **Import Git Repository** の一覧から **kazumamitamura/allowance-simple**（または該当リポジトリ）を選び **Import** します。
3. **Configure Project** では次のようにします。
   - **Framework Preset**: Next.js（自動検出されている想定）
   - **Root Directory**: そのまま（`./`）
   - **Build Command**: `next build`（デフォルトのまま）
   - **Output Directory**: デフォルトのまま

### 2.3 環境変数の設定（必須）

**Environment Variables** で以下を追加します（Supabase を使っている場合）。

| 名前 | 値 | 備考 |
|------|-----|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクトの URL | Supabase ダッシュボード → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon (public) key | 同上 |

お問い合わせメール送信（Resend）を使う場合:

| 名前 | 値 |
|------|-----|
| `RESEND_API_KEY` | Resend の API キー |
| `CONTACT_EMAIL` | 受信先メールアドレス（任意） |

追加後、**Deploy** をクリックします。

### 2.4 デプロイ後

- デプロイが完了すると **Preview URL** や **Production URL** が表示されます。
- 以降、`main` ブランチへ `git push` するたびに自動で Vercel がビルド・デプロイします（Production）。
- 他のブランチに push すると、そのブランチ用のプレビューURLが発行されます。

---

## 3. トラブルシュート

- **ビルドエラー**: Vercel の Deployment の **Building** ログでエラー内容を確認し、`next build` がローカルで通るか確認してください。
- **環境変数**: Vercel の Project → **Settings** → **Environment Variables** で本番用に設定されているか確認してください。
- **404 / ルーティング**: Next.js App Router のファイル構成（`app/` 以下）が正しいか確認してください。
