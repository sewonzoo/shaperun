'use client'

import dynamic from 'next/dynamic'
import { useState, useCallback } from 'react'
import { downloadGPX } from '@/lib/gpx'
import type { LngLat, RouteSegment } from '@/lib/api'
import type { NavInfo } from '@/lib/navigation'

const MapView = dynamic(() => import('@/components/map/MapView'), { ssr: false })

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

export default function Home() {
  const [waypoints, setWaypoints] = useState<LngLat[]>([])
  const [segments,  setSegments]  = useState<RouteSegment[]>([])
  const [resetTrigger,     setResetTrigger]     = useState(0)
  const [undoTrigger,      setUndoTrigger]      = useState(0)
  const [closeLoopTrigger, setCloseLoopTrigger] = useState(0)
  const [isNavigating, setIsNavigating] = useState(false)
  const [navInfo,      setNavInfo]      = useState<NavInfo | null>(null)

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
      />

      {/* ── Header pill ─────────────────────────────────────────────────── */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
        <div className="flex items-center gap-2.5 bg-white/95 backdrop-blur-md rounded-full shadow-lg px-4 py-2.5 pointer-events-auto">
          <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
          <span className="text-sm font-bold tracking-tight text-gray-900">ShapeRun</span>
          {(waypoints.length > 0 || isNavigating) && (
            <>
              <span className="w-px h-3.5 bg-gray-200" />
              <span className="text-xs text-gray-400 font-medium">
                {isNavigating
                  ? '네비게이션 중'
                  : waypoints.length === 1
                  ? '다음 포인트를 클릭하세요'
                  : loopClosed
                  ? '루프 완성'
                  : `${waypoints.length}개 포인트`}
              </span>
            </>
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
                onClick={() => downloadGPX(segments)}
                className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
              >
                <IconDownload />
                GPX
              </button>
            </div>
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
