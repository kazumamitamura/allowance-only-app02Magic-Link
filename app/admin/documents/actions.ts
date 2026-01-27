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
    // ファイル名をサニタイズ（Storageキー用に英数字のみに変換）
    const sanitizeFileName = (name: string): string => {
      // 拡張子を取得
      const lastDot = name.lastIndexOf('.')
      const extension = lastDot > 0 ? name.substring(lastDot).toLowerCase() : ''
      const baseName = lastDot > 0 ? name.substring(0, lastDot) : name
      
      // ファイル名を完全に英数字とアンダースコア、ハイフンのみに変換
      // 日本語や特殊文字はすべて削除し、英数字のみを使用
      let sanitized = baseName
        .replace(/[^a-zA-Z0-9\-_]/g, '') // 英数字、ハイフン、アンダースコア以外を削除
        .replace(/\s+/g, '_') // スペースをアンダースコアに置換
        .replace(/_{2,}/g, '_') // 連続するアンダースコアを1つに
        .replace(/^_+|_+$/g, '') // 先頭と末尾のアンダースコアを削除
        .substring(0, 100) // 長すぎるファイル名を切り詰め
      
      // ファイル名が空になった場合はデフォルト名を使用
      if (!sanitized) {
        sanitized = 'document'
      }
      
      return sanitized + extension
    }
    
    // UUID風のランダム文字列を生成（より安全なファイル名）
    const generateRandomString = (length: number = 8): string => {
      const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
      let result = ''
      for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length))
      }
      return result
    }
    
    // ファイル名を生成（タイムスタンプ + ランダム文字列 + サニタイズされた拡張子）
    const timestamp = Date.now()
    const randomStr = generateRandomString(8)
    const lastDot = data.file.name.lastIndexOf('.')
    const extension = lastDot > 0 ? data.file.name.substring(lastDot).toLowerCase() : '.pdf'
    // 拡張子もサニタイズ（英数字とドットのみ）
    const sanitizedExt = extension.replace(/[^a-zA-Z0-9.]/g, '')
    const fileName = `${timestamp}_${randomStr}${sanitizedExt}`
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
      console.error('Storageアップロードエラー（詳細）:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError
      })
      
      // バケットが存在しない場合の詳細なエラーメッセージ
      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('not found')) {
        return { error: 'ファイルのアップロードに失敗しました: Bucket not found\n\nSupabase Dashboard で Storage バケット「documents」を作成してください。\n詳細は SETUP_INQUIRIES_AND_DOCUMENTS.md を参照してください。' }
      }
      
      // Invalid key エラーの場合
      if (uploadError.message.includes('Invalid key') || uploadError.message.includes('invalid')) {
        return { error: 'ファイルのアップロードに失敗しました: ファイル名に無効な文字が含まれています。\n\nファイル名を変更して再度お試しください。\n\nエラー詳細: ' + uploadError.message }
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
      console.error('データベース保存エラー（詳細）:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        fullError: insertError
      })
      
      // Storageからファイルを削除（ロールバック）
      try {
        await supabase.storage.from('documents').remove([filePath])
      } catch (removeError) {
        console.error('Storage削除エラー（ロールバック）:', removeError)
      }
      
      // テーブルが存在しない場合のエラーメッセージ（複数のパターンをチェック）
      const errorMessage = insertError.message || ''
      const errorCode = insertError.code || ''
      const errorDetails = insertError.details || ''
      const errorHint = insertError.hint || ''
      
      // スキーマキャッシュのエラー（PGRST205）の特別処理
      const isSchemaCacheError = (
        errorCode === 'PGRST205' ||
        (errorMessage.includes('schema cache') && errorMessage.includes('Could not find'))
      )
      
      // テーブルが存在しない場合
      const isTableNotFound = (
        errorMessage.includes('does not exist') || 
        errorMessage.includes('schema cache') || 
        errorMessage.includes('relation') ||
        errorMessage.includes('table') ||
        errorMessage.includes('documents') ||
        errorCode === '42P01' ||
        errorCode === 'PGRST116' ||
        errorDetails.includes('documents') ||
        errorHint.includes('documents')
      )
      
      if (isSchemaCacheError) {
        return { 
          error: 'データの保存に失敗しました: スキーマキャッシュが更新されていません。\n\n【解決方法】\n1. Supabase Dashboard → Settings → API を開く\n2. "Reload schema cache" または "Refresh schema" ボタンをクリック\n3. 数秒待ってから再度お試しください\n\nまたは、以下のSQLを実行してください：\nSELECT COUNT(*) FROM documents;\n\nエラー詳細:\nメッセージ: ' + errorMessage + '\nコード: ' + errorCode 
        }
      }
      
      if (isTableNotFound) {
        return { 
          error: 'データの保存に失敗しました: 資料テーブルが作成されていません。\n\n【解決方法】\n1. Supabase Dashboard の SQL Editor を開く\n2. SETUP_INQUIRIES_AND_DOCUMENTS.sql の内容をコピー\n3. SQL Editor に貼り付けて実行\n\nエラー詳細:\nメッセージ: ' + errorMessage + '\nコード: ' + errorCode 
        }
      }
      
      return { 
        error: 'データの保存に失敗しました: ' + errorMessage + (errorCode ? ' (コード: ' + errorCode + ')' : '') + '\n\n詳細: ' + (errorDetails || 'なし') + (errorHint ? '\nヒント: ' + errorHint : '')
      }
    }

    return { success: true, documentId: document.id }
  } catch (err) {
    console.error('文書アップロード処理エラー:', err)
    return { error: '予期しないエラーが発生しました' }
  }
}
