'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { downloadGPX } from '@/lib/gpx'
import type { LngLat, RouteSegment } from '@/lib/api'
import type { NavInfo } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import SaveCourseModal from '@/components/course/SaveCourseModal'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

interface GeoResult {
  id: string
  placeName: string
  shortName: string
  lng: number
  lat: number
}

// ── Tiny SVG icons ───────────────────────────────────────────────────────────

function IconUndo() {
  return (
    <span className="text-[22px] leading-none select-none" aria-hidden="true">↶</span>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[18px] h-[18px]">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function IconPlay() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <path d="M8 5.14v14l11-7-11-7z" />
    </svg>
  )
}

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M12 3v13M7 12l5 5 5-5" />
      <path d="M3 19h18" />
    </svg>
  )
}

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  )
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-[15px] h-[15px] text-gray-400 shrink-0">
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.35-4.35" />
    </svg>
  )
}

function IconLoop() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function IconStop() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
      <rect x="6" y="6" width="12" height="12" rx="1" />
    </svg>
  )
}

function IconSave() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
      <polyline points="17 21 17 13 7 13 7 21" />
      <polyline points="7 3 7 8 15 8" />
    </svg>
  )
}

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

function IconWarn() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
      <path fillRule="evenodd" d="M9.401 3.003c.713-1.236 2.494-1.236 3.207 0l7.5 13A1.87 1.87 0 0 1 18.5 19H5.5a1.87 1.87 0 0 1-1.608-2.997l7.5-13zM12 8a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 12 8zm0 8.25a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
    </svg>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDist(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

// ── Page ─────────────────────────────────────────────────────────────────────

interface AuthUser {
  email?: string
  name?: string
  avatar?: string
}

export default function Home() {
  const router = useRouter()
  const [waypoints, setWaypoints] = useState<LngLat[]>([])
  const [segments,  setSegments]  = useState<RouteSegment[]>([])
  const [resetTrigger,     setResetTrigger]     = useState(0)
  const [undoTrigger,      setUndoTrigger]      = useState(0)
  const [closeLoopTrigger, setCloseLoopTrigger] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navInfo,      setNavInfo]      = useState<NavInfo | null>(null)
  const [shareCopied,  setShareCopied]  = useState(false)
  const [initialWaypoints, setInitialWaypoints] = useState<LngLat[]>([])
  const [initialLoop,      setInitialLoop]      = useState(false)
  const [searchQuery,  setSearchQuery]  = useState('')
  const [geoResults,   setGeoResults]   = useState<GeoResult[]>([])
  const [flyToTarget,  setFlyToTarget]  = useState<{ lng: number; lat: number; id: number } | null>(null)
  const [authUser,       setAuthUser]       = useState<AuthUser | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showSaveModal,  setShowSaveModal]  = useState(false)
  const [savedToast,     setSavedToast]     = useState(false)
  const searchInputRef  = useRef<HTMLInputElement>(null)
  const supabaseRef     = useRef(createClient())

  // ── Auth state ────────────────────────────────────────────────────────────
  useEffect(() => {
    const supabase = supabaseRef.current
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const m = session.user.user_metadata
        setAuthUser({ email: session.user.email, name: m?.full_name ?? m?.name, avatar: m?.avatar_url })
      }
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session?.user) {
        const m = session.user.user_metadata
        setAuthUser({ email: session.user.email, name: m?.full_name ?? m?.name, avatar: m?.avatar_url })
      } else {
        setAuthUser(null)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleSave = useCallback(() => {
    if (!authUser) { setShowLoginModal(true); return }
    setShowSaveModal(true)
  }, [authUser])

  const handleSaved = useCallback(() => {
    setShowSaveModal(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 3000)
  }, [])

  const handleSignOut = useCallback(async () => {
    await supabaseRef.current.auth.signOut()
    setAuthUser(null)
  }, [])

  const signInWithKakao = useCallback(() =>
    supabaseRef.current.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/feed`, scopes: 'profile_nickname profile_image', queryParams: { scope: 'profile_nickname profile_image' } },
    }),
  [])

  const signInWithGoogle = useCallback(() =>
    supabaseRef.current.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/feed` },
    }),
  [])

  // Inject Kakao Maps SDK script on mount
  useEffect(() => {
    if (document.getElementById('kakao-maps-sdk')) return
    const script = document.createElement('script')
    script.id = 'kakao-maps-sdk'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''}&libraries=services&autoload=false`
    script.async = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const wpsStr = params.get('wps')
    if (!wpsStr) return
    const parsed = wpsStr.split('_').map(s => {
      const [lng, lat] = s.split(',').map(Number)
      return { lng, lat }
    }).filter(w => !isNaN(w.lng) && !isNaN(w.lat))
    if (parsed.length > 0) {
      setInitialWaypoints(parsed)
      setInitialLoop(params.get('loop') === '1')
    }
  }, [])

  // Debounced Kakao Maps Places search (SDK, CORS-safe)
  useEffect(() => {
    const q = searchQuery.trim()
    if (!q || q.length < 2) { setGeoResults([]); return }

    let cancelled = false
    const timer = setTimeout(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const kakao = (window as any).kakao
      if (!kakao?.maps) return

      kakao.maps.load(() => {
        if (cancelled) return
        const ps = new kakao.maps.services.Places()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ps.keywordSearch(q, (data: any[], status: string) => {
          if (cancelled) return
          if (status !== kakao.maps.services.Status.OK) { setGeoResults([]); return }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setGeoResults(data.map((d: any) => ({
            id: d.id as string,
            placeName: d.address_name as string,
            shortName: d.place_name as string,
            lng: parseFloat(d.x),
            lat: parseFloat(d.y),
          })))
        }, { size: 5 })
      })
    }, 350)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [searchQuery])

  const handleSelectResult = useCallback((r: GeoResult) => {
    setFlyToTarget({ lng: r.lng, lat: r.lat, id: Date.now() })
    setSearchQuery('')
    setGeoResults([])
    searchInputRef.current?.blur()
  }, [])

  const handleRouteChange = useCallback((wps: LngLat[], segs: RouteSegment[]) => {
    setWaypoints(wps)
    setSegments(segs)
  }, [])

  const handleNavUpdate = useCallback((info: NavInfo | null) => setNavInfo(info), [])

  const handleReset = useCallback(() => {
    setResetTrigger(t => t + 1)
    setIsNavigating(false)
    setNavInfo(null)
  }, [])

  const stopNav = useCallback(() => { setIsNavigating(false); setNavInfo(null) }, [])

  const handleShare = useCallback(() => {
    const isLooped = waypoints.length > 0 && segments.length === waypoints.length
    const wpsStr = waypoints.map(w => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`).join('_')
    const params = new URLSearchParams({ wps: wpsStr })
    if (isLooped) params.set('loop', '1')
    const url = `${window.location.origin}${window.location.pathname}?${params}`
    navigator.clipboard.writeText(url).then(() => {
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    }).catch(() => {
      // Fallback for non-HTTPS or older browsers
      const ta = document.createElement('textarea')
      ta.value = url
      ta.style.cssText = 'position:fixed;opacity:0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2500)
    })
  }, [waypoints, segments])

  // Derived
  const loopClosed    = waypoints.length > 0 && segments.length === waypoints.length
  const hasRoute      = segments.length > 0
  const totalDistKm   = segments.reduce((s, seg) => s + seg.distance, 0) / 1000
  const totalDurMin   = Math.round(segments.reduce((s, seg) => s + seg.duration, 0) / 60)
  const canCloseLoop  = waypoints.length >= 2 && !loopClosed
  const showBottomBar = hasRoute && !isNavigating
  const showNavBar    = isNavigating

  return (
    <main className="w-screen h-screen overflow-hidden relative bg-gray-100">
      <MapView
        onRouteChange={handleRouteChange}
        onNavUpdate={handleNavUpdate}
        resetTrigger={resetTrigger}
        undoTrigger={undoTrigger}
        closeLoopTrigger={closeLoopTrigger}
        isNavigating={isNavigating}
        initialWaypoints={initialWaypoints}
        initialLoop={initialLoop}
        flyToTarget={flyToTarget}
      />

      {/* ── Header pill + search ────────────────────────────────────────── */}
      <div className="absolute top-4 left-0 right-0 z-30 px-3 flex justify-center pointer-events-none">
        <div className="relative w-full max-w-md pointer-events-auto">
          {/* Pill */}
          <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg px-4 py-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
            <span className="text-sm font-bold tracking-tight text-gray-900 whitespace-nowrap">ShapeRun</span>
            <span className="w-px h-4 bg-gray-200 shrink-0" />
            <IconSearch />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Escape') { setSearchQuery(''); setGeoResults([]) } }}
              onBlur={() => setTimeout(() => setGeoResults([]), 200)}
              placeholder="장소 검색"
              className="flex-1 min-w-0 text-[13px] bg-transparent outline-none text-gray-700 placeholder:text-gray-400"
            />
            {searchQuery && (
              <button
                onMouseDown={e => { e.preventDefault(); setSearchQuery(''); setGeoResults([]) }}
                className="shrink-0 text-gray-300 hover:text-gray-500 text-lg leading-none"
                aria-label="검색어 지우기"
              >
                ×
              </button>
            )}
            <span className="w-px h-4 bg-gray-200 shrink-0" />
            {authUser ? (
              <button
                onClick={handleSignOut}
                className="shrink-0 flex items-center gap-1.5"
                title="로그아웃"
              >
                {authUser.avatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={authUser.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                ) : (
                  <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-bold">
                    {(authUser.name ?? authUser.email ?? 'U')[0].toUpperCase()}
                  </span>
                )}
              </button>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="shrink-0 text-[12px] font-semibold text-blue-600 whitespace-nowrap hover:text-blue-700"
              >
                로그인
              </button>
            )}
          </div>

          {/* Dropdown */}
          {geoResults.length > 0 && (
            <div className="absolute top-full mt-2 left-0 right-0 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
              {geoResults.map(r => (
                <button
                  key={r.id}
                  onMouseDown={e => { e.preventDefault(); handleSelectResult(r) }}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 active:bg-gray-100 border-b border-gray-50 last:border-0 transition-colors"
                >
                  <span className="text-[13px] font-semibold text-gray-800 block truncate">{r.shortName}</span>
                  <span className="text-[11px] text-gray-400 block truncate mt-0.5">{r.placeName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Left floating: undo + reset ──────────────────────────────────── */}
      {waypoints.length > 0 && !isNavigating && (
        <div className="absolute left-3 top-[72px] flex flex-col gap-2 z-10">
          <button
            onClick={() => setUndoTrigger(t => t + 1)}
            title="마지막 포인트 삭제"
            className="w-11 h-11 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-colors"
          >
            <IconUndo />
          </button>
          <button
            onClick={handleReset}
            title="전체 초기화"
            className="w-10 h-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
          >
            <IconTrash />
          </button>
        </div>
      )}

      {/* ── Bottom bar (route drawn) ─────────────────────────────────────── */}
      {showBottomBar && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center px-4 pb-6 pointer-events-none z-10">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">

            {/* Stats row */}
            <div className="flex items-end gap-5 px-6 pt-5 pb-4">
              <div>
                <span className="text-[2.2rem] font-bold tracking-tight leading-none text-gray-900">
                  {totalDistKm.toFixed(2)}
                </span>
                <span className="text-sm text-gray-400 ml-1.5 font-medium">km</span>
              </div>
              <div className="w-px h-8 bg-gray-100 mb-0.5" />
              <div>
                <span className="text-[2.2rem] font-bold tracking-tight leading-none text-gray-900">
                  {totalDurMin}
                </span>
                <span className="text-sm text-gray-400 ml-1.5 font-medium">분</span>
              </div>
              {loopClosed && (
                <div className="ml-auto mb-1 flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[11px] font-semibold px-2.5 py-1 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  루프 완성
                </div>
              )}
            </div>

            {/* Action row */}
            <div className="flex border-t border-gray-100 divide-x divide-gray-100">
              {canCloseLoop && (
                <button
                  onClick={() => setCloseLoopTrigger(t => t + 1)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-emerald-600 hover:bg-emerald-50 transition-colors"
                >
                  <IconLoop />
                  루프 닫기
                </button>
              )}
              <button
                onClick={() => setIsNavigating(true)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
              >
                <IconPlay />
                네비게이션
              </button>
              <button
                onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-orange-500 hover:bg-orange-50 transition-colors"
              >
                <IconSave />
                저장
              </button>
              <button
                onClick={() => downloadGPX(segments)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <IconDownload />
                GPX
              </button>
              <button
                onClick={handleShare}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-violet-500 hover:bg-violet-50 transition-colors"
              >
                <IconShare />
                공유
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Share toast ──────────────────────────────────────────────────── */}
      {shareCopied && (
        <div className="absolute bottom-52 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="bg-gray-900/90 text-white text-sm font-medium px-5 py-2.5 rounded-full shadow-xl backdrop-blur-sm whitespace-nowrap">
            링크가 복사됐습니다
          </div>
        </div>
      )}

      {/* ── Saved toast ──────────────────────────────────────────────────── */}
      {savedToast && (
        <div className="absolute bottom-52 left-1/2 -translate-x-1/2 z-20 pointer-events-none">
          <div className="flex items-center gap-3 bg-gray-900/90 text-white text-sm font-medium pl-4 pr-2 py-2 rounded-full shadow-xl backdrop-blur-sm whitespace-nowrap">
            코스가 저장됐어요
            <button
              className="pointer-events-auto bg-white/20 hover:bg-white/30 text-white text-[12px] font-semibold px-3 py-1 rounded-full transition-colors"
              onClick={() => router.push('/feed')}
            >
              피드 보기
            </button>
          </div>
        </div>
      )}

      {/* ── Save course modal ────────────────────────────────────────────── */}
      {showSaveModal && (
        <SaveCourseModal
          waypoints={waypoints}
          segments={segments}
          loopClosed={segments.length === waypoints.length && waypoints.length > 0}
          onClose={() => setShowSaveModal(false)}
          onSaved={handleSaved}
        />
      )}

      {/* ── Login modal (bottom sheet) ───────────────────────────────────── */}
      {showLoginModal && (
        <div
          className="absolute inset-0 z-50 flex items-end justify-center"
          onClick={() => setShowLoginModal(false)}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div
            className="relative w-full max-w-sm bg-white rounded-t-3xl shadow-2xl px-6 pt-5 pb-10 pointer-events-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Handle */}
            <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

            <div className="flex items-center gap-2 mb-1">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="text-base font-bold text-gray-900">로그인하고 경로 저장하기</span>
            </div>
            <p className="text-[13px] text-gray-400 mb-6 pl-4">
              소셜 계정으로 간편하게 시작하고 경로를 저장하세요
            </p>

            <button
              onClick={signInWithKakao}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl font-semibold text-[14px] bg-[#FEE500] text-[#191919] hover:brightness-95 transition-all mb-3"
            >
              <IconKakao />
              카카오로 계속하기
            </button>
            <button
              onClick={signInWithGoogle}
              className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl font-semibold text-[14px] bg-white text-gray-700 border border-gray-200 hover:bg-gray-50 transition-all mb-4"
            >
              <IconGoogle />
              Google로 계속하기
            </button>
            <button
              onClick={() => setShowLoginModal(false)}
              className="w-full text-center text-[13px] text-gray-400 hover:text-gray-600 font-medium py-1"
            >
              나중에
            </button>
          </div>
        </div>
      )}

      {/* ── Navigation bar ───────────────────────────────────────────────── */}
      {showNavBar && (
        <div className="absolute bottom-0 left-0 right-0 flex justify-center px-4 pb-6 pointer-events-none z-10">
          <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">
            <div className="px-6 py-5">
              {navInfo?.isComplete ? (
                <div className="text-center py-1">
                  <p className="text-2xl font-bold text-emerald-600 tracking-tight">도착 완료</p>
                  <p className="text-xs text-gray-400 mt-1 font-medium">경로를 완주했습니다</p>
                </div>
              ) : navInfo ? (
                <div className="flex items-start justify-between">
                  <div>
                    {navInfo.isOffRoute && (
                      <div className="flex items-center gap-1 text-red-500 text-[11px] font-bold mb-2 animate-pulse">
                        <IconWarn />
                        경로 이탈
                      </div>
                    )}
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[2.2rem] font-bold tracking-tight leading-none text-gray-900">
                        {navInfo.distanceToNextWpM >= 1000
                          ? (navInfo.distanceToNextWpM / 1000).toFixed(1)
                          : Math.round(navInfo.distanceToNextWpM)}
                      </span>
                      <span className="text-sm text-gray-400 font-medium">
                        {navInfo.distanceToNextWpM >= 1000 ? 'km' : 'm'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 font-medium">다음 포인트까지</p>
                  </div>
                  <div className="bg-gray-100 rounded-xl px-3 py-2 text-right">
                    <p className="text-lg font-bold text-gray-700 leading-none">
                      {navInfo.nextWpIndex + 1}
                      <span className="text-xs font-medium text-gray-400 ml-0.5">/{navInfo.totalTargets}</span>
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5 font-medium">포인트</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2.5 py-1">
                  <span className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />
                  <span className="text-sm text-gray-500 font-medium">GPS 수신 중…</span>
                </div>
              )}
            </div>

            <div className="border-t border-gray-100">
              <button
                onClick={stopNav}
                className="w-full flex items-center justify-center gap-2 py-3.5 text-[13px] font-semibold text-red-500 hover:bg-red-50 transition-colors"
              >
                <IconStop />
                네비게이션 종료
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
