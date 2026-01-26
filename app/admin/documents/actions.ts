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
      // バケットが存在しない場合の詳細なエラーメッセージ
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return { error: 'ファイルのアップロードに失敗しました: Bucket not found\n\nSupabase Dashboard で Storage バケット「documents」を作成してください。\n詳細は SETUP_INQUIRIES_AND_DOCUMENTS.md を参照してください。' }
      }
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
      try {
        await supabase.storage.from('documents').remove([filePath])
      } catch (removeError) {
        console.error('Storage削除エラー（ロールバック）:', removeError)
      }
      // テーブルが存在しない場合のエラーメッセージ（複数のパターンをチェック）
      const errorMessage = insertError.message || ''
      const errorCode = insertError.code || ''
      
      if (
        errorMessage.includes('does not exist') || 
        errorMessage.includes('schema cache') || 
        errorMessage.includes('relation') ||
        errorMessage.includes('table') ||
        errorCode === '42P01' ||
        errorCode === 'PGRST116'
      ) {
        return { error: 'データの保存に失敗しました: 資料テーブルが作成されていません。\n\nSETUP_INQUIRIES_AND_DOCUMENTS.sql を実行してください。\n\nエラー詳細: ' + errorMessage }
      }
      return { error: 'データの保存に失敗しました: ' + insertError.message }
    }

    return { success: true, documentId: document.id }
  } catch (err) {
    console.error('文書アップロード処理エラー:', err)
    return { error: '予期しないエラーが発生しました' }
  }
}
