import type { RouteSegment } from './api'

export interface CoursePathGeometry {
  points: string
  size: number
  strokeWidth: number
}

export function computeCoursePath(segments: RouteSegment[], size = 120): CoursePathGeometry | null {
  const allCoords: [number, number][] = segments.flatMap((s, i) =>
    i === 0 ? s.coordinates : s.coordinates.slice(1)
  )

  if (allCoords.length < 2) return null

  const PAD = Math.round(size * 0.12)
  const draw = size - PAD * 2
  const sw = Math.max(1, size * 0.03)

  const lngs = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const lngRange = maxLng - minLng || 0.0001
  const latRange = maxLat - minLat || 0.0001

  // Uniform scale to maintain aspect ratio
  const scale = Math.min(draw / lngRange, draw / latRange)
  const lngDraw = lngRange * scale
  const latDraw = latRange * scale
  const ox = PAD + (draw - lngDraw) / 2
  const oy = PAD + (draw - latDraw) / 2

  const toX = (lng: number) => ox + ((lng - minLng) / lngRange) * lngDraw
  const toY = (lat: number) => size - oy - ((lat - minLat) / latRange) * latDraw

  const points = allCoords
    .map(([lng, lat]) => `${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`)
    .join(' ')

  return { points, size, strokeWidth: sw }
}

export function buildCoursePathSvgString(geometry: CoursePathGeometry, color = '#378ADD'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.size}" height="${geometry.size}" viewBox="0 0 ${geometry.size} ${geometry.size}"><polyline points="${geometry.points}" fill="none" stroke="${color}" stroke-width="${geometry.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
