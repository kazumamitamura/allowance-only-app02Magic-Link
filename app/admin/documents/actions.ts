'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function uploadDocument(data: {
  title: string
  file: File
  userEmail: string
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // ファイル名を生成（タイムスタンプ + 元のファイル名）
    const timestamp = Date.now()
    const fileName = `${timestamp}_${data.file.name}`
    const filePath = fileName

    // Supabase Storageにアップロード
    const fileBuffer = await data.file.arrayBuffer()
    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileBuffer, {
        contentType: 'application/pdf',
        upsert: false
      })

    if (uploadError) {
      console.error('Storageアップロードエラー:', uploadError)
      return { error: 'ファイルのアップロードに失敗しました: ' + uploadError.message }
    }

    // データベースにレコードを保存
    const { data: document, error: insertError } = await supabase
      .from('documents')
      .insert({
        title: data.title,
        file_path: filePath,
        file_name: data.file.name,
        file_size: data.file.size,
        uploaded_by: data.userEmail
      })
      .select()
      .single()

    if (insertError) {
      console.error('データベース保存エラー:', insertError)
      // Storageからファイルを削除（ロールバック）
      await supabase.storage.from('documents').remove([filePath])
      return { error: 'データの保存に失敗しました: ' + insertError.message }
    }

    return { success: true, documentId: document.id }
  } catch (err) {
    console.error('文書アップロード処理エラー:', err)
    return { error: '予期しないエラーが発生しました' }
  }
}
