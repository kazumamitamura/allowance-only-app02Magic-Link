'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { isAdmin as checkIsAdmin, getUserRoles } from '@/utils/adminRoles'
import { handleSupabaseError, logSupabaseError } from '@/utils/supabase/errorHandler'
import { logout } from '../auth/actions'

export default function AdminDashboard() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userRoles, setUserRoles] = useState<string[]>([])
  const [stats, setStats] = useState({
    pendingAllowances: 0
  })
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        router.push('/login')
        return
      }

      if (!checkIsAdmin(user.email || '')) {
        alert('管理者権限がありません')
        router.push('/')
        return
      }

      setIsAuthorized(true)
      setUserRoles(getUserRoles(user.email || ''))
      fetchStats()
    }
    checkAuth()
  }, [])

  const fetchStats = async () => {
    setLoading(true)
    
    // 承認待ちの手当申請数を取得
    const { data: allowanceData, error } = await supabase
      .from('monthly_applications')
      .select('*')
      .eq('application_type', 'allowance')
      .eq('status', 'submitted')

    if (error) {
      logSupabaseError('統計データ取得', error)
    }

    setStats({
      pendingAllowances: allowanceData?.length || 0
    })
    
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
  }

  const handleCsvUpload = async () => {
    if (!csvFile) {
      alert('CSVファイルを選択してください')
      return
    }

    setUploading(true)
    try {
      const text = await csvFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      // ヘッダー行をスキップ
      const dataLines = lines.slice(1)
      
      // 日付形式を変換する関数（YYYY/MM/DD → YYYY-MM-DD）
      const normalizeDate = (dateStr: string): string | null => {
        if (!dateStr) return null
        
        // YYYY-MM-DD形式の場合はそのまま
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
          return dateStr
        }
        
        // YYYY/MM/DD形式の場合は変換
        if (dateStr.match(/^\d{4}\/\d{2}\/\d{2}$/)) {
          return dateStr.replace(/\//g, '-')
        }
        
        // MM/DD/YYYY形式の場合も対応
        const slashMatch = dateStr.match(/^(\d{4})\/(\d{2})\/(\d{2})$/)
        if (slashMatch) {
          return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`
        }
        
        return null
      }
      
      const records = dataLines.map(line => {
        // CSVのパース（カンマ区切り、ダブルクォート対応）
        const parts: string[] = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            parts.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        parts.push(current.trim())
        
        const [date, workType, eventName] = parts.map(v => v.replace(/^"|"$/g, '').trim())
        
        // 日付の形式を変換・確認
        const normalizedDate = normalizeDate(date)
        if (!normalizedDate) {
          console.warn('無効な日付形式:', date)
          return null
        }
        
        // 勤務区分が空の場合はスキップ
        if (!workType || workType.trim() === '') {
          console.warn('勤務区分が空:', date)
          return null
        }
        
        return {
          date: normalizedDate,
          work_type: workType.trim(),
          event_name: (eventName || '').trim()
        }
      }).filter((r): r is { date: string; work_type: string; event_name: string } => r !== null) // nullを除外

      if (records.length === 0) {
        alert('有効なデータが見つかりませんでした。\n\nCSV形式: 日付,勤務区分,行事名\n例: 2025-04-01,A,入学式\nまたは: 2025/04/01,A,入学式\n\n※行事名は省略可能です')
        setUploading(false)
        return
      }

      console.log('アップロードするデータ:', records.slice(0, 5), '... (合計', records.length, '件)')

      // Supabaseにupsert
      const { error } = await supabase
        .from('annual_schedules')
        .upsert(records, { onConflict: 'date' })

      if (error) {
        console.error('CSVアップロードエラー（詳細）:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        })
        
        // エラーメッセージを詳細に表示
        let errorMessage = 'エラーが発生しました: ' + error.message
        if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
          errorMessage += '\n\nスキーマキャッシュの問題の可能性があります。\n数秒待ってから再度お試しください。'
        } else if (error.code === '42P01' || error.message.includes('does not exist')) {
          errorMessage += '\n\nannual_schedulesテーブルが作成されていません。\n\n【解決方法】\n1. Supabase Dashboard の SQL Editor を開く\n2. CREATE_ANNUAL_SCHEDULES_TABLE.sql の内容をコピー\n3. SQL Editor に貼り付けて実行'
        }
        
        alert(errorMessage)
      } else {
        alert(`✅ ${records.length}件の勤務表データを登録しました！\n\nカレンダーに反映されます。`)
        setCsvFile(null)
        // ファイル入力をリセット
        const fileInput = document.getElementById('csv-file-input') as HTMLInputElement
        if (fileInput) fileInput.value = ''
      }
    } catch (err) {
      console.error('CSVの読み込みエラー:', err)
      alert('CSVの読み込みに失敗しました: ' + (err instanceof Error ? err.message : String(err)))
    }
    setUploading(false)
  }

  if (!isAuthorized) return <div className="p-10 text-center">確認中...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* ヘッダー */}
      <div className="bg-slate-800 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">手当管理システム</h1>
            <p className="text-slate-300 text-sm">管理者ダッシュボード</p>
            {userRoles.length > 0 && (
              <div className="mt-2 flex gap-2">
                {userRoles.map(role => (
                  <span key={role} className="bg-slate-700 text-slate-200 px-2 py-1 rounded text-xs font-bold">
                    {role}
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-3">
            <button onClick={() => router.push('/')} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition">
              一般画面へ
            </button>
            <button onClick={handleLogout} className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition">
              ログアウト
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* 統計情報 */}
        <div className="grid grid-cols-1 md:grid-cols-1 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-md border-l-4 border-blue-500">
            <div className="text-sm font-bold text-slate-500 mb-1">手当申請（承認待ち）</div>
            <div className="text-4xl font-extrabold text-blue-600">{stats.pendingAllowances}</div>
            <div className="text-xs text-slate-400 mt-1">件</div>
          </div>
        </div>

        {/* メインメニューカード */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          {/* 手当管理 */}
          <button 
            onClick={() => router.push('/admin/allowances')}
            className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group transform hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">💰</div>
              {stats.pendingAllowances > 0 && (
                <span className="bg-white text-blue-600 px-3 py-1 rounded-full text-xs font-bold shadow-lg">
                  {stats.pendingAllowances}件
                </span>
              )}
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              手当管理
            </h3>
            <p className="text-blue-100 text-xs mb-3">
              部活動手当の承認・集計
            </p>
            <div className="text-xs text-blue-200 bg-blue-700/30 px-2 py-1 rounded-lg inline-block">
              担当：友野・武田事務長
            </div>
          </button>

          {/* データプレビュー（新規） */}
          <button 
            onClick={() => router.push('/admin/preview')}
            className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group transform hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📊</div>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              データプレビュー
            </h3>
            <p className="text-indigo-100 text-xs mb-3">
              全職員の入力内容を確認
            </p>
            <div className="text-xs text-indigo-200 bg-indigo-700/30 px-2 py-1 rounded-lg inline-block">
              スプレッドシート形式
            </div>
          </button>

          {/* Excel出力 */}
          <button 
            onClick={() => router.push('/admin/export')}
            className="bg-gradient-to-br from-green-500 to-green-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group transform hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📊</div>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              Excel出力
            </h3>
            <p className="text-green-100 text-xs mb-3">
              個人・全体の月次・年次レポート出力
            </p>
            <div className="text-xs text-green-200 bg-green-700/30 px-2 py-1 rounded-lg inline-block">
              全管理者
            </div>
          </button>

          {/* 手当設定 */}
          <button 
            onClick={() => router.push('/admin/settings')}
            className="bg-gradient-to-br from-purple-500 to-purple-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group transform hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">⚙️</div>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              手当設定
            </h3>
            <p className="text-purple-100 text-xs mb-3">
              手当種別・金額のマスタ管理
            </p>
            <div className="text-xs text-purple-200 bg-purple-700/30 px-2 py-1 rounded-lg inline-block">
              管理者専用
            </div>
          </button>

          {/* 資料管理（PDFアップロード） */}
          <button 
            onClick={() => router.push('/admin/documents')}
            className="bg-gradient-to-br from-teal-500 to-teal-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group transform hover:scale-105 border-4 border-teal-400"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📄</div>
              <span className="bg-yellow-400 text-yellow-900 px-2 py-1 rounded-full text-xs font-bold animate-pulse">
                NEW
              </span>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              資料管理
            </h3>
            <p className="text-teal-100 text-xs mb-3">
              PDF規約のアップロード・管理
            </p>
            <div className="text-xs text-teal-200 bg-teal-700/30 px-2 py-1 rounded-lg inline-block">
              管理者専用
            </div>
          </button>
        </div>

        {/* 追加メニュー */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* お問い合わせ管理 */}
          <button 
            onClick={() => router.push('/admin/inquiries')}
            className="bg-gradient-to-br from-orange-500 to-orange-600 p-8 rounded-3xl shadow-xl hover:shadow-2xl transition-all text-left group transform hover:scale-105"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="text-5xl">📧</div>
            </div>
            <h3 className="text-2xl font-extrabold text-white mb-2">
              お問い合わせ管理
            </h3>
            <p className="text-orange-100 text-xs mb-3">
              ユーザーからの問い合わせを確認・管理
            </p>
            <div className="text-xs text-orange-200 bg-orange-700/30 px-2 py-1 rounded-lg inline-block">
              管理者専用
            </div>
          </button>
        </div>

        {/* 年間勤務表CSVアップロード */}
        <div className="bg-white p-6 rounded-2xl shadow-md mb-8">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <span className="text-2xl">📅</span>
            年間勤務表CSV登録
          </h3>
          <p className="text-sm text-gray-700 mb-4">
            CSVファイルをアップロードして、年間の勤務区分（A/B/休/祝など）を一括登録できます。<br/>
            ユーザー画面のカレンダーに勤務区分が表示されます。
          </p>
          
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <h4 className="text-sm font-bold text-gray-900 mb-2">CSVフォーマット例</h4>
            <pre className="text-xs text-gray-900 bg-white p-3 rounded border border-gray-300 overflow-x-auto">
日付,勤務区分,行事名
2025-04-01,A,入学式
2025-04-02,B,通常授業
2025-04-29,祝,昭和の日
2025-05-03,休,憲法記念日
            </pre>
          </div>

          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                CSVファイルを選択
              </label>
              <input
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
                className="w-full p-3 border-2 border-gray-300 rounded-lg font-bold text-gray-900 bg-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-bold hover:file:bg-blue-100"
              />
              {csvFile && (
                <p className="text-xs text-green-600 mt-2">✓ {csvFile.name} を選択中</p>
              )}
            </div>
            <button
              onClick={handleCsvUpload}
              disabled={!csvFile || uploading}
              className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
            >
              {uploading ? '処理中...' : 'アップロード'}
            </button>
          </div>
        </div>

        {/* システム情報 */}
        <div className="bg-white p-6 rounded-2xl shadow-md">
          <h3 className="text-lg font-bold text-slate-800 mb-4">システム情報</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-sm text-slate-500 mb-1">承認待ち（合計）</div>
              <div className="text-3xl font-bold text-slate-800">
                {stats.pendingAllowances}件
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-sm text-slate-500 mb-1">アクセス権限</div>
              <div className="text-lg font-bold text-slate-800">
                {userRoles.length}個の管理権限
              </div>
            </div>
            <div className="bg-slate-50 p-4 rounded-lg">
              <div className="text-sm text-slate-500 mb-1">システムバージョン</div>
              <div className="text-lg font-bold text-slate-800">
                v3.0 (手当専用)
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
