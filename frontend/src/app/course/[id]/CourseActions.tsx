'use client'

import { useRouter } from 'next/navigation'
import { downloadGPX } from '@/lib/gpx'
import type { Course } from '@/lib/courses'

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-[17px] h-[17px]">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
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

interface Props {
  course: Course
}

export default function CourseActions({ course }: Props) {
  const router = useRouter()

  const handleView = () => {
    const waypoints = course.waypoints ?? []
    if (!waypoints.length) return
    const wpsStr = waypoints.map(w => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`).join('_')
    const params = new URLSearchParams({ wps: wpsStr })
    if (course.loop_closed) params.set('loop', '1')
    router.push(`/map?${params}`)
  }

  const handleDownload = () => {
    downloadGPX(course.segments ?? [])
  }

  return (
    <div className="flex border-t border-gray-50">
      <button
        onClick={handleView}
        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
      >
        <IconMap />
        지도에서 보기
      </button>
      <div className="w-px bg-gray-50" />
      <button
        onClick={handleDownload}
        className="flex-1 flex items-center justify-center gap-1.5 py-3.5 text-[13px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors"
      >
        <IconDownload />
        GPX 다운로드
      </button>
    </div>
  )
}
