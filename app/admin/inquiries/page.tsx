'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import { isAdmin as checkIsAdmin } from '@/utils/adminRoles'
import Link from 'next/link'

type Inquiry = {
  id: number
  user_id: string
  user_email: string
  user_name: string
  subject: string
  message: string
  status: 'pending' | 'replied' | 'closed'
  created_at: string
  updated_at: string
}

export default function InquiriesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [isAuthorized, setIsAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [selectedInquiry, setSelectedInquiry] = useState<Inquiry | null>(null)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'replied' | 'closed'>('all')

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
      fetchInquiries()
    }
    checkAuth()
  }, [])

  const fetchInquiries = async () => {
    setLoading(true)
    try {
      let query = supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false })

      if (filterStatus !== 'all') {
        query = query.eq('status', filterStatus)
      }

      const { data, error } = await query

      if (error) {
        console.error('問い合わせ取得エラー:', error)
        alert('問い合わせの取得に失敗しました')
      } else {
        setInquiries(data || [])
      }
    } catch (err) {
      console.error('問い合わせ取得中の予期しないエラー:', err)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (isAuthorized) {
      fetchInquiries()
    }
  }, [filterStatus, isAuthorized])

  const updateStatus = async (id: number, status: 'pending' | 'replied' | 'closed') => {
    const { error } = await supabase
      .from('inquiries')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) {
      alert('ステータスの更新に失敗しました: ' + error.message)
    } else {
      fetchInquiries()
      if (selectedInquiry?.id === id) {
        setSelectedInquiry({ ...selectedInquiry, status })
      }
    }
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-700 border-yellow-300',
      replied: 'bg-blue-100 text-blue-700 border-blue-300',
      closed: 'bg-gray-100 text-gray-700 border-gray-300'
    }
    const labels = {
      pending: '未対応',
      replied: '対応済み',
      closed: '完了'
    }
    return (
      <span className={`px-3 py-1 rounded-full text-xs font-bold border ${styles[status as keyof typeof styles]}`}>
        {labels[status as keyof typeof labels]}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isAuthorized) return <div className="p-10 text-center">確認中...</div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* ヘッダー */}
      <div className="bg-slate-800 text-white p-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-1">📧 お問い合わせ管理</h1>
            <p className="text-slate-300 text-sm">ユーザーからの問い合わせを確認・管理</p>
          </div>
          <div className="flex gap-3">
            <Link href="/admin" className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg font-bold text-sm transition">
              管理者ダッシュボード
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-8">
        {/* フィルター */}
        <div className="bg-white p-4 rounded-xl shadow-md mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterStatus('all')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                filterStatus === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              すべて ({inquiries.length})
            </button>
            <button
              onClick={() => setFilterStatus('pending')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                filterStatus === 'pending'
                  ? 'bg-yellow-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              未対応 ({inquiries.filter(i => i.status === 'pending').length})
            </button>
            <button
              onClick={() => setFilterStatus('replied')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                filterStatus === 'replied'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              対応済み ({inquiries.filter(i => i.status === 'replied').length})
            </button>
            <button
              onClick={() => setFilterStatus('closed')}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition ${
                filterStatus === 'closed'
                  ? 'bg-gray-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              完了 ({inquiries.filter(i => i.status === 'closed').length})
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">読み込み中...</p>
          </div>
        ) : inquiries.length === 0 ? (
          <div className="bg-white p-10 rounded-xl shadow-md text-center">
            <p className="text-gray-600">問い合わせがありません</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 問い合わせ一覧 */}
            <div className="space-y-4">
              {inquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  onClick={() => setSelectedInquiry(inquiry)}
                  className={`bg-white p-4 rounded-xl shadow-md cursor-pointer transition hover:shadow-lg border-2 ${
                    selectedInquiry?.id === inquiry.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-transparent'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="font-bold text-gray-900 text-sm">{inquiry.subject}</h3>
                    {getStatusBadge(inquiry.status)}
                  </div>
                  <p className="text-xs text-gray-600 mb-2 line-clamp-2">{inquiry.message}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{inquiry.user_name} ({inquiry.user_email})</span>
                    <span>{formatDate(inquiry.created_at)}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* 問い合わせ詳細 */}
            {selectedInquiry ? (
              <div className="bg-white p-6 rounded-xl shadow-md sticky top-6">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">{selectedInquiry.subject}</h2>
                  {getStatusBadge(selectedInquiry.status)}
                </div>

                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">送信者</p>
                  <p className="font-bold text-gray-900">{selectedInquiry.user_name}</p>
                  <p className="text-sm text-gray-600">{selectedInquiry.user_email}</p>
                </div>

                <div className="mb-4 pb-4 border-b border-gray-200">
                  <p className="text-sm text-gray-600 mb-1">送信日時</p>
                  <p className="font-bold text-gray-900">{formatDate(selectedInquiry.created_at)}</p>
                </div>

                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-2">メッセージ</p>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">{selectedInquiry.message}</p>
                  </div>
                </div>

                {/* ステータス変更 */}
                <div className="space-y-2">
                  <p className="text-sm font-bold text-gray-900 mb-2">ステータスを変更</p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => updateStatus(selectedInquiry.id, 'pending')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                        selectedInquiry.status === 'pending'
                          ? 'bg-yellow-600 text-white'
                          : 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                      }`}
                    >
                      未対応
                    </button>
                    <button
                      onClick={() => updateStatus(selectedInquiry.id, 'replied')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                        selectedInquiry.status === 'replied'
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                      }`}
                    >
                      対応済み
                    </button>
                    <button
                      onClick={() => updateStatus(selectedInquiry.id, 'closed')}
                      className={`px-4 py-2 rounded-lg text-sm font-bold transition ${
                        selectedInquiry.status === 'closed'
                          ? 'bg-gray-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      完了
                    </button>
                  </div>
                </div>

                {/* メール返信リンク */}
                <div className="mt-6 pt-6 border-t border-gray-200">
                  <a
                    href={`mailto:${selectedInquiry.user_email}?subject=Re: ${selectedInquiry.subject}`}
                    className="block w-full text-center px-4 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
                  >
                    📧 メールで返信
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-white p-10 rounded-xl shadow-md text-center">
                <p className="text-gray-600">問い合わせを選択してください</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
