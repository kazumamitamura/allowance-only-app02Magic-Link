/**
 * Supabase エラーハンドリングユーティリティ
 */

export interface SupabaseError {
  message: string
  code?: string
  details?: string
  hint?: string
}

/**
 * Supabase エラーを解析して、ユーザー向けのメッセージを生成
 */
export function handleSupabaseError(error: SupabaseError | null): string {
  if (!error) {
    return '不明なエラーが発生しました'
  }

  const errorMessage = error.message || ''
  const errorCode = error.code || ''
  const errorDetails = error.details || ''
  const errorHint = error.hint || ''

  // スキーマキャッシュのエラー（PGRST205）
  if (
    errorCode === 'PGRST205' ||
    (errorMessage.includes('schema cache') && errorMessage.includes('Could not find'))
  ) {
    return (
      'データの取得に失敗しました: スキーマキャッシュが更新されていません。\n\n' +
      '【解決方法】\n' +
      '1. 数秒待ってから再度お試しください\n' +
      '2. ページをリロードしてください\n' +
      '3. それでも解決しない場合は、管理者にお問い合わせください\n\n' +
      'エラー詳細:\n' +
      'コード: ' + errorCode + '\n' +
      'メッセージ: ' + errorMessage
    )
  }

  // テーブルが存在しないエラー
  if (
    errorMessage.includes('does not exist') ||
    errorMessage.includes('relation') ||
    errorMessage.includes('table') ||
    errorCode === '42P01' ||
    errorCode === 'PGRST116'
  ) {
    return (
      'データの取得に失敗しました: テーブルが作成されていません。\n\n' +
      '【解決方法】\n' +
      '管理者にお問い合わせください。\n\n' +
      'エラー詳細:\n' +
      'コード: ' + errorCode + '\n' +
      'メッセージ: ' + errorMessage
    )
  }

  // RLSポリシー関連のエラー
  if (
    errorMessage.includes('permission denied') ||
    errorMessage.includes('new row violates row-level security') ||
    errorMessage.includes('RLS') ||
    errorCode === '42501' ||
    errorCode === 'PGRST301'
  ) {
    return (
      'データの取得に失敗しました: アクセス権限の問題が発生しています。\n\n' +
      '【解決方法】\n' +
      '管理者にお問い合わせください。\n\n' +
      'エラー詳細:\n' +
      'コード: ' + errorCode + '\n' +
      'メッセージ: ' + errorMessage
    )
  }

  // Invalid API key エラー
  if (
    errorMessage.includes('Invalid API key') ||
    errorMessage.includes('JWT') ||
    errorMessage.includes('Invalid token')
  ) {
    return (
      '認証に失敗しました: API キーが無効です。\n\n' +
      '【解決方法】\n' +
      '1. ページをリロードしてください\n' +
      '2. それでも解決しない場合は、管理者にお問い合わせください\n\n' +
      'エラー詳細:\n' +
      'コード: ' + errorCode + '\n' +
      'メッセージ: ' + errorMessage
    )
  }

  // その他のエラー
  return (
    'エラーが発生しました: ' + errorMessage +
    (errorCode ? ' (コード: ' + errorCode + ')' : '') +
    (errorDetails ? '\n\n詳細: ' + errorDetails : '') +
    (errorHint ? '\nヒント: ' + errorHint : '')
  )
}

/**
 * Supabase クエリのエラーログを出力
 */
export function logSupabaseError(context: string, error: SupabaseError | null) {
  if (!error) {
    console.error(`[${context}] エラーオブジェクトが null です`)
    return
  }

  console.error(`[${context}] Supabase エラー:`, {
    message: error.message,
    code: error.code,
    details: error.details,
    hint: error.hint,
    fullError: error
  })
}
