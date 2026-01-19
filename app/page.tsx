'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { ACTIVITY_TYPES, DESTINATIONS, calculateAmount, canSelectActivity } from '@/utils/allowanceRules'

const ADMIN_EMAILS = ['mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp'].map(e => e.toLowerCase())

type Allowance = { id: number, user_id: string, date: string, activity_type: string, amount: number, destination_type: string, destination_detail: string, is_driving: boolean, is_accommodation: boolean }
type SchoolCalendar = { date: string, day_type: string }

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = ('00' + (date.getMonth() + 1)).slice(-2)
  const d = ('00' + date.getDate()).slice(-2)
  return `${y}-${m}-${d}`
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  
  const [userEmail, setUserEmail] = useState('')
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('') // 表示名
  const [isAdmin, setIsAdmin] = useState(false)

  const [allowances, setAllowances] = useState<Allowance[]>([])
  const [schoolCalendar, setSchoolCalendar] = useState<SchoolCalendar[]>([])
  
  const [allowanceStatus, setAllowanceStatus] = useState<'draft' | 'submitted' | 'approved'>('draft')
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [dayType, setDayType] = useState<string>('---')
  
  // 氏名登録モーダル用
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // 入力フォームモーダル用
  const [showInputModal, setShowInputModal] = useState(false)
  const [inputLastName, setInputLastName] = useState('')
  const [inputFirstName, setInputFirstName] = useState('')

  const [activityId, setActivityId] = useState('')
  const [destinationId, setDestinationId] = useState('inside_short')
  const [destinationDetail, setDestinationDetail] = useState('')
  const [isDriving, setIsDriving] = useState(false)
  const [isAccommodation, setIsAccommodation] = useState(false)
  const [calculatedAmount, setCalculatedAmount] = useState(0)

  const getLockStatus = (targetDate: Date) => {
    if (isAdmin) return false
    const now = new Date()
    const deadline = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 6, 0, 0, 0)
    const isPastDeadline = now >= deadline
    const currentViewMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
    const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
    const isTargetMonth = currentViewMonth === targetMonth
    return isPastDeadline || (isTargetMonth && allowanceStatus !== 'draft')
  }

  const isAllowLocked = getLockStatus(selectedDate)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUserEmail(user.email || '')
      setUserId(user.id)
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) setIsAdmin(true)
      
      // プロフィール取得
      fetchProfile(user.email || '')

      fetchData(user.id)
      fetchSchoolCalendar()
      fetchApplicationStatus(user.id, selectedDate)
    }
    init()
  }, [])

  // 氏名取得
  const fetchProfile = async (email: string) => {
      const { data } = await supabase.from('user_profiles').select('full_name').eq('email', email).single()
      if (data?.full_name) {
          setUserName(data.full_name)
      }
  }

  // 氏名保存処理
  const handleSaveProfile = async () => {
      if (!inputLastName || !inputFirstName) {
          alert('姓と名の両方を入力してください')
          return
      }
      const fullName = `${inputLastName.trim()} ${inputFirstName.trim()}`
      
      const { error } = await supabase.from('user_profiles').upsert({
          email: userEmail,
          full_name: fullName
      })

      if (error) {
          alert('エラーが発生しました: ' + error.message)
      } else {
          setUserName(fullName)
          setShowProfileModal(false)
          alert('氏名を登録しました！')
      }
  }

  useEffect(() => { if (userId) fetchApplicationStatus(userId, selectedDate) }, [selectedDate, userId])

  const fetchData = async (uid: string) => {
    const { data: allowData } = await supabase.from('allowances').select('*').eq('user_id', uid).order('date', { ascending: false })
    setAllowances(allowData || [])
  }

  const fetchSchoolCalendar = async () => {
    const { data } = await supabase.from('school_calendar').select('*')
    setSchoolCalendar(data || [])
  }

  const fetchApplicationStatus = async (uid: string, date: Date) => {
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const { data } = await supabase.from('monthly_applications').select('application_type, status').eq('user_id', uid).eq('year_month', ym)
    const allow = data?.find(d => d.application_type === 'allowance')
    setAllowanceStatus(allow?.status || 'draft')
  }

  useEffect(() => {
    const updateDayInfo = async () => {
      const dateStr = formatDate(selectedDate)
      const calData = schoolCalendar.find(c => c.date === dateStr)
      const type = calData?.day_type || (selectedDate.getDay() % 6 === 0 ? '休日(仮)' : '勤務日(仮)')
      setDayType(type)

      const allowance = allowances.find(a => a.date === dateStr)
      if (allowance) {
        setActivityId(allowance.activity_type === allowance.activity_type ? (ACTIVITY_TYPES.find(t => t.label === allowance.activity_type)?.id || allowance.activity_type) : '')
        
        // 古いIDを新しいIDにマッピング（後方互換性）
        let mappedDestinationId = DESTINATIONS.find(d => d.label === allowance.destination_type)?.id || 'inside_short'
        const idMapping: Record<string, string> = {
          'kannai': 'inside_short',
          'kennai_short': 'inside_short',
          'kennai_long': 'inside_long',
          'kengai': 'outside'
        }
        if (idMapping[mappedDestinationId]) {
          mappedDestinationId = idMapping[mappedDestinationId]
        }
        
        setDestinationId(mappedDestinationId)
        setDestinationDetail(allowance.destination_detail || '')
        setIsDriving(allowance.is_driving)
        setIsAccommodation(allowance.is_accommodation)
      } else {
        setActivityId('')
        setDestinationId('inside_short')
        setDestinationDetail('')
        setIsDriving(false)
        setIsAccommodation(false)
      }
    }
    updateDayInfo()
  }, [selectedDate, allowances, schoolCalendar])

  useEffect(() => {
    const isWorkDay = dayType.includes('勤務日') || dayType.includes('授業')
    if (!activityId) { setCalculatedAmount(0); return }
    
    const validation = canSelectActivity(activityId, isWorkDay)
    if (!validation.allowed) {
      console.warn(validation.message)
    }
    
    const isHalfDay = false
    const amt = calculateAmount(activityId, isDriving, destinationId, isWorkDay, isAccommodation, isHalfDay)
    setCalculatedAmount(amt)
  }, [activityId, isDriving, destinationId, dayType, isAccommodation])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAllowLocked) { 
      alert('手当が申請済みのため、編集できません。')
      return 
    }
    const dateStr = formatDate(selectedDate)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    if (activityId) {
      await supabase.from('allowances').delete().eq('user_id', user.id).eq('date', dateStr)
      await supabase.from('allowances').insert({ 
        user_id: user.id, 
        user_email: user.email, 
        date: dateStr, 
        activity_type: ACTIVITY_TYPES.find(a => a.id === activityId)?.label || activityId, 
        destination_type: DESTINATIONS.find(d => d.id === destinationId)?.label, 
        destination_detail: destinationDetail, 
        is_driving: isDriving, 
        is_accommodation: isAccommodation, 
        amount: calculatedAmount 
      })
    } else {
      await supabase.from('allowances').delete().eq('user_id', user.id).eq('date', dateStr)
    }
    
    fetchData(user.id)
    setShowInputModal(false)
    alert('保存しました')
  }

  const handleDelete = async (id: number, dateStr: string) => { 
    if (getLockStatus(new Date(dateStr))) { 
      alert('手当が申請済みのため削除できません')
      return 
    }
    if (!window.confirm('削除しますか？')) return
    const { error } = await supabase.from('allowances').delete().eq('id', id)
    if (!error) fetchData(userId)
  }
  
  const handleSubmit = async () => {
    if (!confirm(`${selectedDate.getMonth()+1}月分の手当を確定して申請しますか？\n※申請すると、承認されるまで手当の修正ができなくなります。`)) return
    const ym = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
    const { error } = await supabase.from('monthly_applications').upsert({ 
      user_id: userId, 
      year_month: ym, 
      application_type: 'allowance', 
      status: 'submitted', 
      submitted_at: new Date().toISOString() 
    })
    if (error) alert('申請エラー: ' + error.message)
    else { 
      alert('手当を申請しました！')
      setAllowanceStatus('submitted')
    }
  }

  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/login') }
  const handlePrevMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() - 1); setSelectedDate(d) }
  const handleNextMonth = () => { const d = new Date(selectedDate); d.setMonth(d.getMonth() + 1); setSelectedDate(d) }
  const calculateMonthTotal = () => { 
    const m = selectedDate.getMonth(), y = selectedDate.getFullYear()
    return allowances.filter(i => { 
      const d = new Date(i.date)
      return d.getMonth() === m && d.getFullYear() === y 
    }).reduce((s, i) => s + i.amount, 0) 
  }
  
  // カレンダー日付クリック時の処理
  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    setShowInputModal(true)
  }

  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    const dateStr = formatDate(date)
    const allowance = allowances.find(i => i.date === dateStr)

    return ( 
        <div className="flex flex-col items-start justify-start w-full h-full p-1 rounded-lg">
            {/* 手当金額のみ表示 */}
            {allowance && (
                <div className="mt-1 px-2 py-0.5 bg-blue-100 rounded-md">
                    <span className="text-xs font-bold text-blue-700">¥{allowance.amount.toLocaleString()}</span>
                </div>
            )}
            
            {/* 登録済みマーク */}
            {allowance && (
                <div className="absolute bottom-1 right-1">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                </div>
            )}
        </div> 
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
       {isAdmin && <div className="bg-slate-800 text-white text-center py-3 text-sm font-bold shadow-md"><a href="/admin" className="underline hover:text-blue-300 transition">事務担当者ページへ</a></div>}

      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <button onClick={handlePrevMonth} className="text-slate-400 hover:text-slate-600 p-2 text-2xl font-bold transition">‹</button>
                <h2 className="text-xl font-bold text-slate-800">{selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月</h2>
                <button onClick={handleNextMonth} className="text-slate-400 hover:text-slate-600 p-2 text-2xl font-bold transition">›</button>
              </div>
              <div className="text-3xl font-extrabold text-blue-600">¥{calculateMonthTotal().toLocaleString()}</div>
            </div>
            
            <div className="flex items-center gap-3">
              {/* 手当申請ステータス */}
              <div className="flex items-center gap-2">
                  {allowanceStatus === 'approved' && <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">💰 承認済</span>}
                  {allowanceStatus === 'submitted' && <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">💰 申請中</span>}
                  {allowanceStatus === 'draft' && !isAllowLocked && <button onClick={handleSubmit} className="text-xs font-bold text-white bg-blue-600 px-4 py-2 rounded-full hover:bg-blue-700 shadow-sm transition">💰 手当申請</button>}
              </div>
              <button onClick={() => setShowProfileModal(true)} className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-2 rounded-full border border-slate-200 hover:bg-slate-200 transition">
                  {userName ? `👤 ${userName}` : '⚙️ 氏名登録'}
              </button>
              <button onClick={handleLogout} className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-2 rounded-full border border-slate-200 hover:bg-slate-200 transition">ログアウト</button>
            </div>
          </div>
        </div>
      </div>

      {/* メインカレンダー表示 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <Calendar 
            onChange={(val) => handleDateClick(val as Date)} 
            value={selectedDate} 
            activeStartDate={selectedDate} 
            onActiveStartDateChange={({ activeStartDate }) => activeStartDate && setSelectedDate(activeStartDate)} 
            locale="ja-JP" 
            tileContent={getTileContent} 
            className="w-full border-none calendar-large" 
          />
        </div>
        
        {/* 月次サマリー */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-slate-700 text-lg mb-4">{selectedDate.getMonth() + 1}月の手当履歴</h3>
          <div className="space-y-2">
            {allowances.filter(i => { const d = new Date(i.date); return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear() }).map((item) => (
              <div key={item.id} className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-100 hover:border-slate-300 transition">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-slate-700 text-lg">{item.date.split('-')[2]}日</span>
                  <span className="text-sm text-slate-500">{item.activity_type}</span>
                  {item.destination_detail && <span className="text-xs text-slate-400">({item.destination_detail})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-slate-700 text-lg">¥{item.amount.toLocaleString()}</span>
                  {!isAllowLocked && <button onClick={() => handleDelete(item.id, item.date)} className="text-slate-300 hover:text-red-500 transition text-xl">🗑</button>}
                </div>
              </div>
            ))}
            {allowances.filter(i => { const d = new Date(i.date); return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear() }).length === 0 && (
              <div className="text-center py-8 text-slate-400">まだ手当の登録がありません</div>
            )}
          </div>
        </div>
      </div>

      {/* 入力フォームモーダル */}
      {showInputModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowInputModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center rounded-t-2xl">
              <div>
                <h2 className="font-bold text-slate-800 text-lg">{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({['日', '月', '火', '水', '木', '金', '土'][selectedDate.getDay()]}) の手当入力</h2>
                <div className="flex gap-2 mt-2">
                  {isAllowLocked && <span className="text-xs px-2 py-1 rounded font-bold bg-gray-100 text-gray-500">💰 編集不可</span>}
                  <span className={`text-xs px-2 py-1 rounded font-bold ${dayType.includes('休日') || dayType.includes('週休') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                    {dayType}
                  </span>
                </div>
              </div>
              <button onClick={() => setShowInputModal(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="p-6">
              <form onSubmit={handleSave} className={`flex flex-col gap-4 ${isAllowLocked ? 'opacity-60 pointer-events-none' : ''}`}>
            
            {/* 手当エリア */}
            <div>
                <div>
                <label className="block text-xs font-bold text-black mb-1">部活動 業務内容 {isAllowLocked && '(編集不可)'}</label>
                <select 
                    disabled={isAllowLocked} 
                    value={activityId} 
                    onChange={(e) => {
                        const newActivityId = e.target.value
                        const isWorkDay = dayType.includes('勤務日') || dayType.includes('授業')
                        const validation = canSelectActivity(newActivityId, isWorkDay)
                        if (!validation.allowed) {
                            alert(validation.message)
                            return
                        }
                        setActivityId(newActivityId)
                        setDestinationId('inside_short')
                    }} 
                    className="w-full bg-slate-50 p-3 rounded-lg border border-slate-200 font-bold text-black text-sm"
                >
                    <option value="">なし (部活なし)</option>
                    {ACTIVITY_TYPES.map(type => {
                        const isWorkDay = dayType.includes('勤務日') || dayType.includes('授業')
                        const validation = canSelectActivity(type.id, isWorkDay)
                        return (
                            <option 
                                key={type.id} 
                                value={type.id}
                                disabled={!validation.allowed}
                            >
                                {type.label} {!validation.allowed ? '(勤務日不可)' : ''}
                            </option>
                        )
                    })}
                </select>
                {activityId && (() => {
                    const isWorkDay = dayType.includes('勤務日') || dayType.includes('授業')
                    const validation = canSelectActivity(activityId, isWorkDay)
                    if (!validation.allowed) {
                        return <div className="text-xs text-red-600 mt-1 font-bold">⚠️ {validation.message}</div>
                    }
                    return null
                })()}
                </div>
                {activityId && (
                <>
                    {/* 「その他」選択時は内容入力欄を全幅で表示 */}
                    {activityId === 'OTHER' ? (
                        <div className="mt-2">
                            <label className="block text-xs font-bold text-red-600 mb-1">具体的な内容（必須）</label>
                            <input 
                                disabled={isAllowLocked} 
                                type="text" 
                                placeholder="例: 非常災害による緊急対応" 
                                value={destinationDetail} 
                                onChange={(e) => setDestinationDetail(e.target.value)} 
                                className="w-full bg-white p-3 rounded-lg border border-red-200 text-xs text-black font-bold" 
                                required
                            />
                            <div className="text-xs text-slate-500 mt-1">※「その他」を選択した場合は、具体的な業務内容を必ず記入してください。</div>
                        </div>
                    ) : (
                    <div className="grid grid-cols-2 gap-2 mt-2">
                            <div>
                                <label className="block text-xs font-bold text-black mb-1">行き先（区分）</label>
                                <select 
                                    disabled={isAllowLocked} 
                                    value={destinationId} 
                                    onChange={(e) => setDestinationId(e.target.value)} 
                                    className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs text-black font-bold"
                                >
                                    {DESTINATIONS.map(d => <option key={d.id} value={d.id}>{d.label}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-black mb-1">詳細</label>
                                <input 
                                    disabled={isAllowLocked} 
                                    type="text" 
                                    placeholder="例: 県体育館" 
                                    value={destinationDetail} 
                                    onChange={(e) => setDestinationDetail(e.target.value)} 
                                    className="w-full bg-white p-3 rounded-lg border border-slate-200 text-xs text-black font-bold" 
                                />
                            </div>
                    </div>
                    )}
                    
                    {/* 運転・宿泊フラグ */}
                    <div className="flex gap-3 mt-2">
                        <label className={`flex-1 p-3 rounded-lg cursor-pointer border text-center text-xs font-bold ${isDriving ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400'}`}>
                            <input 
                                disabled={isAllowLocked} 
                                type="checkbox" 
                                checked={isDriving} 
                                onChange={e => setIsDriving(e.target.checked)} 
                                className="hidden" 
                            />
                            🚗 運転あり
                        </label>
                        <label className={`flex-1 p-3 rounded-lg cursor-pointer border text-center text-xs font-bold ${isAccommodation ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-slate-200 text-slate-400'}`}>
                            <input 
                                disabled={isAllowLocked} 
                                type="checkbox" 
                                checked={isAccommodation} 
                                onChange={e => setIsAccommodation(e.target.checked)} 
                                className="hidden" 
                            />
                            🏨 宿泊あり
                        </label>
                    </div>
                    
                    {/* 計算ロジック説明 */}
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 mt-2">
                        <div className="text-xs text-blue-700 mb-1">
                            <span className="font-bold">📋 計算内訳:</span>
                        </div>
                        <div className="text-xs text-slate-600">
                            {(() => {
                                const isWorkDay = dayType.includes('勤務日') || dayType.includes('授業')
                                
                                // 運転ありの場合の最優先ルール
                                if (isDriving) {
                                    if (destinationId === 'outside') {
                                        const baseAmount = 15000
                                        const total = isAccommodation && (activityId === 'E' || activityId === 'F') ? baseAmount + 2400 : baseAmount
                                        return `【運転】県外: ${total.toLocaleString()}円${isAccommodation ? ' (運転15,000円＋宿泊2,400円)' : ''}`
                                    }
                                    if (destinationId === 'inside_long') {
                                        const baseAmount = 7500
                                        const total = isAccommodation && (activityId === 'E' || activityId === 'F') ? baseAmount + 2400 : baseAmount
                                        return `【運転】県内120km以上: ${total.toLocaleString()}円${isAccommodation ? ' (運転7,500円＋宿泊2,400円)' : ''}`
                                    }
                                    if (destinationId === 'inside_short' || destinationId === 'school') {
                                        if (activityId === 'C') return '【運転】指定大会（管内）: 3,400円'
                                        if (activityId === 'E' || activityId === 'F') {
                                            if (isWorkDay) {
                                                return isAccommodation ? '【運転】勤務日（管内＋宿泊）: 7,500円' : '【運転】勤務日（管内）: 5,100円'
                                            }
                                            return '【運転】休日（管内）: 2,400円'
                                        }
                                    }
                                }
                                
                                // 運転なしの場合
                                if (activityId === 'A') return '休日部活(1日): 2,400円'
                                if (activityId === 'B') return '休日部活(半日): 1,700円'
                                if (activityId === 'C') return '指定大会（運転なし）: 3,400円'
                                if (activityId === 'D') return '指定外大会: 2,400円'
                                if (activityId === 'E' || activityId === 'F') {
                                    if (isWorkDay) {
                                        return isAccommodation ? '勤務日（宿泊のみ）: 2,400円' : '勤務日（運転なし）: 0円'
                                    }
                                    return '休日（運転なし）: 2,400円'
                                }
                                if (activityId === 'G') return '研修旅行等引率: 3,400円'
                                if (activityId === 'H') return '宿泊指導: 2,400円'
                                if (activityId === 'OTHER') return 'その他: 6,000円'
                                return '計算中...'
                            })()}
                        </div>
                    </div>
                    
                    <div className="bg-slate-800 text-white p-4 rounded-xl flex justify-between items-center mt-2">
                        <span className="text-xs font-medium">支給予定額</span>
                        <span className="text-xl font-bold">¥{calculatedAmount.toLocaleString()}</span>
                    </div>
                </>
                )}
            </div>

            {!isAllowLocked && (
                <button type="submit" className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 shadow-md text-lg">
                    💾 この内容で保存する
                </button>
            )}
          </form>
            </div>
          </div>
        </div>
      )}

      {/* 氏名登録モーダル */}
      {showProfileModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white p-6 rounded-2xl shadow-xl w-full max-w-sm">
                  <h3 className="text-lg font-bold text-slate-800 mb-4">氏名登録</h3>
                  <p className="text-xs text-slate-500 mb-4">帳票出力に使用する氏名を登録してください。<br/>自動的に姓と名の間に半角スペースが入ります。</p>
                  
                  <div className="flex gap-2 mb-4">
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500">姓 (Last Name)</label>
                          <input type="text" value={inputLastName} onChange={(e) => setInputLastName(e.target.value)} placeholder="例: 羽黒" className="w-full p-3 rounded border border-slate-300 mt-1 font-bold text-black" />
                      </div>
                      <div className="flex-1">
                          <label className="text-xs font-bold text-slate-500">名 (First Name)</label>
                          <input type="text" value={inputFirstName} onChange={(e) => setInputFirstName(e.target.value)} placeholder="例: 太郎" className="w-full p-3 rounded border border-slate-300 mt-1 font-bold text-black" />
                      </div>
                  </div>
                  
                  <div className="flex gap-2">
                      <button onClick={() => setShowProfileModal(false)} className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-500 font-bold">キャンセル</button>
                      <button onClick={handleSaveProfile} className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold shadow">登録する</button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}

// Update trigger: 2026-01-19 23:45:00 JST - Force rebuild for Vercel deployment
// This ensures the page is properly recognized and deployed
