'use client'

import { useState, useTransition } from 'react'
import { sendMagicLink } from '../auth/actions'

export default function LoginPage() {
  const [error, setError] = useState<string>('')
  const [domainError, setDomainError] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setDomainError(false)

    const formData = new FormData(e.currentTarget)
    const email = (formData.get('email') as string)?.trim()

    if (!email) {
      setError('メールアドレスを入力してください')
      return
    }

    // クライアント側でもドメインバリデーション
    if (!email.toLowerCase().endsWith('@haguroko.ed.jp')) {
      setDomainError(true)
      return
    }

    startTransition(async () => {
      const result = await sendMagicLink(formData)

      if (result?.error === 'domain') {
        setDomainError(true)
        setError('')
      } else if (result?.error === 'send') {
        setError(result.message || '送信に失敗しました')
        setDomainError(false)
      }
      // success の場合は redirect('/auth/verify') で遷移するためここには来ない
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
          {/* ドメインエラー */}
          {domainError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-sm text-red-700 font-bold">
                ※学校のメールアドレス(@haguroko.ed.jp)のみ利用可能です
              </p>
            </div>
          )}

          {/* その他のエラー */}
          {error && !domainError && (
            <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
              <p className="text-sm text-red-700 font-bold whitespace-pre-line">{error}</p>
            </div>
          )}

          {/* フォーム */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* メールアドレス */}
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                メールアドレス
              </label>
              <input
                type="email"
                name="email"
                placeholder="your.name@haguroko.ed.jp"
                required
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900"
                disabled={isPending}
              />
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
                  <span>送信中...</span>
                </>
              ) : (
                <span>ログインリンクを送信</span>
              )}
            </button>
          </form>

          {/* 補足 */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-600 text-center">
              学校のメールアドレス(@haguroko.ed.jp)宛に<br />
              ログイン用リンクが送信されます。
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
