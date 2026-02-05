/**
 * メール通知サービス
 *
 * - 問い合わせ送信者へ自動返信（受け付けました・しばらくお時間をいただきます）
 * - 管理者へ問い合わせ内容の通知メール
 *
 * 環境変数: RESEND_API_KEY, CONTACT_FROM_EMAIL（送信元）, CONTACT_EMAIL（管理者の受信先・省略時はコード内のADMIN_EMAILS）
 */

const ADMIN_EMAILS = ['mitamuraka@haguroko.ed.jp', 'tomonoem@haguroko.ed.jp']

/** 問い合わせ送信者向けの自動返信文（一般企業でよく使われる表現） */
const AUTO_REPLY_SUBJECT = '【手当管理システム】お問い合わせを受け付けました'

const AUTO_REPLY_BODY = `
お問い合わせいただき、ありがとうございます。
以下の内容でお問い合わせを受け付けました。

担当者より確認のうえ、通常2〜3営業日以内を目安にご連絡いたします。
今しばらくお時間をいただきますよう、お願い申し上げます。

────────────────────────────────
※このメールは自動送信されています。
※このメールに直接返信されても対応できかねます。
お手数ですが、再度お問い合わせフォームよりご連絡ください。
────────────────────────────────

手当管理システム
`.trim()

/**
 * 問い合わせを送ったユーザーに自動返信メールを送る
 */
export async function sendAutoReplyToUser(data: {
  userEmail: string
  userName: string
  subject: string
}): Promise<{ success: boolean; error?: string }> {
  if (!process.env.RESEND_API_KEY) {
    console.log('📧 [自動返信] RESEND_API_KEY 未設定のためスキップ:', data.userEmail)
    return { success: true }
  }

  const from = process.env.CONTACT_FROM_EMAIL || '手当管理システム <onboarding@resend.dev>'

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from,
      to: data.userEmail,
      subject: AUTO_REPLY_SUBJECT,
      text: `${AUTO_REPLY_BODY}\n\n--- お問い合わせ件名 ---\n${data.subject}\n`,
    })

    if (error) {
      console.error('自動返信メール送信エラー:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    console.error('自動返信メール送信例外:', err)
    return { success: false, error: String(err) }
  }
}

/**
 * 管理者に問い合わせ内容をメールで通知する
 */
export async function sendInquiryNotification(data: {
  inquiryId: number
  subject: string
  message: string
  userEmail: string
  userName: string
}): Promise<{ success: boolean; error?: string }> {
  const to = process.env.CONTACT_EMAIL ? [process.env.CONTACT_EMAIL] : ADMIN_EMAILS

  if (!process.env.RESEND_API_KEY) {
    console.log('📧 [管理者通知] RESEND_API_KEY 未設定のためスキップ:', {
      to,
      subject: data.subject,
      inquiryId: data.inquiryId,
      from: `${data.userName} (${data.userEmail})`,
    })
    return { success: true }
  }

  const from = process.env.CONTACT_FROM_EMAIL || '手当管理システム <onboarding@resend.dev>'
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  try {
    const { Resend } = await import('resend')
    const resend = new Resend(process.env.RESEND_API_KEY)

    const { error } = await resend.emails.send({
      from,
      to,
      subject: `[手当管理システム] 新しいお問い合わせ: ${data.subject}`,
      html: `
        <h2>新しいお問い合わせが届きました</h2>
        <p><strong>問い合わせID:</strong> ${data.inquiryId}</p>
        <p><strong>送信者:</strong> ${data.userName} (${data.userEmail})</p>
        <p><strong>件名:</strong> ${data.subject}</p>
        <hr>
        <h3>メッセージ:</h3>
        <p style="white-space: pre-wrap;">${escapeHtml(data.message)}</p>
        <hr>
        <p><a href="${siteUrl}/admin/inquiries">問い合わせ管理画面で確認・返信</a></p>
        <p style="color: #666; font-size: 12px;">手当管理システム</p>
      `,
    })

    if (error) {
      console.error('管理者通知メール送信エラー:', error)
      return { success: false, error: error.message }
    }
    return { success: true }
  } catch (err) {
    console.error('管理者通知メール送信例外:', err)
    return { success: false, error: String(err) }
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
