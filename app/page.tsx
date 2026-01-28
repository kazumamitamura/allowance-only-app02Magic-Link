'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { handleSupabaseError, logSupabaseError } from '@/utils/supabase/errorHandler'
import { useRouter } from 'next/navigation'
import Calendar from 'react-calendar'
import 'react-calendar/dist/Calendar.css'
import { ACTIVITY_TYPES, DESTINATIONS, calculateAmount, calculateAmountFromMaster, canSelectActivity } from '@/utils/allowanceRules'
import { logout } from './auth/actions'

const ADMIN_EMAILS = ['mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp'].map(e => e.toLowerCase())

type Allowance = { 
  id: number
  user_id: string
  user_email?: string
  date: string
  activity_type: string
  amount: number
  destination_type?: string | null
  destination_detail?: string | null
  is_driving: boolean
  is_accommodation: boolean
  custom_amount?: number | null
  custom_description?: string | null
  created_at?: string
  updated_at?: string
}
type SchoolCalendar = { date: string, day_type: string }
type AnnualSchedule = { date: string, work_type: string, event_name: string }
type AllowanceType = { id: number, code: string, display_name: string, base_amount: number, requires_holiday: boolean }

const formatDate = (date: Date) => {
  const y = date.getFullYear()
  const m = ('00' + (date.getMonth() + 1)).slice(-2)
  const d = ('00' + date.getDate()).slice(-2)
  return `${y}-${m}-${d}`
}

/**
 * 日本の祝日を判定する関数
 * @param date 判定する日付
 * @returns 祝日名（祝日でない場合はnull）
 */
const getJapaneseHoliday = (date: Date): string | null => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  
  // 固定祝日
  if (month === 1 && day === 1) return '元日'
  if (month === 1 && day === 2) return '振替休日' // 元日が日曜の場合
  if (month === 1 && day === 3) return '振替休日' // 元日が土曜の場合
  if (month === 2 && day === 11) return '建国記念の日'
  if (month === 2 && day === 23) return '天皇誕生日'
  if (month === 2 && day === 24) return '振替休日' // 天皇誕生日が日曜の場合
  if (month === 4 && day === 29) return '昭和の日'
  if (month === 5 && day === 3) return '憲法記念日'
  if (month === 5 && day === 4) return 'みどりの日'
  if (month === 5 && day === 5) return 'こどもの日'
  if (month === 8 && day === 11) return '山の日'
  if (month === 8 && day === 12) return '振替休日' // 山の日が日曜の場合
  if (month === 11 && day === 3) return '文化の日'
  if (month === 11 && day === 23) return '勤労感謝の日'
  
  // 変動祝日（春分の日・秋分の日）
  // 春分の日の計算式（2000年〜2099年）
  if (month === 3) {
    const springEquinox = Math.floor(20.8431 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4)
    if (day === springEquinox) return '春分の日'
  }
  
  // 秋分の日の計算式（2000年〜2099年）
  if (month === 9) {
    const autumnEquinox = Math.floor(23.2488 + 0.242194 * (year - 1980)) - Math.floor((year - 1980) / 4)
    if (day === autumnEquinox) return '秋分の日'
  }
  
  // 成人の日（1月の第2月曜日）
  if (month === 1) {
    const firstMonday = (8 - new Date(year, 0, 1).getDay()) % 7 || 7
    const adultDay = firstMonday + 7
    if (day === adultDay) return '成人の日'
  }
  
  // 海の日（7月の第3月曜日、2023年以降は固定7月17日）
  if (month === 7) {
    if (year >= 2023 && day === 17) {
      return '海の日'
    } else if (year < 2023) {
      const firstMonday = (8 - new Date(year, 6, 1).getDay()) % 7 || 7
      const marineDay = firstMonday + 14
      if (day === marineDay) return '海の日'
    }
  }
  
  // 敬老の日（9月の第3月曜日）
  if (month === 9) {
    const firstMonday = (8 - new Date(year, 8, 1).getDay()) % 7 || 7
    const respectDay = firstMonday + 14
    if (day === respectDay) return '敬老の日'
  }
  
  // スポーツの日（10月の第2月曜日、2020年は7月24日、2021年は7月23日）
  if (month === 10) {
    if (year === 2020 && day === 24) return 'スポーツの日'
    if (year === 2021 && day === 23) return 'スポーツの日'
    const firstMonday = (8 - new Date(year, 9, 1).getDay()) % 7 || 7
    const sportsDay = firstMonday + 7
    if (day === sportsDay) return 'スポーツの日'
  }
  
  return null
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
  const [annualSchedules, setAnnualSchedules] = useState<AnnualSchedule[]>([])
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([])
  
  const [allowanceStatus, setAllowanceStatus] = useState<'draft' | 'submitted' | 'approved'>('draft')
  
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [selectedDates, setSelectedDates] = useState<Date[]>([]) // 複数日選択用
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false) // 複数選択モード
  const [dayType, setDayType] = useState<string>('---')
  
  // 月次集計データ
  const [monthTotal, setMonthTotal] = useState(0)
  const [campDays, setCampDays] = useState(0)
  const [expeditionDays, setExpeditionDays] = useState(0)

  // 氏名登録モーダル用
  const [showProfileModal, setShowProfileModal] = useState(false)
  
  // 入力フォームモーダル用
  const [showInputModal, setShowInputModal] = useState(false)
  const [inputLastName, setInputLastName] = useState('')
  const [inputFirstName, setInputFirstName] = useState('')

  const [activityId, setActivityId] = useState('')
  const [destinationId, setDestinationId] = useState('inside_short')
  const [destinationDetail, setDestinationDetail] = useState('') // 目的地（運転時）
  const [competitionName, setCompetitionName] = useState('') // 大会名（指定大会時）
  const [isDriving, setIsDriving] = useState(false)
  const [isAccommodation, setIsAccommodation] = useState(false)
  const [calculatedAmount, setCalculatedAmount] = useState(0)
  const [customAmount, setCustomAmount] = useState(0)
  const [customDescription, setCustomDescription] = useState('')

  const getLockStatus = (targetDate: Date) => {
    if (isAdmin) return false
    const now = new Date()
    // 翌月10日23:59までは編集可能
    const deadline = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 10, 23, 59, 59)
    const isPastDeadline = now > deadline
    const currentViewMonth = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
    const targetMonth = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}`
    const isTargetMonth = currentViewMonth === targetMonth
    return isPastDeadline || (isTargetMonth && allowanceStatus !== 'draft')
  }

  const isAllowLocked = getLockStatus(selectedDate)

  useEffect(() => {
    const init = async () => {
      console.log('=== 初期化開始 ===')
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { 
        console.log('ユーザー未認証、ログイン画面へ')
        router.push('/login')
        return 
      }
      console.log('ユーザー認証成功:', user.email)
      setUserEmail(user.email || '')
      setUserId(user.id)
      if (ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        setIsAdmin(true)
        console.log('管理者権限あり')
      }
      
      // プロフィール取得
      await fetchProfile(user.id)

      // データ取得（並行実行）
      await Promise.all([
        fetchData(user.id),
        fetchSchoolCalendar(),
        fetchAnnualSchedules(),
        fetchAllowanceTypes(),
      fetchApplicationStatus(user.id, selectedDate)
      ])
      
      console.log('=== 初期化完了 ===')
    }
    init()
  }, [])

  // 氏名取得
  const fetchProfile = async (uid: string) => {
      console.log('プロフィール取得開始:', uid)
      
      // まず全カラムを取得してデバッグ
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', uid)
        .single()
      
      console.log('プロフィール取得結果:', { data, error })
      
      if (error) {
        console.error('プロフィール取得エラー:', error)
        // display_nameカラムが存在しない場合のフォールバック処理
        setShowProfileModal(true) // 氏名登録モーダルを表示
        return
      }
      
      // display_name のみをチェック（full_nameカラムは存在しない）
      const name = data?.display_name || ''
      console.log('取得した氏名:', name)
      
      if (name) {
        setUserName(name)
      } else {
        // 氏名が未登録の場合
        console.warn('氏名が未登録です')
        setShowProfileModal(true)
      }
  }

  // 氏名保存処理
  const handleSaveProfile = async () => {
      if (!inputLastName || !inputFirstName) {
          alert('姓と名の両方を入力してください')
          return
      }
      if (!userId) {
          alert('ユーザーIDが取得できませんでした。ページをリロードしてください。')
          return
      }
      
      const fullName = `${inputLastName.trim()} ${inputFirstName.trim()}`
      
      console.log('=== 氏名保存開始 ===')
      console.log('User ID:', userId)
      console.log('Full Name:', fullName)
      console.log('User Email:', userEmail)
      
      // まず、既存のレコードがあるか確認
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()
      
      console.log('既存プロフィール確認:', { existingProfile, checkError })
      
      let result
      let error
      
      if (existingProfile) {
          // 既存レコードがある場合は更新
          console.log('既存レコードを更新します')
          result = await supabase
            .from('user_profiles')
            .update({ 
              display_name: fullName,
              email: userEmail || ''
            })
            .eq('user_id', userId)
            .select()
      } else {
          // レコードが存在しない場合は挿入
          console.log('新規レコードを挿入します')
          result = await supabase
            .from('user_profiles')
            .insert({ 
              user_id: userId,
              email: userEmail || '',
              display_name: fullName
            })
            .select()
      }
      
      const { data, error: saveError } = result
      error = saveError

      console.log('氏名保存結果:', { data, error })

      if (error) {
          console.error('氏名登録エラー（詳細）:', {
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
          } else if (error.code === '42501' || error.message.includes('permission denied')) {
              errorMessage += '\n\nアクセス権限の問題が発生しています。\n管理者にお問い合わせください。'
          }
          
          alert(errorMessage)
      } else {
          console.log('氏名登録成功:', fullName)
          setUserName(fullName)
          setShowProfileModal(false)
          setInputLastName('')
          setInputFirstName('')
          // プロフィールを再取得して確認
          await fetchProfile(userId)
          alert('氏名を登録しました！')
      }
  }

  useEffect(() => { if (userId) fetchApplicationStatus(userId, selectedDate) }, [selectedDate, userId])

  // 月次集計の自動計算
  useEffect(() => {
    console.log('=== 月次集計開始 ===')
    console.log('全手当データ件数:', allowances.length)
    console.log('選択月:', selectedDate.getFullYear(), '年', selectedDate.getMonth() + 1, '月')
    
    const monthAllowances = allowances.filter(i => {
      const d = new Date(i.date)
      const match = d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear()
      console.log('日付:', i.date, '金額:', i.amount, '活動:', i.activity_type, '月一致:', match)
      return match
    })

    console.log('対象月の手当件数:', monthAllowances.length)
    console.log('対象月の手当詳細:', monthAllowances)

    // 合計金額（数値型に変換して計算）
    const total = monthAllowances.reduce((sum, i) => {
      const amount = typeof i.amount === 'string' ? parseInt(i.amount, 10) : (i.amount || 0)
      console.log('加算:', sum, '+', amount, '=', sum + amount)
      return sum + amount
    }, 0)
    console.log('計算された合計金額:', total, '（型:', typeof total, '）')
    setMonthTotal(total)

    // 合宿日数（activity_typeに「合宿」を含む、またはcodeが'F'）
    const camps = monthAllowances.filter(a => 
      a.activity_type?.includes('合宿') || a.activity_type?.includes('Training Camp') || a.activity_type?.includes('F.')
    ).length
    setCampDays(camps)

    // 遠征日数（activity_typeに「遠征」を含む、またはcodeが'E'）
    const expeditions = monthAllowances.filter(a => 
      a.activity_type?.includes('遠征') || a.activity_type?.includes('Expedition') || a.activity_type?.includes('E.')
    ).length
    setExpeditionDays(expeditions)

    console.log('月次集計結果:', {
      year: selectedDate.getFullYear(),
      month: selectedDate.getMonth() + 1,
      total,
      camps,
      expeditions,
      dataCount: monthAllowances.length
    })
    console.log('=== 月次集計終了 ===')
  }, [allowances, selectedDate])

  const fetchData = async (uid: string) => {
    console.log('=== 手当データ取得開始 ===')
    console.log('ユーザーID:', uid)
    try {
      const { data: allowData, error } = await supabase
        .from('allowances')
      .select('*')
      .eq('user_id', uid)
        .order('date', { ascending: false })
    
      if (error) {
        logSupabaseError('手当データ取得', error)
        // エラーが発生しても空配列を設定して続行（ユーザー体験を優先）
        setAllowances([])
    } else {
        console.log('手当データ取得成功:', allowData?.length, '件')
        if (allowData && allowData.length > 0) {
          console.log('取得したデータサンプル:', allowData[0])
          console.log('全データ:', allowData)
          
          // amountを数値型に変換（文字列で保存されている場合の対策）
          const normalizedData = allowData.map(item => ({
            ...item,
            amount: typeof item.amount === 'string' ? parseInt(item.amount, 10) : item.amount
          }))
          setAllowances(normalizedData)
        } else {
          setAllowances(allowData || [])
        }
      }
    } catch (err) {
      console.error('手当データ取得中の予期しないエラー:', err)
      setAllowances([])
    }
    console.log('=== 手当データ取得終了 ===')
  }

  const fetchSchoolCalendar = async () => {
    try {
      const { data, error } = await supabase.from('school_calendar').select('*')
      if (error) {
        logSupabaseError('学校カレンダー取得', error)
        setSchoolCalendar([])
      } else {
        setSchoolCalendar(data || [])
  }
    } catch (err) {
      console.error('学校カレンダー取得中の予期しないエラー:', err)
      setSchoolCalendar([])
    }
  }

  const fetchAnnualSchedules = async () => {
    try {
      const { data, error } = await supabase.from('annual_schedules').select('*')
      if (error) {
        logSupabaseError('年間予定取得', error)
        setAnnualSchedules([])
      } else {
        setAnnualSchedules(data || [])
      }
    } catch (err) {
      console.error('年間予定取得中の予期しないエラー:', err)
      setAnnualSchedules([])
    }
  }

  const fetchAllowanceTypes = async () => {
    try {
      const { data, error } = await supabase.from('allowance_types').select('*').order('code')
      if (error) {
        logSupabaseError('手当種別取得', error)
        setAllowanceTypes([])
      } else {
        setAllowanceTypes(data || [])
      }
    } catch (err) {
      console.error('手当種別取得中の予期しないエラー:', err)
      setAllowanceTypes([])
    }
  }

  const fetchApplicationStatus = async (uid: string, date: Date) => {
    try {
    const ym = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const { data, error } = await supabase.from('monthly_applications').select('application_type, status').eq('user_id', uid).eq('year_month', ym)
      if (error) {
        logSupabaseError('申請状態取得', error)
        setAllowanceStatus('draft')
      } else {
    const allow = data?.find(d => d.application_type === 'allowance')
    setAllowanceStatus(allow?.status || 'draft')
      }
    } catch (err) {
      console.error('申請状態取得中の予期しないエラー:', err)
      setAllowanceStatus('draft')
    }
  }

  useEffect(() => {
    const updateDayInfo = async () => {
      const dateStr = formatDate(selectedDate)
      
      // annual_schedulesを優先的に使用（CSVアップロードされたデータ）
      const annualSchedule = annualSchedules.find(s => s.date === dateStr)
      let type = ''
      
      // 土曜日（6）と日曜日（0）を休日として判定
      const dayOfWeek = selectedDate.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6
      
      // 日本の祝日を判定
      const holidayName = getJapaneseHoliday(selectedDate)
      const isHoliday = holidayName !== null
      
      if (annualSchedule) {
        // work_typeに基づいてday_typeを決定
        const workType = annualSchedule.work_type.toUpperCase()
        if (workType === 'A' || workType === 'B' || workType === 'C') {
          type = '勤務日'
        } else if (workType === '休' || workType === '祝') {
          type = '休日'
        } else {
          // work_typeが不明な場合、祝日または週末は休日、平日は勤務日
          type = (isHoliday || isWeekend) ? '休日' : '勤務日'
        }
        
        // 行事名がある場合は追加
        if (annualSchedule.event_name) {
          type += `(${annualSchedule.event_name})`
        }
      } else {
        // annual_schedulesがない場合はschoolCalendarを使用
        const calData = schoolCalendar.find(c => c.date === dateStr)
        if (calData) {
          type = calData.day_type
          // schoolCalendarにデータがあっても、祝日判定を優先
          if (isHoliday && !calData.day_type.includes('休日')) {
            type = `休日(${holidayName})`
          }
        } else {
          // どちらもない場合、祝日または週末は休日、平日は勤務日
          if (isHoliday) {
            type = `休日(${holidayName})`
          } else {
            type = isWeekend ? '休日(仮)' : '勤務日(仮)'
          }
        }
      }
      
      setDayType(type)

      const allowance = allowances.find(a => a.date === dateStr)
      if (allowance) {
        setActivityId(allowance.activity_type === allowance.activity_type ? (ACTIVITY_TYPES.find(t => t.label === allowance.activity_type)?.id || allowance.activity_type) : '')
        
        // 古いIDを新しいIDにマッピング（後方互換性）
        let mappedDestinationId = DESTINATIONS.find(d => d.label === (allowance.destination_type || ''))?.id || 'inside_short'
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
        
        // 指定大会の場合は大会名として扱う
        if (allowance.activity_type.includes('C:') || allowance.activity_type.includes('指定大会')) {
          const detail = allowance.destination_detail || ''
          // 「大会名（目的地）」の形式で保存されている場合は分離
          const match = detail.match(/^(.+?)（(.+?)）$/)
          if (match && allowance.is_driving) {
            setCompetitionName(match[1]) // 大会名
            setDestinationDetail(match[2]) // 目的地
          } else {
            setCompetitionName(detail) // 大会名のみ
            setDestinationDetail('') // 目的地はクリア
          }
        } else {
        setDestinationDetail(allowance.destination_detail || '')
          setCompetitionName('') // 大会名はクリア
        }
        
        setIsDriving(allowance.is_driving || false)
        setIsAccommodation(allowance.is_accommodation || false)
        // custom_amount と custom_description は、カラムが存在する場合のみ使用
        setCustomAmount(allowance.custom_amount || 0)
        setCustomDescription(allowance.custom_description || '')
      } else {
        setActivityId('')
        setDestinationId('inside_short')
        setDestinationDetail('')
        setCompetitionName('')
        setIsDriving(false)
        setIsAccommodation(false)
        setCustomAmount(0)
        setCustomDescription('')
      }
    }
    updateDayInfo()
  }, [selectedDate, allowances, schoolCalendar, annualSchedules])

  useEffect(() => {
    console.log('=== 支給予定額の計算開始 ===')
    console.log('activityId:', activityId)
    console.log('dayType:', dayType)
    console.log('isDriving:', isDriving)
    console.log('destinationId:', destinationId)
    console.log('isAccommodation:', isAccommodation)
    console.log('allowanceTypes件数:', allowanceTypes.length)
    
    // 休日判定: dayTypeに'休日'が含まれる場合は休日、それ以外は勤務日
    const isWorkDay = !dayType.includes('休日') && (dayType.includes('勤務日') || dayType.includes('授業'))
    console.log('勤務日判定:', isWorkDay)
    
    if (!activityId) { 
      console.log('activityIdが未選択のため、0円')
      setCalculatedAmount(0)
      return 
    }
    
    const validation = canSelectActivity(activityId, isWorkDay)
    if (!validation.allowed) {
      console.warn('選択制限:', validation.message)
    }
    
    // 手入力その他（CUSTOM）の場合は、カスタム金額を使用
    if (activityId === 'CUSTOM') {
      console.log('手入力その他:', customAmount, '円')
      setCalculatedAmount(customAmount)
      return
    }
    
    const isHalfDay = false
    // マスタ参照計算を優先、マスタがない場合は従来ロジック
    const amt = allowanceTypes.length > 0 
      ? calculateAmountFromMaster(activityId, isDriving, destinationId, isWorkDay, isAccommodation, isHalfDay, allowanceTypes)
      : calculateAmount(activityId, isDriving, destinationId, isWorkDay, isAccommodation, isHalfDay)
    
    console.log('計算結果:', amt, '円')
    console.log('=== 支給予定額の計算終了 ===')
    setCalculatedAmount(amt)
  }, [activityId, isDriving, destinationId, dayType, isAccommodation, allowanceTypes, customAmount])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isAllowLocked) { 
      alert('手当が申請済みのため、編集できません。')
      return 
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('ユーザー情報が取得できません')
      alert('ユーザー情報が取得できません。再ログインしてください。')
          return
      }
      
    // 保存対象の日付リスト（複数選択されている場合は全日付、そうでなければ単一日付）
    const targetDates = selectedDates.length > 0 ? selectedDates : [selectedDate]
    
    console.log('保存するユーザー:', {
      user_id: user.id,
      email: user.email,
      dates: targetDates.map(d => formatDate(d))
    })

    if (activityId) {
      // カスタム（手入力その他）の場合、バリデーション
      if (activityId === 'CUSTOM') {
        if (!customDescription || customAmount <= 0) {
          alert('手入力その他を選択した場合、内容と金額を必ず入力してください。')
          return
        }
      }
      
      // 各日付に対してデータを保存
      for (const date of targetDates) {
        const dateStr = formatDate(date)
        
        // destination_detailの決定
        let detailValue = ''
        if (activityId === 'CUSTOM') {
          detailValue = customDescription
        } else if (activityId === 'C') {
          // 指定大会の場合：大会名と目的地を結合
          if (isDriving && destinationDetail) {
            detailValue = `${competitionName}（${destinationDetail}）`
          } else {
            detailValue = competitionName
          }
        } else {
          detailValue = destinationDetail
        }
        
        // 新規データを挿入
        const insertData: any = { 
          user_id: user.id, 
          user_email: user.email, 
          date: dateStr, 
          activity_type: ACTIVITY_TYPES.find(a => a.id === activityId)?.label || activityId, 
          destination_type: DESTINATIONS.find(d => d.id === destinationId)?.label, 
          destination_detail: detailValue, 
          is_driving: isDriving, 
          is_accommodation: isAccommodation, 
          amount: calculatedAmount
        }
        
        console.log('挿入データ:', dateStr, insertData)
        
        // リトライロジック（スキーマキャッシュエラー対策）
        let insertError = null
        let insertedData = null
        const maxRetries = 3
        const retryDelay = 2000 // 2秒
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          // 既存データを削除
          const { error: deleteError } = await supabase.from('allowances').delete().eq('user_id', user.id).eq('date', dateStr)
          if (deleteError && deleteError.code !== 'PGRST205') {
            console.error('削除エラー:', dateStr, deleteError)
          }
          
          // データを挿入
          const result = await supabase.from('allowances').insert(insertData).select()
          insertError = result.error
          insertedData = result.data
          
          // スキーマキャッシュエラー（PGRST205）の場合はリトライ
          if (insertError && (insertError.code === 'PGRST205' || insertError.message?.includes('schema cache'))) {
            if (attempt < maxRetries) {
              console.warn(`スキーマキャッシュエラー検出 (試行 ${attempt}/${maxRetries})。${retryDelay}ms待機して再試行します...`)
              await new Promise(resolve => setTimeout(resolve, retryDelay))
              continue
            }
          } else {
            // スキーマキャッシュエラー以外、または成功した場合はループを抜ける
            break
          }
        }
        
        if (insertError) {
          logSupabaseError(`手当データ保存 (${dateStr})`, insertError)
          const errorMessage = handleSupabaseError(insertError)
          alert(`${dateStr} の保存に失敗しました:\n\n${errorMessage}`)
          return
        }
        
        console.log('挿入成功:', dateStr, insertedData)
      }
        } else {
      // 手当なしの場合は削除のみ
      for (const date of targetDates) {
        const dateStr = formatDate(date)
        
        // リトライロジック（スキーマキャッシュエラー対策）
        const maxRetries = 3
        const retryDelay = 2000 // 2秒
        let deleteError = null
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          const result = await supabase.from('allowances').delete().eq('user_id', user.id).eq('date', dateStr)
          deleteError = result.error
          
          // スキーマキャッシュエラー（PGRST205）の場合はリトライ
          if (deleteError && (deleteError.code === 'PGRST205' || deleteError.message?.includes('schema cache'))) {
            if (attempt < maxRetries) {
              console.warn(`スキーマキャッシュエラー検出 (試行 ${attempt}/${maxRetries})。${retryDelay}ms待機して再試行します...`)
              await new Promise(resolve => setTimeout(resolve, retryDelay))
              continue
            }
          } else {
            // スキーマキャッシュエラー以外、または成功した場合はループを抜ける
            break
          }
        }
        
        if (deleteError && deleteError.code !== 'PGRST205') {
          console.error('削除エラー:', dateStr, deleteError)
        }
      }
    }
    
    await fetchData(user.id)
    setShowInputModal(false)
    setSelectedDates([]) // 複数選択をクリア
    
    // selectedDateを保持（1日にリセットしない）
    // 複数選択の場合は最初の日付を保持、単一選択の場合はその日付を保持
    if (targetDates.length > 0) {
      setSelectedDate(targetDates[0])
    }
    
    const message = targetDates.length > 1 
      ? `${targetDates.length}日分のデータを保存しました` 
      : '保存しました'
    alert(message)
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
    // 手当データの確認
    const monthAllowances = allowances.filter(i => {
      const d = new Date(i.date)
      return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear()
    })

    if (monthAllowances.length === 0) {
      alert('手当データが登録されていません。先に手当を入力してください。')
      return
    }

    const monthTotal = monthAllowances.reduce((sum, i) => sum + i.amount, 0)

    if (!confirm(`${selectedDate.getMonth()+1}月分の手当（${monthAllowances.length}件、合計¥${monthTotal.toLocaleString()}）を確定して申請しますか？\n\n※申請すると、承認されるまで手当の修正ができなくなります。`)) return
    
    const ym = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}`
    
    console.log('申請データ:', {
      user_id: userId,
      user_email: userEmail,
      year_month: ym,
      application_type: 'allowance',
      status: 'submitted',
      submitted_at: new Date().toISOString()
    })

    const { data, error } = await supabase.from('monthly_applications').upsert({ 
      user_id: userId,
      user_email: userEmail,
      year_month: ym, 
      application_type: 'allowance', 
      status: 'submitted', 
      submitted_at: new Date().toISOString() 
    }, { onConflict: 'user_id,year_month,application_type' })
    
    if (error) {
      logSupabaseError('手当申請', error)
      const errorMessage = handleSupabaseError(error)
      alert('申請に失敗しました:\n\n' + errorMessage)
    } else { 
      console.log('申請成功:', data)
      await fetchApplicationStatus(userId, selectedDate)
      alert(`手当を申請しました！\n\n${selectedDate.getMonth()+1}月分（${monthAllowances.length}件、¥${monthTotal.toLocaleString()}）`)
      setAllowanceStatus('submitted')
    }
  }

  const handleLogout = async () => { 
    await logout()
  }
  const handlePrevMonth = () => { 
    const d = new Date(selectedDate)
    const currentDay = d.getDate()
    d.setMonth(d.getMonth() - 1)
    // 新しい月に同じ日付が存在する場合は保持、存在しない場合は1日に設定
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(currentDay, maxDay))
    setSelectedDate(d)
  }
  const handleNextMonth = () => { 
    const d = new Date(selectedDate)
    const currentDay = d.getDate()
    d.setMonth(d.getMonth() + 1)
    // 新しい月に同じ日付が存在する場合は保持、存在しない場合は1日に設定
    const maxDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
    d.setDate(Math.min(currentDay, maxDay))
    setSelectedDate(d)
  }
  
  // カレンダー日付クリック時の処理
  const handleDateClick = (date: Date, event?: React.MouseEvent) => {
    // 複数選択モード（PC: Ctrl/Cmd押下、スマホ: 複数選択モード有効）
    const isMultiSelect = isMultiSelectMode || event?.ctrlKey || event?.metaKey
    
    // まず確実にselectedDateを更新
    setSelectedDate(date)
    
    if (isMultiSelect) {
      // 複数選択モード: 日付を配列に追加/削除（トグル）
      const dateStr = formatDate(date)
      const isAlreadySelected = selectedDates.some(d => formatDate(d) === dateStr)
      
      if (isAlreadySelected) {
        // 既に選択されている場合は削除
        setSelectedDates(selectedDates.filter(d => formatDate(d) !== dateStr))
      } else {
        // 未選択の場合は追加
        setSelectedDates([...selectedDates, date])
      }
    } else {
      // 単一選択モード
      setSelectedDates([]) // 複数選択をクリア
      
      // ロックチェック
      if (getLockStatus(date)) {
        alert('⏰ 締め切り済みのため編集できません\n\n対象月の翌月10日までに入力・編集を完了してください。')
        return
      }
      setShowInputModal(true)
    }
  }
  
  // 複数選択モードの完了
  const handleMultiSelectComplete = () => {
    if (selectedDates.length === 0) {
      alert('日付を選択してください')
      return
    }
    
    // ロックチェック（選択された日付のいずれかがロックされている場合）
    const hasLockedDate = selectedDates.some(date => getLockStatus(date))
    if (hasLockedDate) {
      alert('⏰ 選択した日付の中に締め切り済みのものが含まれています\n\n対象月の翌月10日までに入力・編集を完了してください。')
      return
    }
    
    setIsMultiSelectMode(false)
    setShowInputModal(true)
  }
  
  // 複数選択モードのキャンセル
  const handleMultiSelectCancel = () => {
    setIsMultiSelectMode(false)
    setSelectedDates([])
  }

  const getTileContent = ({ date, view }: { date: Date; view: string }) => {
    if (view !== 'month') return null
    const dateStr = formatDate(date)
    const allowance = allowances.find(i => i.date === dateStr)
    const schedule = annualSchedules.find(s => s.date === dateStr)
    
    // 今日かどうか判定
    const today = new Date()
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear()
    
    // 複数選択されているかどうか判定
    const isSelected = selectedDates.some(d => formatDate(d) === dateStr)

    // 背景色とボーダーの設定
    let bgClass = 'bg-gray-50' // 未入力の日（薄いグレー）
    let borderClass = 'border border-gray-200'
    
    if (allowance) {
      bgClass = 'bg-white' // 入力済みの日（白背景）
      borderClass = 'border-2 border-gray-300'
    } 
    
    if (isToday) {
      borderClass = 'border-2 border-blue-500' // 今日（青い枠線）
    }
    
    if (isSelected) {
      bgClass = 'bg-blue-100' // 選択中の日（青い背景）
      borderClass = 'border-3 border-blue-600' // 選択中（太い青い枠線）
    }

    return ( 
        <div 
            className={`flex flex-col items-start justify-start w-full h-full p-2 rounded-lg ${bgClass} ${borderClass} min-h-[60px] relative cursor-pointer hover:opacity-80 transition`}
            onClick={(e) => handleDateClick(date, e)}
        >
            {/* 選択中のチェックマーク */}
            {isSelected && (
                <div className="absolute top-1 left-1 bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center">
                    ✓
                </div>
            )}
            
            {/* 勤務区分（右上に小さく表示） */}
            {schedule && schedule.work_type && (
                <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-purple-100 border border-purple-300 rounded text-xs font-bold text-purple-700">
                    {schedule.work_type}
                </div>
            )}
            
            {/* 日付番号（今日は青い丸で強調） */}
            <div className={`text-xs font-bold mb-1 ${isToday ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-900'}`}>
                {date.getDate()}
            </div>
            
            {/* 手当金額（入力済みの場合のみ表示） */}
            {allowance && (
                <div className="w-full">
                    <div className="px-2 py-1 bg-blue-50 rounded-md border border-blue-200">
                        <span className="text-xs font-bold text-gray-900">¥{allowance.amount.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 truncate">{allowance.activity_type}</div>
                </div>
            )}
        </div> 
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
       {isAdmin && <div className="bg-slate-800 text-white text-center py-3 text-sm font-bold shadow-md"><a href="/admin" className="underline hover:text-blue-300 transition">事務担当者ページへ</a></div>}

      {/* 氏名未登録バナー */}
      {!userName && (
        <div className="bg-yellow-100 border-b-2 border-yellow-400 py-3 px-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-yellow-800 font-bold">⚠️ 氏名が未登録です</span>
              <span className="text-sm text-yellow-700">帳票出力のため、氏名を登録してください。</span>
            </div>
            <button 
              onClick={() => setShowProfileModal(true)} 
              className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              今すぐ登録
            </button>
          </div>
        </div>
      )}

      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-3 sm:py-4">
          {/* スマホ: 縦並び、PC: 横並び */}
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-3 lg:gap-0">
            {/* 左側: 月選択と支給予定額 */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-6">
              {/* 月選択 */}
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <button onClick={handlePrevMonth} className="text-slate-400 hover:text-slate-600 p-2 sm:p-2 text-xl sm:text-2xl font-bold transition touch-manipulation">‹</button>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">{selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月</h2>
                <button onClick={handleNextMonth} className="text-slate-400 hover:text-slate-600 p-2 sm:p-2 text-xl sm:text-2xl font-bold transition touch-manipulation">›</button>
              </div>
              
              {/* 支給予定額 */}
              <div className="flex flex-col items-start w-full sm:w-auto">
                <div className="text-xs sm:text-sm text-gray-600 font-medium">支給予定額</div>
                <div className="text-2xl sm:text-3xl font-extrabold text-blue-600">¥{monthTotal.toLocaleString()}</div>
                <div className="flex gap-2 sm:gap-3 mt-1 text-xs text-gray-600">
                  <span>🏕️ 合宿: {campDays}日</span>
                  <span>🚌 遠征: {expeditionDays}日</span>
                </div>
              </div>
            </div>
            
            {/* 右側: ボタン類 */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 w-full lg:w-auto">
              {/* 期限通知 - スマホでは非表示、タブレット以上で表示 */}
              <div className="hidden md:block bg-red-50 border-2 border-red-300 px-3 py-2 rounded-lg">
                <span className="text-red-700 font-bold text-xs lg:text-sm whitespace-nowrap">⚠️ 期限：翌月10日</span>
              </div>
              
              {/* 手当申請ステータス */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                  {allowanceStatus === 'approved' && <span className="bg-green-100 text-green-700 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold w-full sm:w-auto text-center">💰 承認済</span>}
                  {allowanceStatus === 'submitted' && <span className="bg-yellow-100 text-yellow-700 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-bold w-full sm:w-auto text-center">💰 申請中</span>}
                  {allowanceStatus === 'draft' && !isAllowLocked && <button onClick={handleSubmit} className="text-sm sm:text-base font-bold text-white bg-blue-600 px-5 sm:px-6 py-2.5 sm:py-3 rounded-full hover:bg-blue-700 active:bg-blue-800 shadow-md transition touch-manipulation w-full sm:w-auto">💰 手当申請</button>}
              </div>
              
              {/* 氏名・複数選択・ログアウト - スマホでは横並び */}
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <div className="flex gap-2">
                  <button 
                      onClick={() => {
                          // 既に氏名が登録されている場合は、現在の氏名を入力欄に分割して表示
                          if (userName) {
                              const nameParts = userName.split(' ')
                              setInputLastName(nameParts[0] || '')
                              setInputFirstName(nameParts.slice(1).join(' ') || '')
                          } else {
                              setInputLastName('')
                              setInputFirstName('')
                          }
                          setShowProfileModal(true)
                      }} 
                      className="text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 px-3 sm:px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-200 active:bg-slate-300 transition touch-manipulation flex-1 sm:flex-none whitespace-nowrap"
                  >
                      {userName ? `👤 ${userName.length > 6 ? userName.substring(0, 6) + '...' : userName}` : '⚙️ 氏名登録'}
                  </button>
                  
                  <a href="/documents" className="text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-blue-500 to-blue-600 px-4 sm:px-5 py-2.5 rounded-lg border-2 border-blue-400 hover:from-blue-600 hover:to-blue-700 active:from-blue-700 active:to-blue-800 transition-all touch-manipulation whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-1.5">
                    <span className="text-base">📄</span>
                    <span>規約閲覧</span>
                  </a>
                  
                  <a href="/contact" className="text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-purple-500 to-purple-600 px-4 sm:px-5 py-2.5 rounded-lg border-2 border-purple-400 hover:from-purple-600 hover:to-purple-700 active:from-purple-700 active:to-purple-800 transition-all touch-manipulation whitespace-nowrap shadow-md hover:shadow-lg transform hover:scale-105 flex items-center gap-1.5">
                    <span className="text-base">📧</span>
                    <span>お問い合わせ</span>
                  </a>
                  
                  <button onClick={handleLogout} className="text-xs sm:text-sm font-bold text-slate-600 bg-slate-100 px-3 sm:px-4 py-2 rounded-full border border-slate-200 hover:bg-slate-200 active:bg-slate-300 transition touch-manipulation">ログアウト</button>
                </div>
                
                {/* 複数選択モードボタン（大きく表示） */}
                <button
                  onClick={() => setIsMultiSelectMode(!isMultiSelectMode)}
                  className={`text-sm font-bold px-4 py-2 rounded-full border-2 transition touch-manipulation shadow-md ${
                    isMultiSelectMode 
                      ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700 shadow-blue-300' 
                      : 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 border-blue-300 hover:from-blue-100 hover:to-blue-200'
                  }`}
                >
                  {isMultiSelectMode ? '✅ 選択モード中（タップで選択/解除）' : '📅 複数日まとめて入力'}
                </button>
              </div>
              
              {/* 複数選択モード中の案内バー */}
              {(isMultiSelectMode || selectedDates.length > 0) && (
                <div className="mt-3 bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-400 rounded-xl p-4 shadow-lg">
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                        <span className="text-2xl">📅</span>
                        <div>
                          <span className="text-blue-900 font-extrabold text-lg block">
                            {selectedDates.length > 0 
                              ? `${selectedDates.length}日選択中` 
                              : 'カレンダーから日付を選択'}
                          </span>
                          <span className="text-blue-700 text-xs">
                            {selectedDates.length > 0 
                              ? '内容を入力してまとめて保存できます' 
                              : 'タップするたびに選択/解除できます'}
                          </span>
              </div>
                      </div>
                      <button
                        onClick={handleMultiSelectCancel}
                        className="bg-slate-400 hover:bg-slate-500 text-white font-bold py-2 px-3 rounded-lg transition text-sm touch-manipulation"
                      >
                        ✕
              </button>
            </div>
                    
                    {/* 選択された日付のリスト */}
                    {selectedDates.length > 0 && (
                      <div className="bg-white rounded-lg p-3 border border-blue-200">
                        <div className="text-xs text-blue-700 font-bold mb-2">選択した日付:</div>
                        <div className="flex flex-wrap gap-1">
                          {selectedDates.map((date, index) => (
                            <span key={index} className="text-xs px-2 py-1 rounded-full font-bold bg-blue-600 text-white">
                              {date.getMonth() + 1}/{date.getDate()}
                            </span>
                          ))}
          </div>
                      </div>
                    )}
                    
                    {selectedDates.length > 0 && (
                      <button
                        onClick={handleMultiSelectComplete}
                        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition shadow-lg text-base touch-manipulation"
                      >
                        ✏️ 選択した{selectedDates.length}日分の内容を入力する
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* メインカレンダー表示 */}
      <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-4 sm:py-8">
        <div className="bg-white rounded-xl sm:rounded-2xl shadow-lg p-3 sm:p-6">
          <Calendar 
            value={selectedDate} 
            activeStartDate={selectedDate} 
            onActiveStartDateChange={({ activeStartDate, view }) => {
              // 月表示が変更された場合のみ処理（日付クリック時には影響しない）
              if (activeStartDate && view === 'month') {
                const currentMonth = selectedDate.getMonth()
                const currentYear = selectedDate.getFullYear()
                const newMonth = activeStartDate.getMonth()
                const newYear = activeStartDate.getFullYear()
                
                // 月が実際に変更された場合のみ処理
                if (currentMonth !== newMonth || currentYear !== newYear) {
                  const currentDay = selectedDate.getDate()
                  const newDate = new Date(activeStartDate)
                  // 新しい月に同じ日付が存在する場合は保持、存在しない場合は1日に設定
                  const maxDay = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0).getDate()
                  newDate.setDate(Math.min(currentDay, maxDay))
                  setSelectedDate(newDate)
                }
              }
            }} 
            locale="ja-JP" 
            tileContent={getTileContent} 
            className="w-full border-none calendar-large" 
            tileDisabled={() => false} 
          />
        </div>
        
        {/* 月次サマリー */}
        <div className="mt-8 bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-bold text-gray-900 text-lg mb-4">{selectedDate.getMonth() + 1}月の手当履歴</h3>
          <div className="space-y-2">
            {allowances.filter(i => { const d = new Date(i.date); return d.getMonth() === selectedDate.getMonth() && d.getFullYear() === selectedDate.getFullYear() }).map((item) => (
              <div key={item.id} className="bg-slate-50 p-4 rounded-xl flex justify-between items-center border border-slate-100 hover:border-slate-300 transition">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-gray-900 text-lg">{item.date.split('-')[2]}日</span>
                  <span className="text-sm text-gray-900">{item.activity_type}</span>
                  {item.destination_detail && <span className="text-xs text-gray-700">({item.destination_detail})</span>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-bold text-gray-900 text-lg">¥{item.amount.toLocaleString()}</span>
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

      {/* 入力フォームモーダル - スマホ: 全画面、PC: センター表示 */}
      {showInputModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 sm:p-4" onClick={() => setShowInputModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl h-[95vh] sm:h-auto sm:max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* モーダルヘッダー */}
            <div className="sticky top-0 bg-white border-b border-slate-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-start rounded-t-2xl z-10">
              <div className="flex-1">
                {selectedDates.length > 0 ? (
                  <>
                    <h2 className="font-bold text-gray-900 text-base sm:text-lg mb-2">
                      📅 複数日一括入力（{selectedDates.length}日分）
                    </h2>
                    <div className="flex flex-wrap gap-1">
                      {selectedDates.slice(0, 10).map((date, index) => (
                        <span key={index} className="text-xs px-2 py-1 rounded font-bold bg-blue-100 text-blue-700">
                          {date.getMonth() + 1}/{date.getDate()}
                        </span>
                      ))}
                      {selectedDates.length > 10 && (
                        <span className="text-xs px-2 py-1 rounded font-bold bg-gray-100 text-gray-600">
                          他 {selectedDates.length - 10}日
                        </span>
                      )}
                           </div>
                  </>
                ) : (
                  <>
                    <h2 className="font-bold text-gray-900 text-base sm:text-lg">{selectedDate.getMonth() + 1}月{selectedDate.getDate()}日 ({['日', '月', '火', '水', '木', '金', '土'][selectedDate.getDay()]}) の手当入力</h2>
                    <div className="flex gap-2 mt-2">
                      {isAllowLocked && <span className="text-xs px-2 py-1 rounded font-bold bg-gray-100 text-gray-500">💰 編集不可</span>}
                      <span className={`text-xs px-2 py-1 rounded font-bold ${dayType.includes('休日') || dayType.includes('週休') ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                        {dayType}
                      </span>
                </div>
                  </>
              )}
              </div>
              <button onClick={() => { setShowInputModal(false); setSelectedDates([]); setIsMultiSelectMode(false); }} className="text-slate-400 hover:text-slate-600 active:text-slate-800 text-3xl sm:text-2xl font-bold ml-2 touch-manipulation">×</button>
            </div>

            {/* モーダルコンテンツ */}
            <div className="p-4 sm:p-6">
              <form onSubmit={handleSave} className={`flex flex-col gap-4 sm:gap-4 ${isAllowLocked ? 'opacity-60 pointer-events-none' : ''}`}>
            
            {/* 手当エリア */}
                <div>
                <div>
                <label className="block text-sm sm:text-base font-bold text-black mb-2">部活動 業務内容 {isAllowLocked && '(編集不可)'}</label>
                <select 
                    disabled={isAllowLocked} 
                    value={activityId} 
                    onChange={(e) => {
                        const newActivityId = e.target.value
                        // 休日判定: dayTypeに'休日'が含まれる場合は休日、それ以外は勤務日
                        const isWorkDay = !dayType.includes('休日') && (dayType.includes('勤務日') || dayType.includes('授業'))
                        const validation = canSelectActivity(newActivityId, isWorkDay)
                        if (!validation.allowed) {
                            alert(validation.message)
                            return
                        }
                        setActivityId(newActivityId)
                        setDestinationId('inside_short')
                    }} 
                    className="w-full bg-slate-50 p-3 sm:p-3 rounded-lg border-2 border-slate-300 font-bold text-black text-base appearance-none touch-manipulation"
                    style={{ fontSize: '16px' }}
                >
                    <option value="">なし (部活なし)</option>
                    {ACTIVITY_TYPES.map(type => {
                        // 休日判定: dayTypeに'休日'が含まれる場合は休日、それ以外は勤務日
                        const isWorkDay = !dayType.includes('休日') && (dayType.includes('勤務日') || dayType.includes('授業'))
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
                    // 休日判定: dayTypeに'休日'が含まれる場合は休日、それ以外は勤務日
                    const isWorkDay = !dayType.includes('休日') && (dayType.includes('勤務日') || dayType.includes('授業'))
                    const validation = canSelectActivity(activityId, isWorkDay)
                    if (!validation.allowed) {
                        return <div className="text-xs text-red-600 mt-1 font-bold">⚠️ {validation.message}</div>
                    }
                    return null
                })()}
                </div>
                {activityId && (
                <>
                    {/* 災害業務選択時 */}
                    {activityId === 'DISASTER' ? (
                        <div className="mt-2">
                            <label className="block text-xs font-bold text-orange-600 mb-1">災害業務の内容（必須）</label>
                            <input 
                                disabled={isAllowLocked} 
                                type="text" 
                                placeholder="例: 台風による緊急待機" 
                                value={destinationDetail} 
                                onChange={(e) => setDestinationDetail(e.target.value)} 
                                className="w-full bg-white p-3 rounded-lg border border-orange-200 text-xs text-black font-bold" 
                                required
                            />
                            <div className="text-xs text-orange-500 mt-1">※災害業務の内容を具体的に記入してください。</div>
                        </div>
                    ) : activityId === 'CUSTOM' ? (
                        /* 手入力その他選択時 */
                        <div className="mt-2 space-y-2">
                            <div>
                                <label className="block text-xs font-bold text-purple-600 mb-1">業務内容（必須）</label>
                                <input 
                                    disabled={isAllowLocked} 
                                    type="text" 
                                    placeholder="例: 特別講習会の引率" 
                                    value={customDescription} 
                                    onChange={(e) => setCustomDescription(e.target.value)} 
                                    className="w-full bg-white p-3 rounded-lg border border-purple-200 text-xs text-black font-bold" 
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-purple-600 mb-1">金額（必須）</label>
                                <input 
                                    disabled={isAllowLocked} 
                                    type="number" 
                                    min="0"
                                    step="100"
                                    placeholder="例: 3000" 
                                    value={customAmount || ''} 
                                    onChange={(e) => setCustomAmount(parseInt(e.target.value) || 0)} 
                                    className="w-full bg-white p-3 rounded-lg border border-purple-200 text-xs text-black font-bold" 
                                    required
                                />
                            </div>
                            <div className="text-xs text-purple-500">※手入力その他の場合、内容と金額を必ず入力してください。</div>
                        </div>
                    ) : (
                    <div className="space-y-2 mt-2">
                        {/* 行き先（区分）の選択 */}
                        <div className="grid grid-cols-2 gap-2">
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
                            
                            {/* 指定大会の場合は大会名を入力 */}
                            {activityId === 'C' && (
                            <div>
                                    <label className="block text-xs font-bold text-blue-700 mb-1">大会名 ✏️</label>
                                    <input 
                                        disabled={isAllowLocked} 
                                        type="text" 
                                        placeholder="例: 県高校総体" 
                                        value={competitionName} 
                                        onChange={(e) => setCompetitionName(e.target.value)} 
                                        className="w-full bg-blue-50 p-3 rounded-lg border-2 border-blue-300 text-xs text-black font-bold" 
                                    />
                                </div>
                            )}
                        </div>
                        
                        {/* 指定大会 + 運転あり + (県内120km以上 or 県外) の場合は目的地も入力 */}
                        {activityId === 'C' && isDriving && (destinationId === 'inside_long' || destinationId === 'outside') && (
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">目的地（運転先） 🚗</label>
                                <input 
                                    disabled={isAllowLocked} 
                                    type="text" 
                                    placeholder="例: 県体育館" 
                                    value={destinationDetail} 
                                    onChange={(e) => setDestinationDetail(e.target.value)} 
                                    className="w-full bg-green-50 p-3 rounded-lg border-2 border-green-300 text-xs text-black font-bold" 
                                />
                                <div className="text-xs text-green-600 mt-1">※県内120km以上または県外の運転先を入力してください</div>
                            </div>
                        )}
                        
                        {/* 指定大会以外 + 運転あり + (県内120km以上 or 県外) の場合は目的地入力を表示 */}
                        {activityId !== 'C' && isDriving && (destinationId === 'inside_long' || destinationId === 'outside') && (
                            <div>
                                <label className="block text-xs font-bold text-green-700 mb-1">目的地（運転先） 🚗</label>
                                <input 
                                    disabled={isAllowLocked} 
                                    type="text" 
                                    placeholder="例: 県体育館" 
                                    value={destinationDetail} 
                                    onChange={(e) => setDestinationDetail(e.target.value)} 
                                    className="w-full bg-green-50 p-3 rounded-lg border-2 border-green-300 text-xs text-black font-bold" 
                                />
                                <div className="text-xs text-green-600 mt-1">※県内120km以上または県外の運転先を入力してください</div>
                            </div>
                        )}
                    </div>
                    )}
                    
                    {/* 運転・宿泊フラグ */}
                    <div className="grid grid-cols-2 gap-3 mt-4">
                        {/* F（校内合宿）の場合は運転なし */}
                        {activityId !== 'F' && (
                            <label className={`p-4 rounded-xl cursor-pointer border-2 text-center text-sm font-bold transition-all shadow-sm hover:shadow-md ${isDriving ? 'border-blue-500 bg-gradient-to-br from-blue-50 to-blue-100 text-blue-700 shadow-blue-200' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`}>
                            <input 
                                disabled={isAllowLocked} 
                                type="checkbox" 
                                checked={isDriving} 
                                onChange={e => setIsDriving(e.target.checked)} 
                                className="hidden" 
                            />
                                <div className="text-2xl mb-1">🚗</div>
                                <div>運転あり</div>
                        </label>
                        )}
                        {activityId === 'F' && (
                            <div className="p-4 rounded-xl border-2 border-gray-300 bg-gradient-to-br from-gray-100 to-gray-200 text-center text-sm font-bold text-gray-600 shadow-sm">
                                <div className="text-2xl mb-1">🚗</div>
                                <div>校内合宿のため</div>
                                <div className="text-xs mt-1">運転なし</div>
                            </div>
                        )}
                        <label className={`p-4 rounded-xl cursor-pointer border-2 text-center text-sm font-bold transition-all shadow-sm hover:shadow-md ${isAccommodation ? 'border-purple-500 bg-gradient-to-br from-purple-50 to-purple-100 text-purple-700 shadow-purple-200' : 'border-slate-300 bg-white text-slate-500 hover:border-slate-400 hover:bg-slate-50'}`}>
                            <input 
                                disabled={isAllowLocked} 
                                type="checkbox" 
                                checked={isAccommodation} 
                                onChange={e => setIsAccommodation(e.target.checked)} 
                                className="hidden" 
                            />
                            <div className="text-2xl mb-1">🏨</div>
                            <div>宿泊あり</div>
                        </label>
                    </div>
                    
                    {/* 計算ロジック説明 */}
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border-2 border-blue-300 mt-4 shadow-sm">
                        <div className="text-xs sm:text-sm text-blue-800 mb-2">
                            <span className="font-extrabold flex items-center gap-1">
                                <span className="text-base">📋</span>
                                <span>計算内訳</span>
                            </span>
                        </div>
                        <div className="text-xs sm:text-sm text-slate-700 font-bold bg-white p-3 rounded-lg border border-blue-200">
                            {(() => {
                                // 休日判定: dayTypeに'休日'が含まれる場合は休日、それ以外は勤務日
                                const isWorkDay = !dayType.includes('休日') && (dayType.includes('勤務日') || dayType.includes('授業'))
                                
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
                    
                    <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 rounded-xl flex justify-between items-center mt-4 shadow-lg border-2 border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="text-2xl">💰</span>
                            <span className="text-sm sm:text-base font-bold">支給予定額</span>
                        </div>
                        <span className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-yellow-200 to-yellow-300 bg-clip-text text-transparent">
                            ¥{calculatedAmount.toLocaleString()}
                        </span>
                    </div>
                </>
                )}
            </div>

            {!isAllowLocked && (
                <button 
                    type="submit" 
                    className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-4 sm:py-5 rounded-xl hover:from-blue-700 hover:to-blue-800 active:from-blue-800 active:to-blue-900 shadow-xl hover:shadow-2xl text-base sm:text-lg touch-manipulation transition-all transform hover:scale-[1.02] active:scale-[0.98]"
                >
                    <span className="flex items-center justify-center gap-2">
                        <span className="text-xl">💾</span>
                        <span>この内容で保存する</span>
                    </span>
                </button>
            )}
          </form>
            </div>
          </div>
        </div>
      )}

      {/* 氏名登録モーダル（中央に大きく表示） */}
      {showProfileModal && (
          <div 
              className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={() => {
                  // 既に氏名が登録されている場合は閉じられる
                  if (userName) {
                      setShowProfileModal(false)
                  }
              }}
          >
              <div 
                  className="bg-white p-8 rounded-3xl shadow-2xl w-full max-w-md border-4 border-blue-500 relative"
                  onClick={(e) => e.stopPropagation()}
              >
                  {/* ×ボタン（既に氏名が登録されている場合のみ表示） */}
                  {userName && (
                      <button
                          onClick={() => setShowProfileModal(false)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 active:text-slate-800 text-3xl font-bold transition touch-manipulation"
                      >
                          ×
                      </button>
                  )}
                  
                  <div className="text-center mb-4">
                      <div className="text-5xl mb-2">👤</div>
                      <h3 className="text-2xl font-extrabold text-gray-900">
                          {userName ? '氏名を変更' : '氏名登録が必要です'}
                      </h3>
                      </div>
                  <p className="text-sm text-slate-600 mb-6 text-center">
                      {userName ? (
                          <>
                              帳票出力に使用する氏名を変更できます。<br/>
                              姓と名の間に半角スペースが自動で入ります。
                          </>
                      ) : (
                          <>
                              帳票出力に使用する氏名を登録してください。<br/>
                              姓と名の間に半角スペースが自動で入ります。
                          </>
                      )}
                  </p>
                  
                  {/* 現在の氏名表示（変更時のみ） */}
                  {userName && (
                      <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xs text-blue-700 font-bold mb-1">現在の氏名</p>
                          <p className="text-sm text-blue-900 font-bold">{userName}</p>
                      </div>
                  )}
                  
                  <div className="space-y-4 mb-6">
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">姓（Last Name）</label>
                          <input 
                              type="text" 
                              value={inputLastName} 
                              onChange={(e) => setInputLastName(e.target.value)} 
                              placeholder="例: 三田村" 
                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg font-bold text-black focus:border-blue-500 focus:outline-none" 
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">名（First Name）</label>
                          <input 
                              type="text" 
                              value={inputFirstName} 
                              onChange={(e) => setInputFirstName(e.target.value)} 
                              placeholder="例: 和真" 
                              className="w-full px-4 py-3 border-2 border-slate-300 rounded-lg font-bold text-black focus:border-blue-500 focus:outline-none" 
                          />
                      </div>
                  </div>
                  
                  <div className="flex gap-3">
                      {/* キャンセルボタン（既に氏名が登録されている場合のみ表示） */}
                      {userName && (
                          <button 
                              onClick={() => {
                                  setShowProfileModal(false)
                                  setInputLastName('')
                                  setInputFirstName('')
                              }}
                              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-4 rounded-xl transition shadow-lg text-lg"
                          >
                              キャンセル
                          </button>
                      )}
                      
                      <button 
                          onClick={handleSaveProfile} 
                          className={`${userName ? 'flex-1' : 'w-full'} bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold py-4 rounded-xl transition shadow-xl text-lg`}
                      >
                          💾 {userName ? '氏名を変更する' : '氏名を登録する'}
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  )
}

// Update trigger: 2026-01-19 23:45:00 JST - Force rebuild for Vercel deployment
// This ensures the page is properly recognized and deployed
