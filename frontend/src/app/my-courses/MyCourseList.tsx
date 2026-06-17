'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { deleteCourse, toggleCoursePublic } from '@/lib/courses'
import type { Course } from '@/lib/courses'
import CoursePreviewSVG from '@/components/course/CoursePreviewSVG'

function formatDate(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1)  return '방금 전'
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}일 전`
  const mo = Math.floor(d / 30)
  if (mo < 12) return `${mo}달 전`
  return `${Math.floor(mo / 12)}년 전`
}

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6M9 6V4h6v2" />
    </svg>
  )
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
      <line x1="8" y1="2" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="22" />
    </svg>
  )
}

interface LngLat { lng: number; lat: number }

export default function MyCourseList({ courses: initial }: { courses: Course[] }) {
  const router = useRouter()
  const [courses, setCourses] = useState(initial)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 코스를 삭제할까요?')) return
    setDeleting(id)
    try {
      await deleteCourse(id)
      setCourses(cs => cs.filter(c => c.id !== id))
    } catch {
      alert('삭제에 실패했어요. 다시 시도해주세요.')
    } finally {
      setDeleting(null)
    }
  }

  const handleTogglePublic = async (id: string, current: boolean) => {
    setToggling(id)
    try {
      await toggleCoursePublic(id, !current)
      setCourses(cs => cs.map(c => c.id === id ? { ...c, is_public: !current } : c))
    } catch {
      alert('변경에 실패했어요. 다시 시도해주세요.')
    } finally {
      setToggling(null)
    }
  }

  const handleView = (course: Course) => {
    const waypoints = course.waypoints as unknown as LngLat[]
    const wpsStr = waypoints
      .map((w: LngLat) => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`)
      .join('_')
    const params = new URLSearchParams({ wps: wpsStr })
    if (course.loop_closed) params.set('loop', '1')
    router.push(`/map?${params}`)
  }

  if (courses.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-300 text-4xl mb-4">🗺️</p>
        <p className="text-[14px] text-gray-400">저장된 코스가 없어요</p>
        <p className="text-[12px] text-gray-300 mt-1">지도에서 코스를 그리고 저장해보세요</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {courses.map(course => (
        <div
          key={course.id}
          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
        >
          {/* Top: preview + info */}
          <div className="p-3 flex gap-3">
            <CoursePreviewSVG segments={course.segments ?? []} size={80} />

            <div className="flex-1 min-w-0 flex flex-col justify-between">
              {/* Title + badges */}
              <div className="flex items-start gap-1.5 min-w-0">
                <h3 className="text-[14px] font-bold text-gray-900 truncate flex-1 leading-snug">
                  {course.title}
                </h3>
                {course.loop_closed && (
                  <span className="shrink-0 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    루프
                  </span>
                )}
              </div>

              {/* Meta */}
              <p className="text-[11px] text-gray-400 mt-1 truncate">
                {formatDate(course.created_at)}
                {course.region_name && <> · {course.region_name}</>}
                {course.original_user_name && (
                  <> · <span className="text-blue-400">출처: {course.original_user_name}</span></>
                )}
              </p>

              {/* Stats + toggle */}
              <div className="flex items-center justify-between mt-2">
                <span className="text-[12px] font-semibold text-gray-700">
                  {formatDist(course.distance_m)}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[11px]" style={{ color: course.is_public ? '#3b82f6' : '#9ca3af' }}>
                    {course.is_public ? '공개' : '비공개'}
                  </span>
                  <button
                    onClick={() => handleTogglePublic(course.id, course.is_public)}
                    disabled={toggling === course.id}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-40 ${course.is_public ? 'bg-blue-500' : 'bg-gray-300'}`}
                  >
                    {toggling === course.id ? (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      </span>
                    ) : (
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${course.is_public ? 'translate-x-6' : 'translate-x-1'}`} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom: actions */}
          <div className="flex border-t border-gray-50">
            <button
              onClick={() => handleView(course)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <IconMap />
              지도에서 보기
            </button>
            <div className="w-px bg-gray-50" />
            <button
              onClick={() => handleDelete(course.id)}
              disabled={deleting === course.id}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-[12px] font-semibold text-red-400 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              {deleting === course.id ? (
                <span className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                <IconTrash />
              )}
              삭제
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
