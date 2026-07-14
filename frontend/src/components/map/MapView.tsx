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

function makeWaypointEl(index: number, allowDrag: boolean = true): HTMLElement {
  const isStart = index === 0
  const el = document.createElement('div')
  el.style.cssText = [
    `width:${isStart ? 22 : 14}px`, `height:${isStart ? 22 : 14}px`,
    `background:${isStart ? '#16a34a' : '#2563eb'}`,
    'border:3px solid #fff', 'border-radius:50%',
    'box-shadow:0 2px 8px rgba(0,0,0,0.35)',
    'display:flex', 'align-items:center', 'justify-content:center',
    'font-size:7px', 'font-weight:700', 'color:#fff',
    `cursor:${allowDrag ? 'grab' : 'default'}`,
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

  // 드래그 종료 직후 mapbox가 합성 클릭을 발생시켜 같은 자리에 새 웨이포인트가
  // 추가되는 걸 막기 위한 타임스탬프 가드
  const suppressClickUntilRef = useRef(0)

  // GPX로 가져온 코스의 시작/끝 마커는 영구히 드래그 불가 — markersRef 자체를
  // { marker, allowDrag } 형태로 바꾸면 remove/slice/at(-1) 등 기존 코드를
  // 전부 건드려야 해서, 대신 "드래그 불가 마커" 집합만 별도로 추적한다.
  const nonDraggableMarkersRef = useRef<WeakSet<mapboxgl.Marker>>(new WeakSet())

  // 라우팅 중이거나 네비게이션 중일 땐 마커를 드래그할 수 없게 한다. Marker의
  // 'dragstart' 이벤트는 취소 가능한 DOM 이벤트가 아니라(e.preventDefault 없음)
  // draggable 자체를 꺼서 드래그가 시작되지 않도록 막는 게 유일하게 확실한 방법이다.
  // (가져온 코스의 마커는 애초에 드래그 리스너가 없으므로 여기서 건드리지 않는다.)
  useEffect(() => {
    const draggable = !isNavigating && !isRouting
    markersRef.current.forEach(m => {
      if (nonDraggableMarkersRef.current.has(m)) return
      m.setDraggable(draggable)
    })
  }, [isNavigating, isRouting])

  // 웨이포인트 마커 생성 + 드래그로 위치 수정 배선. 드래그 중엔 인접 웨이포인트와
  // 잇는 직선 프리뷰만 그리고, 실제 재라우팅은 dragend에서 인접 구간만 골라 수행한다.
  // allowDrag: false면 애초에 드래그 리스너를 붙이지 않는다 — GPX로 가져온 코스는
  // 시작/끝점 사이에 원본 좌표 수백 개가 세그먼트 1개로 들어있어서, 드래그로 그
  // 세그먼트를 재라우팅하면 원본 경로 모양이 통째로 도로 스냅 경로로 대체돼버린다.
  function createWaypointMarker(map: mapboxgl.Map, index: number, lngLat: LngLat, allowDrag: boolean = true): mapboxgl.Marker {
    const marker = new mapboxgl.Marker({
      element: makeWaypointEl(index, allowDrag),
      draggable: allowDrag && !isRoutingRef.current && !isNavigatingRef.current,
    })
      .setLngLat([lngLat.lng, lngLat.lat])
      .addTo(map)

    if (!allowDrag) {
      nonDraggableMarkersRef.current.add(marker)
      return marker
    }

    let dragOrigin: LngLat = lngLat

    marker.on('dragstart', () => {
      if (isRoutingRef.current || isNavigatingRef.current) return
      const idx = markersRef.current.indexOf(marker)
      dragOrigin = waypointsRef.current[idx] ?? lngLat
    })

    marker.on('drag', () => {
      if (isRoutingRef.current || isNavigatingRef.current) return
      const map2 = mapRef.current
      if (!map2) return

      const idx = markersRef.current.indexOf(marker)
      const wps = waypointsRef.current
      const loop = isLoopClosed(wps, segmentsRef.current)
      const cur = marker.getLngLat()

      const left  = idx > 0 ? wps[idx - 1] : (loop ? wps.at(-1) : undefined)
      const right = idx < wps.length - 1 ? wps[idx + 1] : (loop ? wps[0] : undefined)

      const coords: [number, number][] = []
      if (left) coords.push([left.lng, left.lat])
      coords.push([cur.lng, cur.lat])
      if (right) coords.push([right.lng, right.lat])

      if (coords.length >= 2) {
        const previewSrc = map2.getSource('preview') as mapboxgl.GeoJSONSource | undefined
        previewSrc?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: coords } })
      }
    })

    marker.on('dragend', () => {
      const map2 = mapRef.current
      if (map2) clearPreview(map2)
      suppressClickUntilRef.current = Date.now() + 300

      const idx = markersRef.current.indexOf(marker)
      if (idx === -1) return

      if (isRoutingRef.current || isNavigatingRef.current) {
        marker.setLngLat([dragOrigin.lng, dragOrigin.lat])
        return
      }

      const cur = marker.getLngLat()
      const newPos: LngLat = { lng: cur.lng, lat: cur.lat }
      if (newPos.lng === dragOrigin.lng && newPos.lat === dragOrigin.lat) return

      const wps = waypointsRef.current
      const segs = segmentsRef.current
      const loop = isLoopClosed(wps, segs)

      const newWps = [...wps]
      newWps[idx] = newPos

      const leftSegIdx  = idx > 0 ? idx - 1 : (loop ? segs.length - 1 : undefined)
      const rightSegIdx = idx < wps.length - 1 ? idx : (loop && idx === wps.length - 1 ? segs.length - 1 : undefined)
      const segIndices = Array.from(new Set(
        [leftSegIdx, rightSegIdx].filter((i): i is number => i !== undefined),
      ))

      if (segIndices.length === 0) {
        // 아직 인접 구간이 없는 (연결 안 된) 단독 웨이포인트 — 위치만 갱신
        waypointsRef.current = newWps
        onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
        return
      }

      isRoutingRef.current = true
      setIsRouting(true)
      setRouteError(null)

      Promise.all(segIndices.map(async si => {
        const from = newWps[si]
        const to = newWps[(si + 1) % newWps.length]
        const seg = await getWalkingRoute(from, to)
        return { si, seg }
      }))
        .then(results => {
          const newSegs = [...segs]
          results.forEach(({ si, seg }) => { newSegs[si] = seg })
          waypointsRef.current = newWps
          segmentsRef.current = newSegs
          marker.setLngLat([newPos.lng, newPos.lat])
          if (map2) applyRouteData(map2, segmentsRef.current)
          onRouteChangeRef.current([...waypointsRef.current], [...segmentsRef.current])
        })
        .catch(() => {
          marker.setLngLat([dragOrigin.lng, dragOrigin.lat])
          setRouteError('이 구간의 도보 경로를 찾을 수 없습니다.')
        })
        .finally(() => {
          isRoutingRef.current = false
          setIsRouting(false)
        })
    })

    return marker
  }

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
      if (Date.now() < suppressClickUntilRef.current) return
      const wps = waypointsRef.current
      const segs = segmentsRef.current
      if (isRoutingRef.current || isLoopClosed(wps, segs) || isNavigatingRef.current) return
      setRouteError(null)

      const lngLat: LngLat = { lng: e.lngLat.lng, lat: e.lngLat.lat }
      const prev = wps.at(-1)

      const marker = createWaypointMarker(map, wps.length, lngLat)
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
          const marker = createWaypointMarker(map, i, lngLat)
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

    const startMarker = createWaypointMarker(map, 0, first, false)
    markersRef.current.push(startMarker)
    if (!isLoop) {
      const endMarker = createWaypointMarker(map, 1, last, false)
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
