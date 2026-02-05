# 💰 手当管理システム

部活動指導手当の入力・管理アプリケーション

## 🚨 初回セットアップ（必須）

### ⚠️ Supabase設定が必須です！

アプリを使用する前に、必ず以下の設定を完了してください：

1. **[SUPABASE_SETUP.md](./SUPABASE_SETUP.md) を開く**
2. **3つのステップを順番に実行**：
   - ステップ1：メール確認を無効化
   - ステップ2：既存ユーザーのメール確認ステータスを更新
   - ステップ3：カスケード削除設定

⚠️ **この設定をしないと、新規登録・ログインができません！**

---

## 📋 機能一覧

### ユーザー機能
- ✅ カレンダー形式での手当入力
- ✅ 活動種別の選択（部活動、宿泊指導、遠征引率など）
- ✅ 運転フラグ、宿泊フラグによる金額の自動計算
- ✅ 月別の合計金額表示
- ✅ 手当の申請・承認フロー
- ✅ 締め切り機能（翌月10日まで入力可能）

### 管理者機能
- ✅ 全職員の手当承認・却下
- ✅ 個別・全体のExcel出力（帳票形式）
- ✅ 手当設定の管理
- ✅ 年間勤務表のCSVアップロード

---

## 🛠️ 技術スタック

- **フレームワーク**: Next.js 16 (App Router)
- **言語**: TypeScript
- **認証・DB**: Supabase
- **スタイリング**: Tailwind CSS
- **デプロイ**: Vercel

---

## 🚀 ローカル開発環境のセットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/kazumamitamura/allowance-simple.git
cd allowance-simple
```

### 2. 依存関係をインストール

```bash
npm install
```

### 3. 環境変数を設定

`.env.local` ファイルを作成し、以下を設定：

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Supabase設定を完了

⚠️ **必須**: [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) の手順を実行してください

### 4-1. テーブルの作成

⚠️ **重要**: 以下のテーブルがSupabaseに存在しない場合、アプリケーションが正常に動作しません。

1. Supabaseダッシュボード → SQL Editor を開く
2. `CREATE_ALL_TABLES.sql` ファイルの内容をコピーして実行
3. テーブルが正常に作成されたことを確認
4. 数秒待ってからアプリケーションをリロード（スキーマキャッシュの更新を待つ）

**作成されるテーブル:**
- `allowances` - 手当データ
- `monthly_applications` - 月次申請データ

**個別に作成する場合:**
- `CREATE_ALLOWANCES_TABLE.sql` - allowancesテーブルのみ作成
- `CREATE_MONTHLY_APPLICATIONS_TABLE.sql` - monthly_applicationsテーブルのみ作成

### 5. 開発サーバーを起動

```bash
npm run dev
```

ブラウザで `http://localhost:3000` を開きます。

---

## 📦 デプロイ（GitHub と Vercel の連携）

**詳細手順**: [GITHUB_VERCEL_SETUP.md](./GITHUB_VERCEL_SETUP.md) を参照してください。

### 概要

- **GitHub**: リモートは `origin` → `https://github.com/kazumamitamura/allowance-simple.git`。変更を反映するには `git add .` → `git commit -m "メッセージ"` → `git push origin main` を実行します。
- **Vercel**: [vercel.com](https://vercel.com) で GitHub アカウントを連携し、上記リポジトリをインポート。環境変数（`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` など）を設定してデプロイすると、`main` への push のたびに自動デプロイされます。

### 本番環境URL

https://haguro-allowance-app.vercel.app

---

## 🗄️ データベーススキーマ

### 主要テーブル

- **`auth.users`**: Supabase認証ユーザー
- **`user_profiles`**: ユーザープロフィール（氏名など）
- **`allowances`**: 手当データ
- **`allowance_types`**: 手当種別マスタ
- **`school_calendar`**: 学校カレンダー（休日判定）
- **`annual_schedules`**: 年間勤務表

---

## 🔐 管理者設定

以下のメールアドレスが管理者として登録されています：

- `mitamuraka@haguroko.ed.jp`
- `tomonoem@haguroko.ed.jp`

管理者は `/admin` ページにアクセスできます。

---

## 🐛 トラブルシューティング

### ログインできない場合

1. **Supabase設定を確認**
   - [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) のステップ1と2を実行したか確認

2. **ブラウザのコンソールを確認**
   - F12キーを押してConsoleタブを確認
   - エラーメッセージをコピーして調査

3. **キャッシュをクリア**
   - Ctrl+Shift+Delete でブラウザキャッシュをクリア

### ユーザーを削除できない場合

1. **カスケード削除設定を確認**
   - [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) のステップ3を実行したか確認

### 登録後にログイン画面に戻る場合

1. **メール確認設定を無効化**
   - [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) のステップ1を実行

2. **既存ユーザーを確認済みに更新**
   - [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) のステップ2を実行

---

## 📄 ライセンス

MIT License

---

## 👤 作成者

羽黒高等学校 - 手当管理システムプロジェクト

---

## 📞 サポート

問題が発生した場合は、以下を確認してください：

1. [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) の設定を完了したか
2. ブラウザのコンソールエラー（F12キー）
3. Vercelのデプロイログ

それでも解決しない場合は、管理者にお問い合わせください。
