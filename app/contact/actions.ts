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
      console.error('問い合わせ保存エラー:', insertError)
      return { error: '問い合わせの送信に失敗しました: ' + insertError.message }
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

