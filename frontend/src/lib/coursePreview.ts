import type { RouteSegment } from './api'

export interface CoursePathGeometry {
  points: string
  width: number
  height: number
  strokeWidth: number
}

// boxWidth/boxHeight는 경로가 들어갈 안전 영역의 크기다. 정사각형 미리보기는
// boxHeight를 생략해 기존처럼 사용하고, OG 이미지처럼 가로로 넓은 안전 영역이
// 필요한 곳은 둘 다 지정해 bounding box를 그 사각형에 맞춰 스케일링한다.
export function computeCoursePath(
  segments: RouteSegment[],
  boxWidth = 120,
  boxHeight: number = boxWidth,
  padRatio = 0.12,
): CoursePathGeometry | null {
  const allCoords: [number, number][] = segments.flatMap((s, i) =>
    i === 0 ? s.coordinates : s.coordinates.slice(1)
  )

  if (allCoords.length < 2) return null

  const padX = boxWidth * padRatio
  const padY = boxHeight * padRatio
  const drawW = boxWidth - padX * 2
  const drawH = boxHeight - padY * 2
  const sw = Math.max(1, Math.min(boxWidth, boxHeight) * 0.03)

  const lngs = allCoords.map(c => c[0])
  const lats = allCoords.map(c => c[1])
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs)
  const minLat = Math.min(...lats), maxLat = Math.max(...lats)
  const lngRange = maxLng - minLng || 0.0001
  const latRange = maxLat - minLat || 0.0001

  // Uniform scale to maintain aspect ratio, fit within the target box
  const scale = Math.min(drawW / lngRange, drawH / latRange)
  const lngDraw = lngRange * scale
  const latDraw = latRange * scale
  const ox = padX + (drawW - lngDraw) / 2
  const oy = padY + (drawH - latDraw) / 2

  const toX = (lng: number) => ox + ((lng - minLng) / lngRange) * lngDraw
  const toY = (lat: number) => boxHeight - oy - ((lat - minLat) / latRange) * latDraw

  const points = allCoords
    .map(([lng, lat]) => `${toX(lng).toFixed(1)},${toY(lat).toFixed(1)}`)
    .join(' ')

  return { points, width: boxWidth, height: boxHeight, strokeWidth: sw }
}

export function buildCoursePathSvgString(geometry: CoursePathGeometry, color = '#378ADD'): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.width}" height="${geometry.height}" viewBox="0 0 ${geometry.width} ${geometry.height}"><polyline points="${geometry.points}" fill="none" stroke="${color}" stroke-width="${geometry.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}
