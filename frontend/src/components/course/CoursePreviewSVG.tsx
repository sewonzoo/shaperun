import type { RouteSegment } from '@/lib/api'

interface Props {
  segments: RouteSegment[]
  size?: number
}

export default function CoursePreviewSVG({ segments, size = 120 }: Props) {
  const allCoords: [number, number][] = segments.flatMap((s, i) =>
    i === 0 ? s.coordinates : s.coordinates.slice(1)
  )

  const PAD = Math.round(size * 0.12)
  const draw = size - PAD * 2
  const sw = Math.max(1, size * 0.03)

  if (allCoords.length < 2) {
    return (
      <div
        style={{ width: size, height: size, flexShrink: 0 }}
        className="rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center"
      >
        <span className="text-gray-300 text-xs">—</span>
      </div>
    )
  }

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

  return (
    <div
      style={{ width: size, height: size, flexShrink: 0 }}
      className="rounded-2xl bg-white border border-gray-100 overflow-hidden"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polyline
          points={points}
          fill="none"
          stroke="#378ADD"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
