'use client'

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { submitInquiry } from './actions'

export default function ContactPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState(false)
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      setUserEmail(user.email || '')
      
      // ユーザー名を取得
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('user_id', user.id)
        .single()
      
      if (profile?.display_name) {
        setUserName(profile.display_name)
      }
    }
    fetchUser()
  }, [])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    setSuccess(false)

    if (!subject.trim() || !message.trim()) {
      setError('件名とメッセージを入力してください')
      return
    }

    startTransition(async () => {
      const result = await submitInquiry({
        subject: subject.trim(),
        message: message.trim(),
        userEmail,
        userName: userName || userEmail
      })

      if (result?.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        setSubject('')
        setMessage('')
        // 3秒後にメイン画面に戻る
        setTimeout(() => {
          router.push('/')
        }, 3000)
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">📧 お問い合わせ</h1>
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-700 font-bold text-sm"
            >
              ← メイン画面に戻る
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {success ? (
          /* 送信完了メッセージ */
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
                <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">お問い合わせを送信しました</h2>
              <p className="text-gray-700 mb-4">
                管理者にメッセージを送信しました。<br />
                回答はメールアドレス（{userEmail}）に送信されます。
              </p>
              <p className="text-sm text-gray-500">
                3秒後にメイン画面に戻ります...
              </p>
            </div>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
            >
              メイン画面に戻る
            </Link>
          </div>
        ) : (
          /* 問い合わせフォーム */
          <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-2">管理者へのお問い合わせ</h2>
              <p className="text-sm text-gray-600">
                システムの不具合や操作方法についての質問など、お気軽にお問い合わせください。<br />
                回答は登録されているメールアドレス（<span className="font-bold">{userEmail}</span>）に送信されます。
              </p>
            </div>

            {/* エラーメッセージ */}
            {error && (
              <div className="mb-6 p-4 bg-red-50 border-l-4 border-red-500 rounded-r-lg">
                <p className="text-sm text-red-700 font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 件名 */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  件名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="例: 手当の入力方法について"
                  required
                  disabled={isPending}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900"
                />
              </div>

              {/* メッセージ */}
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  メッセージ <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="お問い合わせ内容を詳しく記入してください..."
                  required
                  disabled={isPending}
                  rows={10}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition font-bold text-gray-900 resize-y"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {message.length}文字
                </p>
              </div>

              {/* 送信者情報（表示のみ） */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-xs text-gray-600 mb-1">送信者情報</p>
                <p className="text-sm font-bold text-gray-900">
                  {userName || '未登録'} ({userEmail})
                </p>
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
                  <span>📧 お問い合わせを送信</span>
                )}
              </button>
            </form>

            {/* 注意事項 */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-900 font-bold mb-2">
                  💡 お問い合わせのヒント
                </p>
                <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                  <li>具体的な内容を記入していただくと、より迅速に対応できます</li>
                  <li>エラーメッセージが表示される場合は、その内容も含めてお知らせください</li>
                  <li>回答は通常、1〜2営業日以内にメールでお送りします</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
