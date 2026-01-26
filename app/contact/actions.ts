'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { sendInquiryNotification } from './email-service'

export async function submitInquiry(data: {
  subject: string
  message: string
  userEmail: string
  userName: string
}) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // ユーザー認証確認
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { error: 'ログインが必要です' }
  }

  try {
    // 問い合わせをデータベースに保存
    const { data: inquiry, error: insertError } = await supabase
      .from('inquiries')
      .insert({
        user_id: user.id,
        user_email: data.userEmail,
        user_name: data.userName,
        subject: data.subject,
        message: data.message,
        status: 'pending' // pending, replied, closed
      })
      .select()
      .single()

    if (insertError) {
      console.error('問い合わせ保存エラー（詳細）:', {
        message: insertError.message,
        code: insertError.code,
        details: insertError.details,
        hint: insertError.hint,
        fullError: insertError
      })
      
      // テーブルが存在しない場合のエラーメッセージ（複数のパターンをチェック）
      const errorMessage = insertError.message || ''
      const errorCode = insertError.code || ''
      const errorDetails = insertError.details || ''
      const errorHint = insertError.hint || ''
      
      // より包括的なエラーチェック
      const isTableNotFound = (
        errorMessage.includes('does not exist') || 
        errorMessage.includes('schema cache') || 
        errorMessage.includes('relation') ||
        errorMessage.includes('table') ||
        errorMessage.includes('inquiries') ||
        errorMessage.includes('Could not find') ||
        errorCode === '42P01' ||
        errorCode === 'PGRST116' ||
        errorDetails.includes('inquiries') ||
        errorHint.includes('inquiries')
      )
      
      // RLSポリシー関連のエラー
      const isRLSError = (
        errorMessage.includes('permission denied') ||
        errorMessage.includes('new row violates row-level security') ||
        errorMessage.includes('RLS') ||
        errorCode === '42501' ||
        errorCode === 'PGRST301'
      )
      
      if (isTableNotFound) {
        return { 
          error: '問い合わせの送信に失敗しました: 問い合わせテーブルが作成されていません。\n\n【解決方法】\n1. Supabase Dashboard の SQL Editor を開く\n2. SETUP_INQUIRIES_AND_DOCUMENTS.sql の内容をコピー\n3. SQL Editor に貼り付けて実行\n\nエラー詳細:\nメッセージ: ' + errorMessage + '\nコード: ' + errorCode 
        }
      }
      
      if (isRLSError) {
        return { 
          error: '問い合わせの送信に失敗しました: アクセス権限の問題が発生しています。\n\n【解決方法】\n1. Supabase Dashboard の SQL Editor を開く\n2. CHECK_RLS_POLICIES.sql を実行してRLSポリシーを確認\n3. SETUP_INQUIRIES_AND_DOCUMENTS.sql を再実行してポリシーを再作成\n\nエラー詳細:\nメッセージ: ' + errorMessage + '\nコード: ' + errorCode 
        }
      }
      
      return { 
        error: '問い合わせの送信に失敗しました: ' + errorMessage + (errorCode ? ' (コード: ' + errorCode + ')' : '') + '\n\n詳細: ' + (errorDetails || 'なし') + (errorHint ? '\nヒント: ' + errorHint : '')
      }
    }

    // 管理者にメール通知を送信
    try {
      await sendInquiryNotification({
        inquiryId: inquiry.id,
        subject: data.subject,
        message: data.message,
        userEmail: data.userEmail,
        userName: data.userName
      })
    } catch (emailError) {
      console.error('メール送信エラー:', emailError)
      // メール送信に失敗しても問い合わせは保存されているので続行
    }

    return { success: true, inquiryId: inquiry.id }
  } catch (err) {
    console.error('問い合わせ処理エラー:', err)
    return { error: '予期しないエラーが発生しました' }
  }
}

