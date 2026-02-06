'use server'

import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'

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
    
    // エラー内容に応じた詳細なメッセージ
    if (error.message.includes('Email not confirmed')) {
      return { error: 'メールアドレスが確認されていません。確認メールをご確認ください。' }
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

  // ユーザー登録成功後、プロフィールを作成または更新
  if (data.user) {
    try {
      console.log('プロフィール作成:', data.user.id, email, fullName)
      
      // まずinsertを試みる（新規ユーザーの場合）
      const { error: insertError } = await supabase
        .from('user_profiles')
        .insert({
          user_id: data.user.id,
          email: email,
          display_name: fullName,
        })

      if (insertError) {
        // 重複エラーの場合はupdate
        if (insertError.code === '23505' || insertError.message.includes('duplicate')) {
          console.log('既存プロフィール検出、更新します')
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              email: email,
              display_name: fullName,
            })
            .eq('user_id', data.user.id)

          if (updateError) {
            console.error('プロフィール更新エラー:', updateError)
          } else {
            console.log('プロフィール更新成功')
          }
        } else {
          console.error('プロフィール作成エラー:', insertError)
        }
      } else {
        console.log('プロフィール作成成功')
      }
    } catch (err) {
      console.error('プロフィール作成例外:', err)
      // エラーでもログインは成功しているので続行
    }

    // メール確認が必要な場合、ログインを試みる
    if (!data.session) {
      console.log('セッションなし - 自動ログインを試みます')
      
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (loginError) {
        console.error('自動ログイン失敗:', loginError.message)
        
        if (loginError.message.includes('Email not confirmed')) {
          return { 
            error: '登録は完了しましたが、メールアドレスの確認が必要です。管理者にお問い合わせください。' 
          }
        }
        
        return { error: `登録は完了しましたが、ログインに失敗しました: ${loginError.message}` }
      }
      
      console.log('自動ログイン成功:', loginData.user?.id)
    }
  }

  // セッションが確立されるまで少し待つ
  await new Promise(resolve => setTimeout(resolve, 1000))

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
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
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
