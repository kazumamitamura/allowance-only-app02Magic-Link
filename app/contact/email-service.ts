/**
 * メール通知サービス
 * 
 * このファイルは、問い合わせ受信時に管理者にメールを送信する機能を提供します。
 * 
 * 実装オプション:
 * 1. Resend (推奨): https://resend.com
 * 2. Supabase Edge Functions
 * 3. Nodemailer (SMTP)
 * 
 * 現在はコンソール出力のみ（開発用）
 */

const ADMIN_EMAILS = ['mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp']

export async function sendInquiryNotification(data: {
  inquiryId: number
  subject: string
  message: string
  userEmail: string
  userName: string
}) {
  // TODO: 実際のメール送信を実装
  
  // オプション1: Resend を使用する場合
  // 以下のコードを有効化し、package.json に "resend": "^3.0.0" を追加してください
  /*
  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY が設定されていません')
    return { error: 'メール送信の設定が完了していません' }
  }

  const { Resend } = await import('resend')
  const resend = new Resend(process.env.RESEND_API_KEY)

  try {
    const { data: emailData, error } = await resend.emails.send({
      from: '手当管理システム <noreply@yourdomain.com>',
      to: ADMIN_EMAILS,
      subject: `[手当管理システム] 新しいお問い合わせ: ${data.subject}`,
      html: `
        <h2>新しいお問い合わせが届きました</h2>
        <p><strong>問い合わせID:</strong> ${data.inquiryId}</p>
        <p><strong>送信者:</strong> ${data.userName} (${data.userEmail})</p>
        <p><strong>件名:</strong> ${data.subject}</p>
        <hr>
        <h3>メッセージ:</h3>
        <p style="white-space: pre-wrap;">${data.message}</p>
        <hr>
        <p><a href="${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/admin/inquiries">問い合わせ管理画面で確認</a></p>
        <p style="color: #666; font-size: 12px;">手当管理システム</p>
      `,
    })

    if (error) {
      console.error('Resend エラー:', error)
      return { error: 'メール送信に失敗しました' }
    }

    console.log('メール送信成功:', emailData)
    return { success: true }
  } catch (err) {
    console.error('メール送信例外:', err)
    return { error: '予期しないエラーが発生しました' }
  }
  */

  // 開発用: コンソールに出力
  console.log('📧 問い合わせ通知メール（開発モード）:', {
    to: ADMIN_EMAILS,
    subject: `[手当管理システム] 新しいお問い合わせ: ${data.subject}`,
    inquiryId: data.inquiryId,
    from: `${data.userName} (${data.userEmail})`,
    message: data.message
  })

  return { success: true }
}

/**
 * 環境変数の設定例 (.env.local)
 * 
 * # Resend を使用する場合
 * RESEND_API_KEY=re_xxxxxxxxxxxxx
 * 
 * # サイトURL（メール内のリンクに使用）
 * NEXT_PUBLIC_SITE_URL=https://your-domain.com
 */
