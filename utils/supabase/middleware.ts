import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // With Fluid compute, don't put this client in a global environment
  // variable. Always create a new one on each request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Do not run code between createServerClient and
  // supabase.auth.getClaims(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  // IMPORTANT: getClaims() validates the JWT signature against the project's
  // published public keys every time. Never use getSession() for protection.
  const { data } = await supabase.auth.getClaims()

  const user = data?.claims

  // /signup は /login へリダイレクト（マジックリンク認証へ移行したため新規登録ページ不要）
  if (request.nextUrl.pathname.startsWith('/signup')) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // ログイン画面とauth関連のパスは認証不要
  if (
    request.nextUrl.pathname.startsWith('/login') ||
    request.nextUrl.pathname.startsWith('/auth') ||
    request.nextUrl.pathname.startsWith('/forgot-password') ||
    request.nextUrl.pathname.startsWith('/reset-password')
  ) {
    // すでにログイン済みの場合は / にリダイレクト（パスワードリセットページを除く）
    if (user && !request.nextUrl.pathname.startsWith('/reset-password')) {
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // ログインが必要なページで未ログインの場合は /login にリダイレクト
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // IMPORTANT: You *must* return the supabaseResponse object as it is.
  // Copying cookies to a new response may cause the browser and server to go
  // out of sync and terminate the user's session prematurely (PKCE verifier loss).
  return supabaseResponse
}
