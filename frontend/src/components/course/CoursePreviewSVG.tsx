import type { RouteSegment } from '@/lib/api'
import { computeCoursePath } from '@/lib/coursePreview'

interface Props {
  segments: RouteSegment[]
  size?: number
}

export default function CoursePreviewSVG({ segments, size = 120 }: Props) {
  const geometry = computeCoursePath(segments, size)

  if (!geometry) {
    return (
      <div
        style={{ width: size, height: size, flexShrink: 0 }}
        className="rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center"
      >
        <span className="text-gray-300 text-xs">—</span>
      </div>
    )
  }

  return (
    <div
      style={{ width: size, height: size, flexShrink: 0 }}
      className="rounded-2xl bg-white border border-gray-100 overflow-hidden"
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <polyline
          points={geometry.points}
          fill="none"
          stroke="#378ADD"
          strokeWidth={geometry.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
