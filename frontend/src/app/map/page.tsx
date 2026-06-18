'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { downloadGPX } from '@/lib/gpx'
import type { LngLat, RouteSegment } from '@/lib/api'
import type { NavInfo } from '@/lib/navigation'
import { createClient } from '@/lib/supabase/client'
import { getRegionName } from '@/lib/courses'
import SaveCourseModal from '@/components/course/SaveCourseModal'
import Logo from '@/components/ui/Logo'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

interface GeoResult {
  id: string
  placeName: string
  shortName: string
  lng: number
  lat: number
}

interface AuthUser {
  email?: string
  name?: string
  avatar?: string
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconUndo() {
  return <span className="text-[22px] leading-none select-none" aria-hidden="true">↶</span>
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

function IconKakao() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-[17px] h-[17px]">
      <path d="M12 3C6.477 3 2 6.478 2 10.778c0 2.794 1.767 5.248 4.436 6.678L5.4 21l4.59-2.462A11.7 11.7 0 0 0 12 18.778C17.523 18.778 22 15.3 22 10.778S17.523 3 12 3z" />
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

function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="18" x2="21" y2="18" />
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

// ── Header dropdown ───────────────────────────────────────────────────────────

interface DropdownItem {
  label: string
  onClick: () => void
  className?: string
}

function HeaderDropdown({
  trigger,
  items,
}: {
  trigger: React.ReactNode
  items: DropdownItem[]
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center justify-center"
      >
        {trigger}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50">
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.onClick() }}
              className={`w-full text-left px-4 py-3 text-[13px] font-semibold hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0 ${item.className ?? 'text-gray-700'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function MapPage() {
  const router = useRouter()
  const [waypoints, setWaypoints] = useState<LngLat[]>([])
  const [segments,  setSegments]  = useState<RouteSegment[]>([])
  const [resetTrigger,     setResetTrigger]     = useState(0)
  const [undoTrigger,      setUndoTrigger]      = useState(0)
  const [closeLoopTrigger, setCloseLoopTrigger] = useState(0)
  const [isNavigating,  setIsNavigating]  = useState(false)
  const [navInfo,       setNavInfo]       = useState<NavInfo | null>(null)
  const [sharing,       setSharing]       = useState(false)
  const [initialWaypoints, setInitialWaypoints] = useState<LngLat[]>([])
  const [initialLoop,      setInitialLoop]      = useState(false)
  const [searchQuery,   setSearchQuery]   = useState('')
  const [geoResults,    setGeoResults]    = useState<GeoResult[]>([])
  const [flyToTarget,   setFlyToTarget]   = useState<{ lng: number; lat: number; id: number } | null>(null)
  const [authUser,      setAuthUser]      = useState<AuthUser | null>(null)
  const [showSaveModal,   setShowSaveModal]   = useState(false)
  const [savedToast,    setSavedToast]    = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const supabaseRef    = useRef(createClient())

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

  const handleSaved = useCallback(() => {
    setShowSaveModal(false)
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 3000)
  }, [])

  const handleSignOut = useCallback(async () => {
    await supabaseRef.current.auth.signOut()
    setAuthUser(null)
    router.push('/')
  }, [router])

  // ── Kakao Maps SDK ────────────────────────────────────────────────────────
  useEffect(() => {
    if (document.getElementById('kakao-maps-sdk')) return
    const script = document.createElement('script')
    script.id = 'kakao-maps-sdk'
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? ''}&libraries=services&autoload=false`
    script.async = true
    document.head.appendChild(script)
  }, [])

  // ── URL waypoints restore ─────────────────────────────────────────────────
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

  // ── Kakao Places search ───────────────────────────────────────────────────
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

  const handleKakaoShare = useCallback(async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kakao = (window as any).Kakao
    if (!kakao?.Share) {
      alert('카카오 SDK가 아직 로드 중입니다. 잠시 후 다시 시도해주세요.')
      return
    }

    const distKm = (segments.reduce((s, seg) => s + seg.distance, 0) / 1000).toFixed(1)
    const pageUrl = window.location.href

    setSharing(true)
    let description = `${distKm}km 코스`
    if (waypoints[0]) {
      const region = await getRegionName(waypoints[0].lng, waypoints[0].lat).catch(() => null)
      if (region) description = `${region} · ${distKm}km`
    }
    setSharing(false)

    kakao.Share.sendDefault({
      objectType: 'feed',
      content: {
        title: 'ShapeRun 코스',
        description,
        imageUrl: 'https://shaperun.vercel.app/icon.svg',
        link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
      },
      buttons: [
        { title: '코스 보기', link: { mobileWebUrl: pageUrl, webUrl: pageUrl } },
      ],
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

  // Header dropdown items
  const loggedInItems: DropdownItem[] = [
    { label: '커뮤니티 피드', onClick: () => router.push('/feed') },
    { label: '내 코스', onClick: () => router.push('/my-courses') },
    { label: 'GPX 활용 가이드', onClick: () => router.push('/guide') },
    { label: '로그아웃', onClick: handleSignOut, className: 'text-red-500' },
  ]
  const guestItems: DropdownItem[] = [
    { label: '로그인', onClick: () => router.push('/') },
    { label: 'GPX 활용 가이드', onClick: () => router.push('/guide') },
  ]

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
          <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg px-4 py-2.5">
            <Logo width={110} height={33} />
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

            {/* ── Profile / menu dropdown ── */}
            {authUser ? (
              <HeaderDropdown
                trigger={
                  authUser.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={authUser.avatar} alt="avatar" className="w-7 h-7 rounded-full object-cover" />
                  ) : (
                    <span className="w-7 h-7 rounded-full bg-blue-500 flex items-center justify-center text-white text-[11px] font-bold">
                      {(authUser.name ?? authUser.email ?? 'U')[0].toUpperCase()}
                    </span>
                  )
                }
                items={loggedInItems}
              />
            ) : (
              <HeaderDropdown
                trigger={<span className="text-gray-500 hover:text-gray-700 transition-colors"><IconMenu /></span>}
                items={guestItems}
              />
            )}
          </div>

          {/* Search dropdown */}
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
              {authUser && (
                <button
                  onClick={() => setShowSaveModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-orange-500 hover:bg-orange-50 transition-colors"
                >
                  <IconSave />
                  저장
                </button>
              )}
              <button
                onClick={() => downloadGPX(segments)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <IconDownload />
                GPX
              </button>
              <button
                onClick={handleKakaoShare}
                disabled={sharing}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-[#3A1D1D] hover:bg-[#FEE500]/20 transition-colors disabled:opacity-40"
              >
                {sharing
                  ? <span className="w-4 h-4 border-2 border-[#3A1D1D] border-t-transparent rounded-full animate-spin" />
                  : <IconKakao />}
                공유
              </button>
            </div>
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
              onClick={() => router.push('/my-courses')}
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
          loopClosed={loopClosed}
          onClose={() => setShowSaveModal(false)}
          onSaved={handleSaved}
        />
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
