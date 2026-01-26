'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Document = {
  id: number
  title: string
  file_path: string
  file_name: string
  file_size: number
  uploaded_by: string
  created_at: string
}

export default function DocumentsPage() {
  const router = useRouter()
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState<number | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }
      fetchDocuments()
    }
    checkAuth()
  }, [])

  const fetchDocuments = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('文書取得エラー:', error)
        alert('文書の取得に失敗しました')
      } else {
        setDocuments(data || [])
      }
    } catch (err) {
      console.error('文書取得中の予期しないエラー:', err)
    }
    setLoading(false)
  }

  const downloadDocument = async (document: Document) => {
    setDownloading(document.id)
    try {
      // Supabase Storageからファイルをダウンロード
      const { data, error } = await supabase.storage
        .from('documents')
        .download(document.file_path)

      if (error) {
        throw error
      }

      // Blobをダウンロード可能な形式に変換
      const url = window.URL.createObjectURL(data)
      const a = document.createElement('a')
      a.href = url
      a.download = document.file_name
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('ダウンロードエラー:', err)
      alert('ファイルのダウンロードに失敗しました')
    }
    setDownloading(null)
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">📄 規約・資料</h1>
            <Link 
              href="/"
              className="text-blue-600 hover:text-blue-700 font-bold text-sm"
            >
              ← メイン画面に戻る
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">特殊勤務手当に関する規約・資料</h2>
            <p className="text-sm text-gray-600">
              特殊勤務手当の支給額や内容に関する規約・資料を閲覧・ダウンロードできます。
            </p>
          </div>

          {loading ? (
            <div className="text-center py-10">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className="mt-2 text-gray-600">読み込み中...</p>
            </div>
          ) : documents.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-gray-600">現在、公開されている資料はありません</p>
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="bg-gray-50 p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-900 mb-1">{doc.title}</h3>
                      <div className="flex items-center gap-4 text-xs text-gray-600 mt-2">
                        <span>📄 {doc.file_name}</span>
                        <span>📊 {formatFileSize(doc.file_size)}</span>
                        <span>📅 {formatDate(doc.created_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadDocument(doc)}
                      disabled={downloading === doc.id}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition flex items-center gap-2"
                    >
                      {downloading === doc.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          <span>ダウンロード中...</span>
                        </>
                      ) : (
                        <>
                          <span>⬇️</span>
                          <span>ダウンロード</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
