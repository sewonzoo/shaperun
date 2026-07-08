'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { deleteCourse, toggleCoursePublic } from '@/lib/courses'
import type { Course } from '@/lib/courses'
import { shareCourse } from '@/lib/kakaoShare'
import CoursePreviewSVG from '@/components/course/CoursePreviewSVG'
import Link from 'next/link'

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

function IconShare() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.6" y1="10.5" x2="15.4" y2="6.5" />
      <line x1="8.6" y1="13.5" x2="15.4" y2="17.5" />
    </svg>
  )
}

function IconPencil() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

function IconX() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  )
}

interface LngLat { lng: number; lat: number }

interface Props {
  userId: string
  userName: string
  userAvatar?: string
  initialNickname: string | null
  originalCourses: Course[]
  downloadedCourses: Course[]
  totalDownloads: number
}

function CourseSection({
  title,
  accentClass,
  courses,
  emptyMessage,
  emptySubMessage,
  deleting,
  toggling,
  onDelete,
  onToggle,
  onView,
  onShare,
}: {
  title: string
  accentClass: string
  courses: Course[]
  emptyMessage: string
  emptySubMessage: string
  deleting: string | null
  toggling: string | null
  onDelete: (id: string) => void
  onToggle: (id: string, current: boolean) => void
  onView: (course: Course) => void
  onShare: (course: Course) => void
}) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-200">
        <span className={`w-1 h-5 rounded-full shrink-0 ${accentClass}`} />
        <h2 className="text-[15px] font-bold text-gray-800">{title}</h2>
        <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-bold">
          {courses.length}
        </span>
      </div>

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 py-10 text-center">
          <p className="text-[13px] text-gray-400">{emptyMessage}</p>
          <p className="text-[11px] text-gray-300 mt-1">{emptySubMessage}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {courses.map(course => (
            <div
              key={course.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
            >
              <div className="p-3 flex gap-3">
                <CoursePreviewSVG segments={course.segments ?? []} size={80} />

                <div className="flex-1 min-w-0 flex flex-col justify-between">
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

                  <p className="text-[11px] text-gray-400 mt-1 truncate">
                    {formatDate(course.created_at)}
                    {course.region_name && <> · {course.region_name}</>}
                    {course.original_user_name && (
                      <> · <span className="text-blue-400">출처: {course.original_user_name}</span></>
                    )}
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <span className="text-[12px] font-semibold text-gray-700">
                      {formatDist(course.distance_m)}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px]" style={{ color: course.is_public ? '#3b82f6' : '#9ca3af' }}>
                        {course.is_public ? '공개' : '비공개'}
                      </span>
                      <button
                        onClick={() => onToggle(course.id, course.is_public)}
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

              <div className="flex border-t border-gray-50">
                <button
                  onClick={() => onView(course)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <IconMap />
                  지도에서 보기
                </button>
                <div className="w-px bg-gray-50" />
                <button
                  onClick={() => onShare(course)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <IconShare />
                  공유
                </button>
                <div className="w-px bg-gray-50" />
                <button
                  onClick={() => onDelete(course.id)}
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
      )}
    </section>
  )
}

export default function MyCourseList({
  userId,
  userName,
  userAvatar,
  initialNickname,
  originalCourses: initialOriginal,
  downloadedCourses: initialDownloaded,
  totalDownloads: initialTotalDownloads,
}: Props) {
  const router = useRouter()
  const supabase = useRef(createClient()).current

  const [nickname,     setNickname]     = useState(initialNickname ?? userName)
  const [editNickname, setEditNickname] = useState(initialNickname ?? userName)
  const [isEditing,    setIsEditing]    = useState(false)
  const [saving,       setSaving]       = useState(false)

  const [originalCourses,   setOriginalCourses]   = useState(initialOriginal)
  const [downloadedCourses, setDownloadedCourses] = useState(initialDownloaded)
  const [totalDownloads,    setTotalDownloads]     = useState(initialTotalDownloads)
  const [deleting,          setDeleting]           = useState<string | null>(null)
  const [toggling,          setToggling]           = useState<string | null>(null)

  const handleSaveNickname = async () => {
    const trimmed = editNickname.trim()
    if (!trimmed) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(
          { user_id: userId, nickname: trimmed, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        )
      if (!error) {
        setNickname(trimmed)
        setIsEditing(false)
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCancelEdit = () => {
    setEditNickname(nickname)
    setIsEditing(false)
  }

  const handleDelete = async (id: string) => {
    if (!window.confirm('이 코스를 삭제할까요?')) return
    setDeleting(id)
    try {
      await deleteCourse(id)
      const inOriginal = originalCourses.find(c => c.id === id)
      if (inOriginal) {
        setOriginalCourses(cs => cs.filter(c => c.id !== id))
        setTotalDownloads(t => t - (inOriginal.download_count ?? 0))
      } else {
        setDownloadedCourses(cs => cs.filter(c => c.id !== id))
      }
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
      const updater = (cs: Course[]) => cs.map(c => c.id === id ? { ...c, is_public: !current } : c)
      if (originalCourses.find(c => c.id === id)) setOriginalCourses(updater)
      else setDownloadedCourses(updater)
    } catch {
      alert('변경에 실패했어요. 다시 시도해주세요.')
    } finally {
      setToggling(null)
    }
  }

  const handleView = (course: Course) => {
    const waypoints = course.waypoints as unknown as LngLat[]
    if (!waypoints?.length) return
    const wpsStr = waypoints.map(w => `${w.lng.toFixed(6)},${w.lat.toFixed(6)}`).join('_')
    const params = new URLSearchParams({ wps: wpsStr })
    if (course.loop_closed) params.set('loop', '1')
    router.push(`/map?${params}`)
  }

  const handleShare = (course: Course) => {
    if (!course.is_public) {
      alert('공유하려면 먼저 코스를 공개로 설정해주세요')
      return
    }
    shareCourse({ courseId: course.id, title: course.title, distanceM: course.distance_m })
  }

  return (
    <div className="space-y-8">

      {/* Profile card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">

        {/* Avatar + nickname */}
        <div className="flex items-center gap-3 mb-4">
          {userAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={userAvatar} alt={nickname} className="w-12 h-12 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg shrink-0">
              {nickname[0]?.toUpperCase() ?? '?'}
            </div>
          )}

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <div className="flex items-center gap-2">
                <input
                  value={editNickname}
                  onChange={e => setEditNickname(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSaveNickname()
                    if (e.key === 'Escape') handleCancelEdit()
                  }}
                  className="flex-1 min-w-0 text-[15px] font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  maxLength={20}
                  autoFocus
                />
                <button
                  onClick={handleSaveNickname}
                  disabled={saving || !editNickname.trim()}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg text-[11px] font-bold disabled:opacity-50"
                >
                  {saving
                    ? <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    : <IconCheck />
                  }
                  저장
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-[11px] font-bold"
                >
                  <IconX />
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-bold text-gray-900 truncate">{nickname}</span>
                <button
                  onClick={() => { setEditNickname(nickname); setIsEditing(true) }}
                  className="shrink-0 flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <IconPencil />
                  수정
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-[22px] font-bold text-gray-900 leading-none">{originalCourses.length}</p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">내 코스</p>
          </div>
          <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
            <p className="text-[22px] font-bold text-gray-900 leading-none">{totalDownloads}</p>
            <p className="text-[11px] text-gray-400 mt-1 font-medium">총 다운로드</p>
          </div>
        </div>
      </div>

      {/* New course CTA */}
      <Link
        href="/map"
        className="flex items-center justify-center gap-2 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-2xl transition-colors"
      >
        새 코스 그리기
      </Link>

      {/* 내가 만든 코스 */}
      <CourseSection
        title="내가 만든 코스"
        accentClass="bg-blue-500"
        courses={originalCourses}
        emptyMessage="아직 만든 코스가 없어요"
        emptySubMessage="지도에서 코스를 그려보세요"
        deleting={deleting}
        toggling={toggling}
        onDelete={handleDelete}
        onToggle={handleTogglePublic}
        onView={handleView}
        onShare={handleShare}
      />

      <hr className="border-gray-200" />

      {/* 다운로드한 코스 */}
      <CourseSection
        title="다운로드한 코스"
        accentClass="bg-emerald-500"
        courses={downloadedCourses}
        emptyMessage="다운로드한 코스가 없어요"
        emptySubMessage="피드에서 다른 러너의 코스를 저장해보세요"
        deleting={deleting}
        toggling={toggling}
        onDelete={handleDelete}
        onToggle={handleTogglePublic}
        onView={handleView}
        onShare={handleShare}
      />

    </div>
  )
}
