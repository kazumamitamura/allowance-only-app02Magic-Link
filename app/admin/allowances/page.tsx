'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { checkAccess, canManageAllowances } from '@/utils/adminRoles'
import { handleSupabaseError, logSupabaseError } from '@/utils/supabase/errorHandler'
import * as XLSX from 'xlsx'

type Allowance = {
  date: string
  activity_type: string
  amount: number
  destination_type: string
  destination_detail: string
}

export default function AllowanceManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userEmail, setUserEmail] = useState('')
  
  // タブ管理（承認システム廃止のため Excel出力をデフォルト）
  const [activeTab, setActiveTab] = useState<'export' | 'settings'>('export')

  // Excel出力タブ用
  const [users, setUsers] = useState<any[]>([])
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [exporting, setExporting] = useState(false)

  // 設定タブ用 - 将来的に手当項目の設定が必要な場合
  const [allowanceSettings, setAllowanceSettings] = useState<any[]>([])

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        alert('ログインが必要です')
        router.push('/login')
        return
      }

      const hasAccess = checkAccess(user.email || '', canManageAllowances)
      if (!hasAccess) {
        alert('手当管理の権限がありません')
        router.push('/admin')
        return
      }

      setUserEmail(user.email || '')
      setIsAuthorized(true)
      fetchUsers()
    }
    checkAuth()
  }, [])

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('user_profiles').select('*').order('display_name')
    if (error) {
      logSupabaseError('ユーザー一覧取得', error)
    }
    setUsers(data || [])
  }

  // Excel出力機能
  const exportIndividualMonthly = async () => {
    if (!selectedUser) {
      alert('職員を選択してください')
      return
    }

    setExporting(true)
    const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
    const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
    
    const { data: allowances } = await supabase
      .from('allowances')
      .select('*')
      .eq('user_email', selectedUser)
      .gte('date', `${yearMonth}-01`)
      .lte('date', endDate)
      .order('date')

    const user = users.find(u => u.email === selectedUser)
    
    const excelData = allowances?.map(item => ({
      '日付': item.date,
      '業務内容': item.activity_type,
      '区分': item.destination_type,
      '詳細': item.destination_detail || '',
      '運転': item.is_driving ? '○' : '',
      '宿泊': item.is_accommodation ? '○' : '',
      '金額': item.amount
    })) || []

    const total = allowances?.reduce((sum, item) => sum + item.amount, 0) || 0
    excelData.push({
      '日付': '合計',
      '業務内容': '',
      '区分': '',
      '詳細': '',
      '運転': '',
      '宿泊': '',
      '金額': total
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '手当明細')
    
    XLSX.writeFile(wb, `手当明細_${user?.display_name || selectedUser}_${yearMonth}.xlsx`)
    
    setExporting(false)
    alert('ダウンロードしました！')
  }

  const exportIndividualYearly = async () => {
    if (!selectedUser) {
      alert('職員を選択してください')
      return
    }

    setExporting(true)
    
    const { data: allowances } = await supabase
      .from('allowances')
      .select('*')
      .eq('user_email', selectedUser)
      .gte('date', `${selectedYear}-01-01`)
      .lte('date', `${selectedYear}-12-31`)
      .order('date')

    const user = users.find(u => u.email === selectedUser)
    
    const monthlyTotals: Record<number, number> = {}
    allowances?.forEach(item => {
      const month = parseInt(item.date.split('-')[1])
      monthlyTotals[month] = (monthlyTotals[month] || 0) + item.amount
    })

    const excelData = Array.from({ length: 12 }, (_, i) => ({
      '月': `${i + 1}月`,
      '件数': allowances?.filter(a => parseInt(a.date.split('-')[1]) === i + 1).length || 0,
      '金額': monthlyTotals[i + 1] || 0
    }))

    const total = Object.values(monthlyTotals).reduce((sum, val) => sum + val, 0)
    excelData.push({
      '月': '年間合計',
      '件数': allowances?.length || 0,
      '金額': total
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '年間集計')
    
    XLSX.writeFile(wb, `手当年間集計_${user?.display_name || selectedUser}_${selectedYear}.xlsx`)
    
    setExporting(false)
    alert('ダウンロードしました！')
  }

  const exportAllMonthly = async () => {
    setExporting(true)
    const yearMonth = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
    const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`
    
    const { data: allowances } = await supabase
      .from('allowances')
      .select('*')
      .gte('date', `${yearMonth}-01`)
      .lte('date', endDate)
      .order('user_email')

    const userTotals: Record<string, { name: string, count: number, amount: number }> = {}
    allowances?.forEach(item => {
      if (!userTotals[item.user_email]) {
        const user = users.find(u => u.email === item.user_email)
        userTotals[item.user_email] = {
          name: user?.display_name || item.user_email,
          count: 0,
          amount: 0
        }
      }
      userTotals[item.user_email].count++
      userTotals[item.user_email].amount += item.amount
    })

    const excelData = Object.entries(userTotals).map(([email, data]) => ({
      '職員名': data.name,
      'メールアドレス': email,
      '件数': data.count,
      '金額': data.amount
    }))

    const totalCount = excelData.reduce((sum, row) => sum + row['件数'], 0)
    const totalAmount = excelData.reduce((sum, row) => sum + row['金額'], 0)
    excelData.push({
      '職員名': '合計',
      'メールアドレス': '',
      '件数': totalCount,
      '金額': totalAmount
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '全体集計')
    
    XLSX.writeFile(wb, `手当全体集計_${yearMonth}.xlsx`)
    
    setExporting(false)
    alert('ダウンロードしました！')
  }

  const exportAllYearly = async () => {
    setExporting(true)
    
    const { data: allowances } = await supabase
      .from('allowances')
      .select('*')
      .gte('date', `${selectedYear}-01-01`)
      .lte('date', `${selectedYear}-12-31`)
      .order('user_email')

    const userTotals: Record<string, { name: string, count: number, amount: number }> = {}
    allowances?.forEach(item => {
      if (!userTotals[item.user_email]) {
        const user = users.find(u => u.email === item.user_email)
        userTotals[item.user_email] = {
          name: user?.display_name || item.user_email,
          count: 0,
          amount: 0
        }
      }
      userTotals[item.user_email].count++
      userTotals[item.user_email].amount += item.amount
    })

    const excelData = Object.entries(userTotals).map(([email, data]) => ({
      '職員名': data.name,
      'メールアドレス': email,
      '件数': data.count,
      '金額': data.amount
    }))

    const totalCount = excelData.reduce((sum, row) => sum + row['件数'], 0)
    const totalAmount = excelData.reduce((sum, row) => sum + row['金額'], 0)
    excelData.push({
      '職員名': '合計',
      'メールアドレス': '',
      '件数': totalCount,
      '金額': totalAmount
    })

    const ws = XLSX.utils.json_to_sheet(excelData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '年間全体集計')
    
    XLSX.writeFile(wb, `手当年間全体集計_${selectedYear}.xlsx`)
    
    setExporting(false)
    alert('ダウンロードしました！')
  }

  if (!isAuthorized) return <div className="p-10 text-center">確認中...</div>

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ヘッダー */}
      <div className="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="font-bold text-lg flex items-center gap-2">
            <span className="text-2xl">💰</span> 手当管理（担当：友野・武田事務長）
          </h1>
          <button onClick={() => router.push('/admin')} className="text-xs bg-blue-700 px-4 py-2 rounded hover:bg-blue-800 font-bold border border-blue-500">
            ← ダッシュボードへ
          </button>
        </div>
      </div>

      {/* タブナビゲーション */}
      <div className="bg-white border-b border-slate-200 sticky top-[60px] z-10">
        <div className="max-w-7xl mx-auto flex gap-1 px-6">
          <button 
            onClick={() => setActiveTab('export')}
            className={`px-6 py-3 font-bold text-sm transition ${activeTab === 'export' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            Excel出力
          </button>
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-3 font-bold text-sm transition ${activeTab === 'settings' ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            設定
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        {/* Excel出力タブ */}
        {activeTab === 'export' && (
          <div>
            {/* 出力条件設定 */}
            <div className="bg-white p-6 rounded-2xl shadow-md mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">出力条件</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">職員（個人レポート用）</label>
                  <select 
                    value={selectedUser} 
                    onChange={(e) => setSelectedUser(e.target.value)}
                    className="w-full p-3 border rounded-lg font-bold text-sm text-black"
                  >
                    <option value="">選択してください</option>
                    {users.map(user => (
                      <option key={user.email} value={user.email}>
                        {user.display_name || user.email}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">年</label>
                  <select 
                    value={selectedYear} 
                    onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                    className="w-full p-3 border rounded-lg font-bold text-sm text-black"
                  >
                    {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map(year => (
                      <option key={year} value={year}>{year}年</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-600 mb-2">月</label>
                  <select 
                    value={selectedMonth} 
                    onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                    className="w-full p-3 border rounded-lg font-bold text-sm text-black"
                  >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                      <option key={month} value={month}>{month}月</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* 出力ボタン */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <button 
                onClick={exportIndividualMonthly}
                disabled={exporting || !selectedUser}
                className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all text-left group border-2 border-transparent hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-5xl mb-4">👤</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-blue-600 transition">
                  個人月次レポート
                </h3>
                <p className="text-slate-500 text-sm mb-3">
                  選択した職員の指定月の手当明細を出力
                </p>
                <div className="text-xs text-slate-400">
                  {selectedUser ? users.find(u => u.email === selectedUser)?.display_name : '職員未選択'} / {selectedYear}年{selectedMonth}月
                </div>
              </button>

              <button 
                onClick={exportIndividualYearly}
                disabled={exporting || !selectedUser}
                className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all text-left group border-2 border-transparent hover:border-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="text-5xl mb-4">📅</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-purple-600 transition">
                  個人年次レポート
                </h3>
                <p className="text-slate-500 text-sm mb-3">
                  選択した職員の年間手当を月別集計
                </p>
                <div className="text-xs text-slate-400">
                  {selectedUser ? users.find(u => u.email === selectedUser)?.display_name : '職員未選択'} / {selectedYear}年
                </div>
              </button>

              <button 
                onClick={exportAllMonthly}
                disabled={exporting}
                className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition-all text-left group border-2 border-transparent hover:border-green-500"
              >
                <div className="text-5xl mb-4">👥</div>
                <h3 className="text-2xl font-bold text-slate-800 mb-2 group-hover:text-green-600 transition">
                  全体月次レポート
                </h3>
                <p className="text-slate-500 text-sm mb-3">
                  全職員の指定月の手当を集計
                </p>
                <div className="text-xs text-slate-400">
                  全職員 / {selectedYear}年{selectedMonth}月
                </div>
              </button>

              <button 
                onClick={exportAllYearly}
                disabled={exporting}
                className="bg-gradient-to-br from-blue-500 to-blue-600 p-8 rounded-2xl shadow-md hover:shadow-xl transition-all text-left group"
              >
                <div className="text-5xl mb-4 text-white">📈</div>
                <h3 className="text-2xl font-bold text-white mb-2">
                  全体年次レポート
                </h3>
                <p className="text-blue-50 text-sm mb-3">
                  全職員の年間手当を集計
                </p>
                <div className="text-xs text-blue-100">
                  全職員 / {selectedYear}年
                </div>
              </button>
            </div>
          </div>
        )}

        {/* 設定タブ */}
        {activeTab === 'settings' && (
          <div className="bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-xl font-bold text-slate-800 mb-4">手当項目・金額設定</h2>
            <div className="text-slate-500 text-sm">
              <p>現在、手当項目と金額は <code className="bg-slate-100 px-2 py-1 rounded">utils/allowanceRules.ts</code> で管理されています。</p>
              <p className="mt-2">将来的には、この画面からGUIで編集できるようにする予定です。</p>
            </div>
            <div className="mt-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="font-bold text-slate-700 mb-2">現在の手当設定</h3>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• A:休日部活(1日) → 3,400円</li>
                <li>• B:休日部活(半日) → 1,700円</li>
                <li>• C:指定大会 → 3,400円</li>
                <li>• D:指定外大会 → 2,400円</li>
                <li>• E:遠征 → 3,000円</li>
                <li>• F:合宿 → 5,000円</li>
                <li>• G:引率 → 2,400円</li>
                <li>• H:宿泊指導 → 6,000円</li>
                <li>• 県外マイクロバス運転 → 15,000円</li>
                <li>• 県内長距離運転 → 7,500円</li>
              </ul>
            </div>
          </div>
        )}

        {/* ローディングオーバーレイ */}
        {(loading || exporting) && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white p-8 rounded-2xl shadow-xl text-center">
              <div className="text-4xl mb-4">⏳</div>
              <div className="text-lg font-bold text-slate-800">処理中...</div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
