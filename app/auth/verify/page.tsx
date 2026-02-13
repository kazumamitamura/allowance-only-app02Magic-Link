import Link from 'next/link'

export default function AuthVerifyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900 mb-2">💰</h1>
          <h2 className="text-2xl font-bold text-gray-900">手当管理システム</h2>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
          <p className="text-gray-700 text-center leading-relaxed">
            ログイン用のリンクをメールで送信しました。<br />
            受信トレイを確認してください。
          </p>
          <p className="text-sm text-gray-500 mt-4 text-center">
            届かない場合は迷惑メールフォルダもご確認ください。
          </p>
          <div className="mt-6 text-center">
            <Link
              href="/login"
              className="text-sm text-blue-600 hover:text-blue-700 font-bold underline"
            >
              メールアドレスを変更して再送信
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
