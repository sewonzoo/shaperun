'use client'

import { Suspense, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconKakao() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 3C6.477 3 2 6.478 2 10.778c0 2.794 1.767 5.248 4.436 6.678L5.4 21l4.59-2.462A11.7 11.7 0 0 0 12 18.778C17.523 18.778 22 15.3 22 10.778S17.523 3 12 3z" />
    </svg>
  )
}

function IconGoogle() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

// ── Inner component (uses useSearchParams) ────────────────────────────────────

function LoginInner() {
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') ?? '/feed'
  const hasError  = searchParams.get('error') === 'auth_failed'

  const callbackUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback?next=${redirect}`

  const supabase = createClient()

  const signInWithKakao = useCallback(() =>
    supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: callbackUrl, scopes: 'profile_nickname profile_image', queryParams: { scope: 'profile_nickname profile_image' } },
    }),
  [supabase, callbackUrl])

  const signInWithGoogle = useCallback(() =>
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl },
    }),
  [supabase, callbackUrl])

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-10">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-2xl font-bold tracking-tight text-gray-900">ShapeRun</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl px-8 py-10">
          <h1 className="text-xl font-bold text-gray-900 text-center mb-1.5">로그인</h1>
          <p className="text-sm text-gray-400 text-center mb-8">
            소셜 계정으로 간편하게 시작하세요
          </p>

          {hasError && (
            <div className="mb-5 rounded-xl bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium px-4 py-3 text-center">
              로그인 중 오류가 발생했습니다. 다시 시도해주세요.
            </div>
          )}

          {/* Kakao */}
          <button
            onClick={signInWithKakao}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl font-semibold text-[14px] bg-[#FEE500] text-[#191919] hover:brightness-95 transition-all mb-3"
          >
            <IconKakao />
            카카오로 계속하기
          </button>

          {/* Google */}
          <button
            onClick={signInWithGoogle}
            className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl font-semibold text-[14px] bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all"
          >
            <IconGoogle />
            Google로 계속하기
          </button>
        </div>

        <p className="text-center text-[12px] text-gray-400 mt-6 leading-relaxed">
          로그인하면 ShapeRun{' '}
          <span className="underline underline-offset-2 cursor-pointer">이용약관</span>
          {' '}및{' '}
          <span className="underline underline-offset-2 cursor-pointer">개인정보처리방침</span>
          에 동의한 것으로 간주합니다.
        </p>
      </div>
    </main>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <Suspense>
      <LoginInner />
    </Suspense>
  )
}
