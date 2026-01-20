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

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: 'ログインに失敗しました。メールアドレスまたはパスワードが正しくありません。' }
  }

  redirect('/')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string

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

  if (!fullName || fullName.trim().length === 0) {
    return { error: '氏名を入力してください' }
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // Supabase認証での新規登録
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName.trim(),
      },
    },
  })

  if (error) {
    console.error('サインアップエラー:', error)
    
    // 既に登録済みの場合は、自動的にログインを試みる（親切な処理）
    if (error.message.includes('already registered') || error.message.includes('User already registered')) {
      console.log('既存ユーザー検出、ログインを試行します...')
      
      // ログインを試みる
      const { error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (!loginError) {
        // ログイン成功！プロフィールを更新してリダイレクト
        console.log('自動ログイン成功')
        redirect('/')
      } else {
        // パスワードが違う場合
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
    
    return { error: `登録に失敗しました: ${error.message}` }
  }

  // ユーザー登録成功後、プロフィールをupsert（user_idをキーに）
  if (data.user) {
    try {
      console.log('プロフィール作成:', data.user.id, email, fullName.trim())
      
      // user_id をキーとしてupsert（重複時は上書き更新）
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: data.user.id,  // user_id を含める
          email: email,           // email を含める
          full_name: fullName.trim(),
        }, {
          onConflict: 'user_id'  // user_id をユニーク制約として扱う
        })

      if (profileError) {
        console.error('プロフィール作成エラー:', profileError)
        // プロフィール作成失敗でもログインは成功しているので続行
      } else {
        console.log('プロフィール作成成功')
      }
    } catch (err) {
      console.error('プロフィールupsert例外:', err)
      // エラーでもログインは成功しているので続行
    }
  }

  // 登録成功、確実にリダイレクト
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
