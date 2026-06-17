'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Logo from '@/components/ui/Logo'

function IconKakao() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M12 3C6.477 3 2 6.478 2 10.778c0 2.794 1.767 5.248 4.436 6.678L5.4 21l4.59-2.462A11.7 11.7 0 0 0 12 18.778C17.523 18.778 22 15.3 22 10.778S17.523 3 12 3z" />
    </svg>
  )
}

function LandingInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/map'
  const hasError = searchParams.get('error') === 'auth_failed'
  const supabase = useRef(createClient()).current

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace('/map')
    })
  }, [supabase, router])

  const signInWithKakao = () =>
    supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
        scopes: 'profile_nickname profile_image',
        queryParams: { scope: 'profile_nickname profile_image' },
      },
    })

  return (
    <main className="min-h-screen bg-white flex flex-col items-center justify-center px-6">

      {/* Logo */}
      <div className="mb-3">
        <Logo width={140} height={42} />
      </div>
      <p className="text-[15px] text-gray-400 text-center leading-relaxed mb-14">
        내 달리기 코스를 직접 그려보세요
      </p>

      {hasError && (
        <div className="mb-6 w-full max-w-xs rounded-2xl bg-red-50 border border-red-200 text-red-600 text-[13px] font-medium px-4 py-3 text-center">
          로그인 중 오류가 발생했습니다. 다시 시도해주세요.
        </div>
      )}

      <div className="w-full max-w-xs space-y-3">
        {/* Kakao login */}
        <button
          onClick={signInWithKakao}
          className="w-full flex items-center justify-center gap-3 h-13 py-3.5 rounded-2xl font-semibold text-[15px] bg-[#FEE500] text-[#191919] hover:brightness-95 transition-all shadow-sm"
        >
          <IconKakao />
          카카오로 시작하기
        </button>

        {/* Guest */}
        <button
          onClick={() => router.push('/map')}
          className="w-full flex items-center justify-center h-13 py-3.5 rounded-2xl font-semibold text-[15px] text-gray-500 border border-gray-200 hover:bg-gray-50 transition-all"
        >
          비로그인으로 이용하기
        </button>
      </div>

      <p className="text-[11px] text-gray-300 mt-10 text-center leading-relaxed">
        로그인하면 코스 저장 및 관리가 가능합니다
      </p>

      <a
        href="/landing.html"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-[12px] text-blue-400 hover:text-blue-600 transition-colors"
      >
        서비스 알아보기 →
      </a>
    </main>
  )
}

export default function LandingPage() {
  return (
    <Suspense>
      <LandingInner />
    </Suspense>
  )
}
