'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteCourse, type Course } from '@/lib/courses'

function fmtDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}
function fmtDur(s: number) {
  const m = Math.round(s / 60)
  return m >= 60 ? `${Math.floor(m / 60)}시간 ${m % 60}분` : `${m}분`
}
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M9 20l-5.447-2.724A1 1 0 0 1 3 16.382V5.618a1 1 0 0 1 1.447-.894L9 7M9 20l6-3M9 20V7m6 13l5.447-2.724A1 1 0 0 0 21 16.382V5.618a1 1 0 0 0-1.447-.894L15 7m0 13V7M9 7l6-3" />
    </svg>
  )
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  )
}

function EmptyState() {
  return (
    <div className="bg-white rounded-3xl border border-gray-100 py-16 flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <IconMap />
      </div>
      <p className="text-[15px] font-semibold text-gray-700">저장된 코스가 없어요</p>
      <p className="text-[13px] text-gray-400 mt-1.5 leading-relaxed">
        지도에서 경로를 그리고 저장해보세요
      </p>
    </div>
  )
}

export default function CourseList({ initialCourses }: { initialCourses: Course[] }) {
  const [courses, setCourses] = useState(initialCourses)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const router = useRouter()

  const handleOpen = (course: Course) => {
    const wpsStr = course.waypoints.map(w => `${(w.lng).toFixed(6)},${(w.lat).toFixed(6)}`).join('_')
    const params = new URLSearchParams({ wps: wpsStr })
    if (course.loop_closed) params.set('loop', '1')
    router.push(`/?${params}`)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('이 코스를 삭제할까요?')) return
    setDeletingId(id)
    try {
      await deleteCourse(createClient(), id)
      setCourses(c => c.filter(x => x.id !== id))
    } catch {
      alert('삭제에 실패했습니다.')
    } finally {
      setDeletingId(null)
    }
  }

  if (courses.length === 0) return <EmptyState />

  return (
    <div className="space-y-3">
      {courses.map(course => (
        <div
          key={course.id}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
        >
          <button
            onClick={() => handleOpen(course)}
            className="w-full text-left px-5 pt-4 pb-3 hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-bold text-gray-900 truncate">{course.title}</p>
                <p className="text-[12px] text-gray-400 mt-0.5">{fmtDate(course.created_at)}</p>
              </div>
              {course.loop_closed && (
                <span className="shrink-0 flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  루프
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <div>
                <span className="text-[18px] font-bold text-gray-900">{fmtDist(course.distance_m)}</span>
              </div>
              <div className="w-px h-4 bg-gray-100" />
              <div>
                <span className="text-[18px] font-bold text-gray-900">{fmtDur(course.duration_s)}</span>
              </div>
            </div>
          </button>

          <div className="border-t border-gray-100 flex divide-x divide-gray-100">
            <button
              onClick={() => handleOpen(course)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-blue-500 hover:bg-blue-50 transition-colors"
            >
              <IconMap />
              지도에서 보기
            </button>
            <button
              onClick={() => handleDelete(course.id)}
              disabled={deletingId === course.id}
              className="flex items-center justify-center gap-1.5 px-5 py-2.5 text-[12px] font-semibold text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40"
            >
              <IconTrash />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
