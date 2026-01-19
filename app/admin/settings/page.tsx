'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { logout } from '@/app/auth/actions'

const ADMIN_EMAILS = ['mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp'].map(e => e.toLowerCase())

type AllowanceType = {
  id: number
  code: string
  display_name: string
  base_amount: number
  requires_holiday: boolean
  created_at: string
  updated_at: string
}

export default function AllowanceSettingsPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [loading, setLoading] = useState(false)
  const [allowanceTypes, setAllowanceTypes] = useState<AllowanceType[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({ display_name: '', base_amount: 0 })

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (!ADMIN_EMAILS.includes(user.email?.toLowerCase() || '')) {
        alert('管理者権限がありません')
        router.push('/')
        return
      }
      fetchAllowanceTypes()
    }
    checkAuth()
  }, [])

  const fetchAllowanceTypes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('allowance_types')
      .select('*')
      .order('code')
    
    if (error) {
      console.error('手当設定取得エラー:', error)
      alert('手当設定の取得に失敗しました')
    } else {
      setAllowanceTypes(data || [])
    }
    setLoading(false)
  }

  const startEdit = (type: AllowanceType) => {
    setEditingId(type.id)
    setEditForm({ display_name: type.display_name, base_amount: type.base_amount })
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditForm({ display_name: '', base_amount: 0 })
  }

  const saveEdit = async (id: number) => {
    if (!editForm.display_name || editForm.base_amount < 0) {
      alert('表示名と金額を正しく入力してください')
      return
    }

    setLoading(true)
    const { error } = await supabase
      .from('allowance_types')
      .update({
        display_name: editForm.display_name,
        base_amount: editForm.base_amount,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (error) {
      console.error('更新エラー:', error)
      alert('更新に失敗しました')
    } else {
      alert('✅ 更新しました')
      fetchAllowanceTypes()
      cancelEdit()
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 p-4">
      <div className="max-w-6xl mx-auto">
        {/* ヘッダー */}
        <header className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-blue-800">⚙️ 手当設定管理</h1>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-bold">
              ← 管理画面に戻る
            </Link>
            <button onClick={handleLogout} className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition font-bold">
              ログアウト
            </button>
          </div>
        </header>

        {/* 説明 */}
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>⚠️ 注意:</strong> ここで設定した金額は、ユーザーの手当入力時に自動計算に使用されます。<br />
            変更後、既存の入力データには影響しませんが、新規入力時から反映されます。
          </p>
        </div>

        {/* 設定一覧テーブル */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-6 py-4 font-bold">コード</th>
                  <th className="px-6 py-4 font-bold">表示名</th>
                  <th className="px-6 py-4 font-bold text-right">基本金額 (円)</th>
                  <th className="px-6 py-4 font-bold text-center">休日限定</th>
                  <th className="px-6 py-4 font-bold text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      読み込み中...
                    </td>
                  </tr>
                )}
                {!loading && allowanceTypes.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                      手当設定がありません
                    </td>
                  </tr>
                )}
                {!loading && allowanceTypes.map((type) => (
                  <tr key={type.id} className="border-b border-gray-200 hover:bg-gray-50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-blue-700">{type.code}</td>
                    <td className="px-6 py-4">
                      {editingId === type.id ? (
                        <input
                          type="text"
                          value={editForm.display_name}
                          onChange={(e) => setEditForm({ ...editForm, display_name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900"
                        />
                      ) : (
                        <span className="text-gray-900">{type.display_name}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {editingId === type.id ? (
                        <input
                          type="number"
                          min="0"
                          step="100"
                          value={editForm.base_amount}
                          onChange={(e) => setEditForm({ ...editForm, base_amount: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 text-gray-900 text-right"
                        />
                      ) : (
                        <span className="text-gray-900 font-bold">¥{type.base_amount.toLocaleString()}</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {type.requires_holiday ? (
                        <span className="inline-block px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-bold">
                          休日のみ
                        </span>
                      ) : (
                        <span className="inline-block px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-xs font-bold">
                          随時可
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {editingId === type.id ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => saveEdit(type.id)}
                            disabled={loading}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition font-bold disabled:opacity-50"
                          >
                            保存
                          </button>
                          <button
                            onClick={cancelEdit}
                            disabled={loading}
                            className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition font-bold disabled:opacity-50"
                          >
                            キャンセル
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(type)}
                          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition font-bold"
                        >
                          編集
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* フッター情報 */}
        <div className="mt-6 text-center text-sm text-gray-600">
          最終更新: {new Date().toLocaleString('ja-JP')}
        </div>
      </div>
    </div>
  )
}
