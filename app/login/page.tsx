'use client'

import { useState, useTransition } from 'react'
import { login, signup } from '../auth/actions'

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string>('')
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    
    const formData = new FormData(e.currentTarget)
    
    startTransition(async () => {
      const action = isSignUp ? signup : login
      const result = await action(formData)
      
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* ロゴ・タイトル */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">💰</h1>
          <h2 className="text-2xl font-bold text-gray-900">手当管理システム</h2>
          <p className="text-sm text-gray-600 mt-2">部活動指導手当の入力・管理</p>
        </div>

        {/* メインカード */}
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          {/* タブ切り替え */}
          <div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-lg">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false)
                setError('')
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition ${
                !isSignUp
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              ログイン
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true)
                setError('')
              }}
              className={`flex-1 py-2 px-4 rounded-lg font-bold transition ${
                isSignUp
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              新規登録
            </button>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-sm text-red-700 font-bold">{error}</p>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 氏名（新規登録時のみ） */}
            {isSignUp && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    姓（Last Name）
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    placeholder="例: 三田村"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900"
                    disabled={isPending}
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    名（First Name）
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    placeholder="例: 和真"
                    required
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900"
                    disabled={isPending}
                  />
                </div>
                <p className="col-span-2 text-xs text-gray-600 mt-1">帳票出力に使用されます</p>
              </div>
            )}

            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                name="email"
                placeholder="your.email@example.com"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900"
                disabled={isPending}
              />
            </div>

            {/* パスワード */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                パスワード
              </label>
              <input
                type="password"
                name="password"
                placeholder={isSignUp ? '6文字以上' : '••••••••'}
                required
                minLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900"
                disabled={isPending}
              />
              {isSignUp && (
                <p className="text-xs text-gray-600 mt-1">6文字以上で設定してください</p>
              )}
            </div>

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={isPending}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-lg shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>処理中...</span>
                </>
              ) : (
                <span>{isSignUp ? '新規登録してログイン' : 'ログイン'}</span>
              )}
            </button>

            {/* パスワードを忘れた方（ログイン時のみ表示） */}
            {!isSignUp && (
              <div className="text-center mt-3">
                <a
                  href="/forgot-password"
                  className="text-sm text-blue-600 hover:text-blue-700 font-bold underline"
                >
                  パスワードを忘れた方はこちら
                </a>
              </div>
            )}
          </form>

          {/* 補足情報 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              {isSignUp ? (
                <>
                  登録後すぐにログイン状態になります。<br />
                  メール確認は不要です。
                </>
              ) : (
                <>
                  アカウントをお持ちでない方は<br />
                  「新規登録」タブから登録してください。
                </>
              )}
            </p>
          </div>
        </div>

        {/* フッター */}
        <div className="mt-6 text-center">
          <p className="text-xs text-gray-500">
            © 2026 手当管理システム - 学校法人向け
          </p>
        </div>
      </div>
    </div>
  )
}
