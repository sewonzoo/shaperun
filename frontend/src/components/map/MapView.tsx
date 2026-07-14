'use client'

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { initMapboxToken, DEFAULT_CENTER, DEFAULT_ZOOM } from '@/lib/mapbox'
import { getWalkingRoute, type LngLat, type RouteSegment } from '@/lib/api'
import {
  haversineM, minDistToRoute,
  OFF_ROUTE_THRESHOLD_M, ARRIVAL_RADIUS_M,
  type NavInfo,
} from '@/lib/navigation'

initMapboxToken()

interface Props {
  onRouteChange: (waypoints: LngLat[], segments: RouteSegment[]) => void
  onNavUpdate:   (info: NavInfo | null) => void
  resetTrigger:  number
  undoTrigger:   number
  closeLoopTrigger: number
  isNavigating:  boolean
  initialWaypoints?: LngLat[]
  initialLoop?: boolean
  flyToTarget?: { lng: number; lat: number; id: number } | null
  resetViewTrigger?: number
  onCenterChange?: (center: { lng: number; lat: number }) => void
  importedRoute?: { points: LngLat[]; id: number } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const isLoopClosed = (wps: LngLat[], segs: RouteSegment[]) =>
  wps.length > 0 && segs.length === wps.length

function makeWaypointEl(index: number): HTMLElement {
  const isStart = index === 0
  const el = document.createElement('div')
  el.style.cssText = [
    `width:${isStart ? 22 : 14}px`, `height:${isStart ? 22 : 14}px`,
    `background:${isStart ? '#16a34a' : '#2563eb'}`,
    'border:3px solid #fff', 'border-radius:50%',
    'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'font-size:7px', 'font-weight:700', 'color:#fff', 'pointer-events:none',
  ].join(';')
  if (!isStart) el.textContent = String(index + 1)
  return el
}

function injectNavStyles() {
  if (document.getElementById('sr-nav-styles')) return
  const s = document.createElement('style')
  s.id = 'sr-nav-styles'
  s.textContent = `
    @keyframes sr-pulse {
      0%   { transform:scale(1);   opacity:.6 }
      100% { transform:scale(3.2); opacity:0  }
    }
    .sr-ring { animation: sr-pulse 1.8s ease-out infinite }
  `
  document.head.appendChild(s)
}

function makeNavDotEl(): HTMLElement {
  injectNavStyles()
  const w = document.createElement('div')
  w.style.cssText = 'position:relative;width:20px;height:20px'
  const ring = document.createElement('div')
  ring.className = 'sr-ring'
  ring.style.cssText = [
    'position:absolute', 'inset:-7px', 'border-radius:50%',
    'background:rgba(37,99,235,.2)', 'border:2px solid rgba(37,99,235,.4)',
  ].join(';')
  const dot = document.createElement('div')
  dot.style.cssText = [
    'position:absolute', 'inset:0', 'border-radius:50%',
    'background:#2563eb', 'border:3px solid #fff',
    'box-shadow:0 2px 10px rgba(37,99,235,.55)',
  ].join(';')
  w.appendChild(ring)
  w.appendChild(dot)
  return w
}

function makeLocateDotEl(): HTMLElement {
  const el = document.createElement('div')
  el.style.cssText = [
    'width:16px', 'height:16px',
    'background:#2563eb',
    'border:3px solid #fff',
    'border-radius:50%',
    'box-shadow:0 2px 10px rgba(37,99,235,0.5)',
    'pointer-events:none',
  ].join(';')
  return el
}

function applyRouteData(map: mapboxgl.Map, segs: RouteSegment[]) {
  const src = map.getSource('route') as mapboxgl.GeoJSONSource | undefined
  if (!src) return
  const coords: [number, number][] = []
  segs.forEach((s, i) => coords.push(...(i === 0 ? s.coordinates : s.coordinates.slice(1))))
  src.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } })
}

function clearPreview(map: mapboxgl.Map) {
  const src = map.getSource('preview') as mapboxgl.GeoJSONSource | undefined
  src?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } })
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconLocate() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
    </svg>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function MapView({
  onRouteChange, onNavUpdate,
  resetTrigger, undoTrigger, closeLoopTrigger, isNavigating,
  initialWaypoints, initialLoop, flyToTarget, resetViewTrigger, onCenterChange,
  importedRoute,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef       = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded,  setMapLoaded]  = useState(false)
  const [isRouting,  setIsRouting]  = useState(false)
  const [routeError, setRouteError] = useState<string | null>(null)
  const [isLocating, setIsLocating] = useState(false)

  // Route state
  const waypointsRef = useRef<LngLat[]>([])
  const segmentsRef  = useRef<RouteSegment[]>([])
  const markersRef   = useRef<mapboxgl.Marker[]>([])
  const isRoutingRef    = useRef(false)
  const isNavigatingRef = useRef(false)

  // Stable callback refs
  const onRouteChangeRef    = useRef(onRouteChange)
  const onNavUpdateRef      = useRef(onNavUpdate)
  const onCenterChangeRef   = useRef(onCenterChange)
  const initialWaypointsRef = useRef(initialWaypoints)
  const initialLoopRef      = useRef(initialLoop)
  const didRestoreRef       = useRef(false)
  useEffect(() => { onRouteChangeRef.current  = onRouteChange  }, [onRouteChange])
  useEffect(() => { onNavUpdateRef.current    = onNavUpdate    }, [onNavUpdate])
  useEffect(() => { onCenterChangeRef.current = onCenterChange }, [onCenterChange])
  useEffect(() => { isNavigatingRef.current   = isNavigating   }, [isNavigating])

  // Nav state
  const watchIdRef       = useRef<number | null>(null)
  const navMarkerRef     = useRef<mapboxgl.Marker | null>(null)
  const locationMarkerRef = useRef<mapboxgl.Marker | null>(null)
  const nextWpIdxRef     = useRef(0)

  // ── Map init ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
    })
    mapRef.current = map
    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource('route', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      })
      map.addLayer({
        id: 'route-line', type: 'line', source: 'route',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 0.9 },
      })
      map.addSource('preview', {
        type: 'geojson',
        data: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [] } },
      })
      map.addLayer({
        id: 'preview-line', type: 'line', source: 'preview',
        layout: { 'line-join': 'round', 'line-cap': 'round' },
        paint: { 'line-color': '#2563eb', 'line-width': 3, 'line-opacity': 0.35, 'line-dasharray': [2, 3] },
      })
      map.on('moveend', () => {
        const { lng, lat } = map.getCenter()
        onCenterChangeRef.current?.({ lng, lat })
      })
      setMapLoaded(true)
      const urlParams = new URLSearchParams(window.location.search)
      const hasCourseParams = urlParams.has('wps') || urlParams.has('courseId') || urlParams.has('id') || urlParams.has('shared')
      if (!initialWaypointsRef.current?.length && !hasCourseParams) {
        setIsLocating(true)
        navigator.geolocation?.getCurrentPosition(
          ({ coords }) => {
            if (!mapRef.current) return
            const { longitude: lng, latitude: lat } = coords
            if (locationMarkerRef.current) {
              locationMarkerRef.current.setLngLat([lng, lat])
            } else {
              locationMarkerRef.current = new mapboxgl.Marker({ element: makeLocateDotEl(), anchor: 'center' })
                .setLngLat([lng, lat]).addTo(map)
            }
            map.flyTo({ center: [lng, lat], zoom: 15, duration: 1200 })
            setIsLocating(false)
          },
          () => { if (mapRef.current) setIsLocating(false) },
          { timeout: 8000, enableHighAccuracy: true },
        )
      }
    })

    return () => { map.remove(); mapRef.current = null; setMapLoaded(false) }
  }, [])

  // ── Click → waypoint ──────────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return

    const onClick = async (e: mapboxgl.MapMouseEvent) => {
      const wps = waypointsRef.current
      const segs = segmentsRef.current
      if (isRoutingRef.current || isLoopClosed(wps, segs) || isNavigatingRef.current) return
      setRouteError(null)

      const lngLat: LngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat }
      const prev = wps.at(-1)

      const marker = new mapboxgl.Marker({ element: makeWaypointEl(wps.length) })
        .setLngLat([lngLat.lng, lngLat.lat]).addTo(map)
      markersRef.current.push(marker)
      waypointsRef.current = [...wps, lngLat]

      if (prev) {
        isRoutingRef.current = true
        setIsRouting(true)
        const previewSrc = map.getSource('preview') as mapboxgl.GeoJSONSource
        previewSrc?.setData({
          type: 'Feature', properties: {},
          geometry: { type: 'LineString', coordinates: [[prev.lng, prev.lat], [lngLat.lng, lngLat.lat]] },
        })
        try {
          const seg = await getWalkingRoute(prev, lngLat)
          segmentsRef.current = [...segs, seg]
          applyRouteData(map, segmentsRef.current)
          clearPreview(map)
          onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
        } catch {
          markersRef.current.at(-1)?.remove()
          markersRef.current.pop()
          waypointsRef.current = waypointsRef.current.slice(0, -1)
          clearPreview(map)
          setRouteError('이 구간의 도보 경로를 찾을 수 없습니다.')
          onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
        } finally {
          isRoutingRef.current = false
          setIsRouting(false)
        }
      } else {
        onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
      }
    }

    map.on('click', onClick)
    const canvas = map.getCanvas()
    if (canvas) canvas.style.cursor = 'crosshair'
    return () => {
      map.off('click', onClick)
      const c = map.getCanvas()
      if (c) c.style.cursor = ''
    }
  }, [mapLoaded])

  // ── Close loop ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (closeLoopTrigger === 0) return
    const map = mapRef.current
    const wps = waypointsRef.current
    const segs = segmentsRef.current
    if (wps.length < 2 || isLoopClosed(wps, segs) || isRoutingRef.current) return

    const first = wps[0], last = wps.at(-1)!
    isRoutingRef.current = true
    setIsRouting(true)
    setRouteError(null)

    const prevSrc = map?.getSource('preview') as mapboxgl.GeoJSONSource | undefined
    prevSrc?.setData({
      type: 'Feature', properties: {},
      geometry: { type: 'LineString', coordinates: [[last.lng, last.lat], [first.lng, first.lat]] },
    })

    getWalkingRoute(last, first)
      .then(seg => {
        segmentsRef.current = [...segs, seg]
        if (map) { applyRouteData(map, segmentsRef.current); clearPreview(map) }
        if (map) { const c = map.getCanvas(); if (c) c.style.cursor = 'default' }
        onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
      })
      .catch(() => { clearPreview(map!); setRouteError('루프를 닫는 경로를 찾을 수 없습니다.') })
      .finally(() => { isRoutingRef.current = false; setIsRouting(false) })
  }, [closeLoopTrigger])

  // ── Undo last point ────────────────────────────────────────────────────────
  useEffect(() => {
    if (undoTrigger === 0) return
    const map = mapRef.current
    const wps = waypointsRef.current
    const segs = segmentsRef.current
    if (wps.length === 0) return

    if (isLoopClosed(wps, segs)) {
      // Undo the loop-closing segment only; keep all waypoint markers
      segmentsRef.current = segs.slice(0, -1)
      if (map) { applyRouteData(map, segmentsRef.current); const c = map.getCanvas(); if (c) c.style.cursor = 'crosshair' }
    } else {
      markersRef.current.at(-1)?.remove()
      markersRef.current = markersRef.current.slice(0, -1)
      waypointsRef.current = wps.slice(0, -1)
      segmentsRef.current = segs.length > 0 ? segs.slice(0, -1) : segs
      if (map) applyRouteData(map, segmentsRef.current)
    }

    onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
  }, [undoTrigger])

  // ── Navigation ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isNavigating) return
    const map = mapRef.current
    const wps = waypointsRef.current
    const segs = segmentsRef.current
    if (!map || wps.length < 2 || segs.length === 0) return

    const loop = segs.length === wps.length
    const targets: LngLat[] = loop ? [...wps.slice(1), wps[0]] : wps.slice(1)
    nextWpIdxRef.current = 0

    const routeCoords: [number, number][] = []
    segs.forEach((s, i) => routeCoords.push(...(i === 0 ? s.coordinates : s.coordinates.slice(1))))

    // Hide static locate dot while nav dot is active
    locationMarkerRef.current?.remove()
    locationMarkerRef.current = null

    const navMarker = new mapboxgl.Marker({ element: makeNavDotEl(), anchor: 'center' })
    navMarkerRef.current = navMarker
    let placed = false
    const navCanvas = map.getCanvas(); if (navCanvas) navCanvas.style.cursor = 'default'

    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        if (!placed) { navMarker.setLngLat([lng, lat]).addTo(map); placed = true }
        else navMarker.setLngLat([lng, lat])
        map.easeTo({ center: [lng, lat], duration: 500 })

        const idx = nextWpIdxRef.current
        const target = targets[idx]
        if (!target) return
        const distToNext = haversineM(lat, lng, target.lat, target.lng)
        const isOffRoute = minDistToRoute(lat, lng, routeCoords) > OFF_ROUTE_THRESHOLD_M
        const isComplete = idx === targets.length - 1 && distToNext < ARRIVAL_RADIUS_M
        if (distToNext < ARRIVAL_RADIUS_M && idx < targets.length - 1) nextWpIdxRef.current++

        onNavUpdateRef.current({ distanceToNextWpM: distToNext, nextWpIndex: nextWpIdxRef.current, totalTargets: targets.length, isOffRoute, isComplete })
      },
      err => console.warn('[Nav]', err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 15000 },
    )
    watchIdRef.current = watchId

    return () => {
      navigator.geolocation.clearWatch(watchId)
      navMarker.remove()
      navMarkerRef.current = null
      watchIdRef.current = null
      nextWpIdxRef.current = 0
      onNavUpdateRef.current(null)
      if (mapRef.current) {
        const wps2 = waypointsRef.current
        const segs2 = segmentsRef.current
        const c2 = mapRef.current.getCanvas(); if (c2) c2.style.cursor = isLoopClosed(wps2, segs2) ? 'default' : 'crosshair'
      }
    }
  }, [isNavigating])

  // ── Fly to searched location ──────────────────────────────────────────────
  useEffect(() => {
    if (!flyToTarget || !mapRef.current) return
    mapRef.current.flyTo({ center: [flyToTarget.lng, flyToTarget.lat], zoom: 15, duration: 900 })
  }, [flyToTarget])

  // ── Reset view to default center/zoom (logo click) ─────────────────────────
  useEffect(() => {
    if (!resetViewTrigger || !mapRef.current) return
    mapRef.current.flyTo({ center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM, duration: 900 })
  }, [resetViewTrigger])

  // ── Restore route from shared URL ─────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current
    const initWps = initialWaypoints
    if (!mapLoaded || !map || !initWps?.length || didRestoreRef.current) return
    didRestoreRef.current = true

    const restore = async () => {
      isRoutingRef.current = true
      setIsRouting(true)
      setRouteError(null)
      try {
        for (let i = 0; i < initWps.length; i++) {
          const lngLat = initWps[i]
          const marker = new mapboxgl.Marker({ element: makeWaypointEl(i) })
            .setLngLat([lngLat.lng, lngLat.lat]).addTo(map)
          markersRef.current.push(marker)
          waypointsRef.current = [...waypointsRef.current, lngLat]
          if (i > 0) {
            const seg = await getWalkingRoute(initWps[i - 1], lngLat)
            segmentsRef.current = [...segmentsRef.current, seg]
            applyRouteData(map, segmentsRef.current)
          }
        }
        if (initialLoopRef.current && initWps.length >= 2) {
          const seg = await getWalkingRoute(initWps[initWps.length - 1], initWps[0])
          segmentsRef.current = [...segmentsRef.current, seg]
          applyRouteData(map, segmentsRef.current)
          const rc = map.getCanvas(); if (rc) rc.style.cursor = 'default'
        }
        onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])

        // Fit map to restored route
        const allCoords: [number, number][] = segmentsRef.current.flatMap(s => s.coordinates)
        if (allCoords.length > 0) {
          const bounds = allCoords.reduce(
            (b, c) => b.extend(c),
            new mapboxgl.LngLatBounds(allCoords[0], allCoords[0]),
          )
          map.fitBounds(bounds, { padding: 60, duration: 1000 })
        }
      } catch {
        setRouteError('공유 경로를 불러오는 중 오류가 발생했습니다.')
      } finally {
        isRoutingRef.current = false
        setIsRouting(false)
      }
    }

    try {
      restore()
    } catch (e) {
      console.error('restore 에러:', e)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapLoaded, initialWaypoints])

  // ── GPX 파일 가져오기 ─────────────────────────────────────────────────────
  // 가져온 트랙은 도로 스냅(getWalkingRoute) 없이 원본 좌표를 그대로 단일
  // 세그먼트로 주입한다 — 이미 실제로 기록된 경로라 재라우팅하면 원본과
  // 달라지고, 점이 수백~수천 개라 쌍마다 Directions API를 부르는 것도 비현실적.
  // 이렇게 하면 undo/reset 등 기존 로직이 "세그먼트 1개짜리 코스"로 그대로 동작한다.
  useEffect(() => {
    const map = mapRef.current
    if (!mapLoaded || !map || !importedRoute || importedRoute.points.length < 2) return

    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
    navMarkerRef.current?.remove(); navMarkerRef.current = null
    markersRef.current.forEach(m => m.remove()); markersRef.current = []

    const pts = importedRoute.points
    const first = pts[0]
    const last = pts[pts.length - 1]
    const isLoop = first.lng === last.lng && first.lat === last.lat

    let distanceM = 0
    for (let i = 1; i < pts.length; i++) {
      distanceM += haversineM(pts[i - 1].lat, pts[i - 1].lng, pts[i].lat, pts[i].lng)
    }

    const seg: RouteSegment = {
      coordinates: pts.map(p => [p.lng, p.lat]),
      distance: distanceM,
      duration: distanceM / 1.39, // 도보 속도(약 5km/h, Directions API 기준) 추정치
    }

    waypointsRef.current = isLoop ? [first] : [first, last]
    segmentsRef.current = [seg]

    const startMarker = new mapboxgl.Marker({ element: makeWaypointEl(0) }).setLngLat([first.lng, first.lat]).addTo(map)
    markersRef.current.push(startMarker)
    if (!isLoop) {
      const endMarker = new mapboxgl.Marker({ element: makeWaypointEl(1) }).setLngLat([last.lng, last.lat]).addTo(map)
      markersRef.current.push(endMarker)
    }

    applyRouteData(map, segmentsRef.current)
    clearPreview(map)
    setRouteError(null)

    const bounds = seg.coordinates.reduce(
      (b, c) => b.extend(c),
      new mapboxgl.LngLatBounds(seg.coordinates[0], seg.coordinates[0]),
    )
    map.fitBounds(bounds, { padding: 60, duration: 800 })

    const canvas = map.getCanvas(); if (canvas) canvas.style.cursor = 'crosshair'
    onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [importedRoute, mapLoaded])

  // ── Reset ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (resetTrigger === 0) return
    const map = mapRef.current
    if (watchIdRef.current !== null) { navigator.geolocation.clearWatch(watchIdRef.current); watchIdRef.current = null }
    navMarkerRef.current?.remove();      navMarkerRef.current = null
    locationMarkerRef.current?.remove(); locationMarkerRef.current = null
    markersRef.current.forEach(m => m.remove()); markersRef.current = []
    waypointsRef.current = []; segmentsRef.current = []
    setRouteError(null)
    if (map) { applyRouteData(map, []); clearPreview(map); const c = map.getCanvas(); if (c) c.style.cursor = 'crosshair' }
    onRouteChangeRef.current([], [])
  }, [resetTrigger])

  // ── Locate ────────────────────────────────────────────────────────────────
  function handleLocate() {
    const map = mapRef.current
    if (!map) return
    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { longitude: lng, latitude: lat } = coords

        // Show or reposition the location dot
        if (locationMarkerRef.current) {
          locationMarkerRef.current.setLngLat([lng, lat])
        } else {
          locationMarkerRef.current = new mapboxgl.Marker({
            element: makeLocateDotEl(),
            anchor: 'center',
          })
            .setLngLat([lng, lat])
            .addTo(map)
        }

        map.flyTo({ center: [lng, lat], zoom: 16, duration: 900 })
        setIsLocating(false)
      },
      () => setIsLocating(false),
      { timeout: 8000, enableHighAccuracy: true },
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-full">
      {/* Push Mapbox built-in controls below the header pill (~60px) */}
      <style>{`.mapboxgl-ctrl-top-right { top: 110px !important; }`}</style>
      <div ref={containerRef} className="w-full h-full" />

      {/* Locate button — right side, below Mapbox nav controls */}
      <button
        onClick={handleLocate}
        disabled={isLocating}
        className="absolute right-2 top-[260px] w-10 h-10 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg flex items-center justify-center text-gray-500 hover:text-blue-600 hover:bg-blue-50 disabled:opacity-40 transition-colors z-10"
        title="현재 위치로 이동"
      >
        {isLocating
          ? <span className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          : <IconLocate />}
      </button>

      {/* Route calculation spinner */}
      {isRouting && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <div className="flex items-center gap-2 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg">
            <span className="w-3.5 h-3.5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-gray-600">경로 계산 중</span>
          </div>
        </div>
      )}

      {/* Error toast */}
      {routeError && (
        <div
          onClick={() => setRouteError(null)}
          className="absolute top-16 left-1/2 -translate-x-1/2 w-max max-w-[280px] bg-red-50 border border-red-200 text-red-600 text-xs font-medium px-4 py-2.5 rounded-xl shadow-md cursor-pointer z-20"
        >
          {routeError}
        </div>
      )}
    </div>
  )
}
