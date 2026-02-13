'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

const ALLOWED_DOMAIN = '@haguroko.ed.jp'

/** Redirect URL はハードコード（環境変数ミスによる古いURLリダイレクト事故を防止） */
const getSiteUrl = () => {
  if (process.env.NODE_ENV !== 'production') {
    return 'http://localhost:3000'
  }
  return 'https://allowance-only-app02-magic-link.vercel.app'
}

/** マジックリンク（OTP）でログインリンクを送信 */
export async function sendMagicLink(formData: FormData) {
  const email = (formData.get('email') as string)?.trim()

  if (!email) {
    return { error: 'メールアドレスを入力してください' }
  }

  if (!email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
    return { error: 'domain', message: '※学校のメールアドレス(@haguroko.ed.jp)のみ利用可能です' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  })

  if (error) {
    console.error('マジックリンク送信エラー:', error.message)
    return { error: 'send', message: `ログインリンクの送信に失敗しました: ${error.message}` }
  }

  redirect('/auth/verify')
}

/** @deprecated パスワードログインは廃止。マジックリンク認証を使用してください */
export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  console.log('ログイン試行:', email)

  // デバッグ: 環境変数を確認
  console.log('=== ログイン試行デバッグ情報 ===')
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
  console.log('Supabase ANON_KEY (先頭20文字):', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20) + '...')
  console.log('Email:', email)

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('ログインエラー（詳細）:', {
      message: error.message,
      status: error.status,
      code: error.code,
      fullError: error
    })
    
    // エラー内容に応じた詳細なメッセージ（メール確認は本システムでは使用しない）
    if (error.message.includes('Email not confirmed')) {
      return { error: 'ログインできません。このプロジェクトでメール確認が有効になっています。\n\n管理者は Supabase Dashboard → Authentication → Providers → Email で「Confirm email」をオフにし、既存ユーザーには DISABLE_EMAIL_CONFIRMATION.md のSQLを実行してください。' }
    }
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'メールアドレスまたはパスワードが正しくありません。' }
    }
    if (error.message.includes('Invalid API key') || error.message.includes('JWT')) {
      return { 
        error: 'ログインに失敗しました: API キーが無効です。\n\n【解決方法】\n1. Vercel Dashboard → Settings → Environment Variables を開く\n2. NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY が正しく設定されているか確認\n3. Supabase Dashboard → Settings → API で正しいキーをコピー\n4. Vercel を再デプロイ\n\nエラー詳細: ' + error.message
      }
    }
    
    return { error: `ログインに失敗しました: ${error.message}` }
  }

  console.log('ログイン成功:', data.user?.id)

  // セッションが確立されるまで少し待つ
  await new Promise(resolve => setTimeout(resolve, 500))

  redirect('/')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const lastName = formData.get('lastName') as string
  const firstName = formData.get('firstName') as string

  // バリデーション
  if (!email || !password) {
    return { error: 'メールアドレスとパスワードを入力してください' }
  }

  if (!email.includes('@')) {
    return { error: 'メールアドレスの形式が正しくありません' }
  }

  if (password.length < 6) {
    return { error: 'パスワードは6文字以上で入力してください' }
  }

  if (!lastName || !firstName || lastName.trim().length === 0 || firstName.trim().length === 0) {
    return { error: '姓と名の両方を入力してください' }
  }

  const fullName = `${lastName.trim()} ${firstName.trim()}`

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  console.log('新規登録試行:', email)

  // Supabase認証での新規登録
  // メタデータに app_name を設定（複数アプリで同一Supabaseプロジェクトを共有する際の識別タグ）
  // トリガー関数側で app_name を参照して処理を分岐可能
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        app_name: 'haguro-allowance', // アプリ識別タグ（特殊勤務手当管理アプリ）
        last_name: lastName.trim(),
        first_name: firstName.trim(),
        full_name: fullName,
      },
      emailRedirectTo: undefined, // メール確認リンクを無効化
    },
  })

  if (error) {
    console.error('サインアップエラー:', error.message, error.status)
    
    // 既に登録済みの場合は、自動的にログインを試みる（親切な処理）
    if (error.message.includes('already registered') || error.message.includes('User already registered')) {
      console.log('既存ユーザー検出、ログインを試行します...')
      
      // ログインを試みる
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!loginError && loginData.user) {
        console.log('自動ログイン成功:', loginData.user.id)
        
        // セッションが確立されるまで少し待つ
        await new Promise(resolve => setTimeout(resolve, 500))
        
        redirect('/')
      } else {
        console.error('自動ログイン失敗:', loginError?.message)
        return { error: 'このメールアドレスは既に登録されています。パスワードが正しくありません。' }
      }
    }
    
    // その他のエラー
    if (error.message.includes('Password')) {
      return { error: 'パスワードが要件を満たしていません。6文字以上で入力してください。' }
    }
    if (error.message.includes('Email')) {
      return { error: 'メールアドレスの形式が正しくありません。' }
    }
    // Database error saving new user → user_profiles 未作成 or トリガー不具合
    if (error.message.includes('Database error saving new user')) {
      return {
        error: '登録に失敗しました: Database error saving new user\n\n' +
          '【対処方法】\n' +
          'Supabase で user_profiles テーブルとトリガーの設定が必要です。\n' +
          'プロジェクトの「FIX_SIGNUP_USER_PROFILES.sql」を Supabase Dashboard → SQL Editor で実行してください。\n' +
          '詳細は「SIGNUP_ERROR_FIX.md」を参照してください。'
      }
    }
    
    return { error: `登録に失敗しました: ${error.message}` }
  }

  console.log('サインアップ成功:', data.user?.id, '確認ステータス:', data.user?.email_confirmed_at)

  if (data.user) {
    // セッションがない場合は先にログインしてからアカウント氏名を保存する
    if (!data.session) {
      console.log('セッションなし - 自動ログインを試みます')
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (loginError) {
        console.error('自動ログイン失敗:', loginError.message)
        if (loginError.message.includes('Email not confirmed')) {
          return { error: '登録は完了しましたが、ログインできません。Supabase で「Confirm email」をオフにしてください。詳細は DISABLE_EMAIL_CONFIRMATION.md を参照してください。' }
        }
        return { error: `登録は完了しましたが、ログインに失敗しました: ${loginError.message}` }
      }
      console.log('自動ログイン成功:', loginData.user?.id)
    }

    // トリガーで作成された行がDBに反映されるのを待ってから、新規登録時の氏名でアカウント（帳票用）氏名を確実に保存
    await new Promise(resolve => setTimeout(resolve, 400))
    try {
      console.log('アカウント氏名を登録:', data.user.id, fullName)
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert(
          {
            user_id: data.user.id,
            email: email,
            display_name: fullName,
          },
          { onConflict: 'user_id' }
        )
      if (profileError) {
        console.error('アカウント氏名の保存エラー（リトライ）:', profileError)
        await new Promise(resolve => setTimeout(resolve, 600))
        const { error: retryError } = await supabase
          .from('user_profiles')
          .upsert(
            { user_id: data.user.id, email: email, display_name: fullName },
            { onConflict: 'user_id' }
          )
        if (retryError) console.error('アカウント氏名の保存リトライも失敗:', retryError)
        else console.log('アカウント氏名を登録しました（リトライ成功）')
      } else {
        console.log('アカウント氏名を登録しました')
      }
    } catch (err) {
      console.error('プロフィール保存例外:', err)
    }
  }

  await new Promise(resolve => setTimeout(resolve, 500))

  // 登録成功、確実にリダイレクト
  console.log('リダイレクト to /')
  redirect('/')
}

export async function logout() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  redirect('/login')
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'メールアドレスを入力してください' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/reset-password`,
  })

  if (error) {
    return { error: 'パスワードリセットメールの送信に失敗しました' }
  }

  return { success: true }
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (!password || !confirmPassword) {
    return { error: 'パスワードを入力してください' }
  }

  if (password !== confirmPassword) {
    return { error: 'パスワードが一致しません' }
  }

  if (password.length < 6) {
    return { error: 'パスワードは6文字以上で入力してください' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: 'パスワードの更新に失敗しました' }
  }

  redirect('/')
}
