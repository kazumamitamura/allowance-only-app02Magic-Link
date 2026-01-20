'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type AllowanceData = {
  id: number
  user_id: string
  user_email: string
  date: string
  activity_type: string
  amount: number
  destination_detail: string
  is_driving: boolean
  is_accommodation: boolean
}

type UserProfile = {
  user_id: string
  email: string
  display_name: string
}

export default function AllowancePreviewPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [selectedUser, setSelectedUser] = useState<string>('') // 個別ユーザー選択
  const [allowances, setAllowances] = useState<AllowanceData[]>([])
  const [users, setUsers] = useState<UserProfile[]>([])
  const [viewMode, setViewMode] = useState<'user' | 'date'>('user') // ユーザー別 or 日付別
  
  const ADMIN_EMAILS = ['mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp']

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        router.push('/login')
        return
      }

      if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        alert('管理者権限がありません')
        router.push('/')
        return
      }

      setIsAuthorized(true)
      await fetchUsers()
      await fetchData()
    }
    checkAuth()
  }, [])

  useEffect(() => {
    if (isAuthorized) {
      fetchData()
    }
  }, [selectedYear, selectedMonth, selectedUser, isAuthorized])

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('user_profiles')
      .select('*')
      .order('display_name')
    
    if (data) {
      console.log('ユーザープロフィール:', data)
      setUsers(data)
    }
  }

  const fetchData = async () => {
    setLoading(true)
    const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    
    let query = supabase
      .from('allowances')
      .select('*')
      .gte('date', `${yearMonth}-01`)
      .lte('date', `${yearMonth}-31`)
    
    // 個別ユーザーが選択されている場合はフィルター
    if (selectedUser) {
      query = query.eq('user_id', selectedUser)
    }
    
    const { data, error } = await query.order('date', { ascending: true })
    
    if (error) {
      console.error('データ取得エラー:', error)
      alert('データの取得に失敗しました: ' + error.message)
    } else {
      console.log('手当データ:', data)
      setAllowances(data || [])
    }
    
    setLoading(false)
  }

  // ユーザー別表示
  const renderByUser = () => {
    // ユーザーごとにグループ化
    const userMap = new Map<string, { profile: UserProfile | null, allowances: AllowanceData[] }>()
    
    // 個別ユーザーが選択されている場合
    if (selectedUser) {
      const user = users.find(u => u.user_id === selectedUser)
      if (user) {
        userMap.set(user.user_id, { profile: user, allowances: [] })
      }
    } else {
      // 全ユーザーを初期化
      users.forEach(user => {
        userMap.set(user.user_id, { profile: user, allowances: [] })
      })
    }
    
    // 手当データを振り分け
    allowances.forEach(allowance => {
      if (!userMap.has(allowance.user_id)) {
        // プロフィールが見つからない場合でも表示
        const matchingUser = users.find(u => u.user_id === allowance.user_id)
        userMap.set(allowance.user_id, {
          profile: matchingUser || null,
          allowances: []
        })
      }
      userMap.get(allowance.user_id)!.allowances.push(allowance)
    })

    return (
      <div className="space-y-6">
        {Array.from(userMap.entries()).map(([userId, { profile, allowances: userAllowances }]) => {
          const total = userAllowances.reduce((sum, a) => sum + a.amount, 0)
          const displayName = profile?.display_name || profile?.email || 'ユーザー名未登録'
          const displayEmail = profile?.email || ''
          
          return (
            <div key={userId} className="bg-white rounded-2xl shadow-lg overflow-hidden">
              {/* ユーザーヘッダー */}
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-4 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xl font-bold">{displayName}</h3>
                    {displayEmail && <p className="text-sm opacity-90">{displayEmail}</p>}
                    {!profile?.display_name && (
                      <p className="text-xs opacity-75 mt-1 bg-yellow-500/30 px-2 py-1 rounded inline-block">
                        ⚠️ 氏名未登録
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-sm opacity-90">合計金額</p>
                    <p className="text-2xl font-bold">¥{total.toLocaleString()}</p>
                    <p className="text-xs opacity-75">{userAllowances.length}件</p>
                  </div>
                </div>
              </div>

              {/* データテーブル */}
              {userAllowances.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">日付</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">曜日</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">手当区分</th>
                        <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">業務内容</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">宿泊</th>
                        <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">運転</th>
                        <th className="px-4 py-3 text-right text-sm font-bold text-gray-700">金額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {userAllowances.map((allowance, index) => {
                        const date = new Date(allowance.date)
                        const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
                        
                        return (
                          <tr key={allowance.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm text-gray-900">{allowance.date}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{dayOfWeek}</td>
                            <td className="px-4 py-3 text-sm text-gray-900 font-medium">{allowance.activity_type}</td>
                            <td className="px-4 py-3 text-sm text-gray-700">{allowance.destination_detail || '-'}</td>
                            <td className="px-4 py-3 text-center">
                              {allowance.is_accommodation && <span className="text-blue-600">○</span>}
                            </td>
                            <td className="px-4 py-3 text-center">
                              {allowance.is_driving && <span className="text-green-600">○</span>}
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                              ¥{allowance.amount.toLocaleString()}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50 font-bold">
                        <td colSpan={6} className="px-4 py-3 text-right text-gray-900">合計</td>
                        <td className="px-4 py-3 text-right text-blue-900 text-lg">
                          ¥{total.toLocaleString()}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center text-gray-500">
                  この期間にデータがありません
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // 日付別表示
  const renderByDate = () => {
    // 日付ごとにグループ化
    const dateMap = new Map<string, AllowanceData[]>()
    
    allowances.forEach(allowance => {
      if (!dateMap.has(allowance.date)) {
        dateMap.set(allowance.date, [])
      }
      dateMap.get(allowance.date)!.push(allowance)
    })

    // 日付順にソート
    const sortedDates = Array.from(dateMap.keys()).sort()

    return (
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
              <tr>
                <th className="px-4 py-3 text-left font-bold">日付</th>
                <th className="px-4 py-3 text-left font-bold">曜日</th>
                <th className="px-4 py-3 text-left font-bold">氏名</th>
                <th className="px-4 py-3 text-left font-bold">手当区分</th>
                <th className="px-4 py-3 text-left font-bold">業務内容</th>
                <th className="px-4 py-3 text-center font-bold">宿泊</th>
                <th className="px-4 py-3 text-center font-bold">運転</th>
                <th className="px-4 py-3 text-right font-bold">金額</th>
              </tr>
            </thead>
            <tbody>
              {sortedDates.map(date => {
                const dateAllowances = dateMap.get(date)!
                const dateObj = new Date(date)
                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()]
                
                return dateAllowances.map((allowance, index) => {
                  const user = users.find(u => u.user_id === allowance.user_id)
                  const displayName = user?.display_name || user?.email || allowance.user_email
                  
                  return (
                    <tr key={allowance.id} className="border-b border-gray-200 hover:bg-gray-50">
                      {index === 0 && (
                        <>
                          <td rowSpan={dateAllowances.length} className="px-4 py-3 text-sm font-bold text-gray-900 border-r border-gray-200">
                            {date}
                          </td>
                          <td rowSpan={dateAllowances.length} className="px-4 py-3 text-sm text-gray-600 border-r border-gray-200">
                            {dayOfWeek}
                          </td>
                        </>
                      )}
                      <td className="px-4 py-3 text-sm text-gray-900 font-medium">{displayName}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{allowance.activity_type}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{allowance.destination_detail || '-'}</td>
                      <td className="px-4 py-3 text-center">
                        {allowance.is_accommodation && <span className="text-blue-600">○</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {allowance.is_driving && <span className="text-green-600">○</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                        ¥{allowance.amount.toLocaleString()}
                      </td>
                    </tr>
                  )
                })
              })}
            </tbody>
            <tfoot>
              <tr className="bg-blue-50 font-bold">
                <td colSpan={7} className="px-4 py-3 text-right text-gray-900">合計</td>
                <td className="px-4 py-3 text-right text-blue-900 text-lg">
                  ¥{allowances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    )
  }

  if (!isAuthorized) {
    return <div className="min-h-screen flex items-center justify-center">認証中...</div>
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
      {/* ヘッダー */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">📊 手当データプレビュー</h1>
            <p className="text-gray-600">全職員の入力内容を確認できます</p>
          </div>
          <Link href="/admin" className="px-6 py-3 bg-gray-600 text-white font-bold rounded-lg hover:bg-gray-700 transition">
            ← 管理者画面に戻る
          </Link>
        </div>
      </div>

      {/* フィルター */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <div className="flex flex-wrap gap-4 items-center">
            {/* 年月選択 */}
            <div className="flex gap-2 items-center">
              <label className="font-bold text-gray-900">対象月:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                  <option key={year} value={year}>{year}年</option>
                ))}
              </select>
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <option key={month} value={month}>{month}月</option>
                ))}
              </select>
            </div>

            {/* 個別ユーザー選択 */}
            <div className="flex gap-2 items-center">
              <label className="font-bold text-gray-900">職員:</label>
              <select
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
                className="px-4 py-2 border-2 border-gray-300 rounded-lg font-bold text-gray-900 focus:border-blue-500 focus:outline-none min-w-[200px]"
              >
                <option value="">全職員</option>
                {users.map(user => (
                  <option key={user.user_id} value={user.user_id}>
                    {user.display_name || user.email || 'ユーザー名未登録'}
                  </option>
                ))}
              </select>
            </div>

            {/* 表示切替 */}
            <div className="flex gap-2 items-center ml-auto">
              <label className="font-bold text-gray-900">表示形式:</label>
              <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                <button
                  onClick={() => setViewMode('user')}
                  className={`px-4 py-2 rounded-lg font-bold transition ${
                    viewMode === 'user'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  👤 ユーザー別
                </button>
                <button
                  onClick={() => setViewMode('date')}
                  className={`px-4 py-2 rounded-lg font-bold transition ${
                    viewMode === 'date'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  📅 日付別
                </button>
              </div>
            </div>

            {/* 更新ボタン */}
            <button
              onClick={fetchData}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
            >
              {loading ? '読込中...' : '🔄 更新'}
            </button>
          </div>

          {/* サマリー */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-blue-100 to-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-700 font-bold">データ件数</p>
              <p className="text-2xl font-bold text-blue-900">{allowances.length}件</p>
            </div>
            <div className="bg-gradient-to-r from-purple-100 to-purple-50 p-4 rounded-lg">
              <p className="text-sm text-purple-700 font-bold">登録ユーザー数</p>
              <p className="text-2xl font-bold text-purple-900">
                {new Set(allowances.map(a => a.user_id)).size}人
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-100 to-green-50 p-4 rounded-lg">
              <p className="text-sm text-green-700 font-bold">合計金額</p>
              <p className="text-2xl font-bold text-green-900">
                ¥{allowances.reduce((sum, a) => sum + a.amount, 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* データ表示 */}
      <div className="max-w-7xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-600">読み込み中...</div>
          </div>
        ) : allowances.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <p className="text-gray-500 text-lg">この期間にデータがありません</p>
          </div>
        ) : (
          viewMode === 'user' ? renderByUser() : renderByDate()
        )}
      </div>
    </div>
  )
}
