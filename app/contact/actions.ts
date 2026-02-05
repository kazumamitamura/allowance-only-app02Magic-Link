'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { sendAutoReplyToUser, sendInquiryNotification } from './email-service'

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
    // デバッグ: Supabase URL と環境変数を確認
    console.log('=== 問い合わせ送信デバッグ情報 ===')
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('Supabase ANON_KEY (先頭20文字):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
    console.log('User ID:', user.id)
    console.log('User Email:', user.email)
    
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
        fullError: insertError,
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
        errorObject: JSON.stringify(insertError, null, 2)
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
        errorCode === 'PGRST205' || // スキーマキャッシュのエラー
        errorDetails.includes('inquiries') ||
        errorHint.includes('inquiries')
      )
      
      // スキーマキャッシュのエラー（PGRST205）の特別処理
      const isSchemaCacheError = (
        errorCode === 'PGRST205' ||
        (errorMessage.includes('schema cache') && errorMessage.includes('Could not find'))
      )
      
      // RLSポリシー関連のエラー
      const isRLSError = (
        errorMessage.includes('permission denied') ||
        errorMessage.includes('new row violates row-level security') ||
        errorMessage.includes('RLS') ||
        errorCode === '42501' ||
        errorCode === 'PGRST301'
      )
      
      if (isSchemaCacheError) {
        return { 
          error: '問い合わせの送信に失敗しました: スキーマキャッシュが更新されていません。\n\n【解決方法】\n1. Supabase Dashboard → Settings → API を開く\n2. "Reload schema cache" または "Refresh schema" ボタンをクリック\n3. 数秒待ってから再度お試しください\n\nまたは、以下のSQLを実行してください：\nSELECT COUNT(*) FROM inquiries;\n\nエラー詳細:\nメッセージ: ' + errorMessage + '\nコード: ' + errorCode 
        }
      }
      
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

    // 送信者へ自動返信（受け付けました・しばらくお時間をいただきます）
    try {
      await sendAutoReplyToUser({
        userEmail: data.userEmail,
        userName: data.userName,
        subject: data.subject
      })
    } catch (emailError) {
      console.error('自動返信メール送信エラー:', emailError)
    }

    // 管理者に問い合わせ内容をメール通知
    try {
      await sendInquiryNotification({
        inquiryId: inquiry.id,
        subject: data.subject,
        message: data.message,
        userEmail: data.userEmail,
        userName: data.userName
      })
    } catch (emailError) {
      console.error('管理者通知メール送信エラー:', emailError)
    }

    return { success: true, inquiryId: inquiry.id }
  } catch (err) {
    console.error('問い合わせ処理エラー:', err)
    return { error: '予期しないエラーが発生しました' }
  }
}

