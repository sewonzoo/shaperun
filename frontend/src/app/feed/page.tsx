'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { listPublicCourses, downloadCourse } from '@/lib/courses'
import type { Course, SortType, PeriodType } from '@/lib/courses'
import Logo from '@/components/ui/Logo'
import CoursePreviewSVG from '@/components/course/CoursePreviewSVG'

function formatDist(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`
}

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

function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M12 3v13M7 12l5 5 5-5" /><path d="M3 19h18" />
    </svg>
  )
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  )
}

const RANK_CARD_CLASS = [
  'relative bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-yellow-400',
  'relative bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-gray-300',
  'relative bg-white rounded-2xl shadow-sm overflow-hidden border-2 border-amber-600',
] as const

function RankBadge({ idx }: { idx: 0 | 1 | 2 }) {
  if (idx === 0) return <span className="absolute top-2 left-2 z-20 bg-yellow-400 text-yellow-900 text-[13px] px-1.5 py-0.5 rounded-lg leading-none font-bold">👑</span>
  if (idx === 1) return <span className="absolute top-2 left-2 z-20 bg-gray-300 text-gray-600 text-[13px] px-1.5 py-0.5 rounded-lg leading-none font-bold">🥈</span>
  return <span className="absolute top-2 left-2 z-20 bg-amber-600 text-white text-[13px] px-1.5 py-0.5 rounded-lg leading-none font-bold">🥉</span>
}

const PERIODS: { value: PeriodType; label: string }[] = [
  { value: '1d', label: '오늘' },
  { value: '1w', label: '이번 주' },
  { value: '1m', label: '이번 달' },
  { value: '1y', label: '올해' },
]

export default function FeedPage() {
  const router = useRouter()
  const supabase = useRef(createClient()).current
  const [sort,   setSort]   = useState<SortType>('latest')
  const [period, setPeriod] = useState<PeriodType>('1w')
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)
  const [downloaded, setDownloaded] = useState<Set<string>>(new Set())

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setUserId(user.id)
    })
  }, [supabase])

  const fetchCourses = useCallback(async () => {
    setLoading(true)
    try {
      const data = await listPublicCourses(sort, sort === 'popular' ? period : undefined)
      setCourses(data)
    } catch {
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [sort, period])

  useEffect(() => { fetchCourses() }, [fetchCourses])

  const handleDownload = async (courseId: string) => {
    if (!userId) {
      router.push('/?next=/feed')
      return
    }
    setDownloading(courseId)
    try {
      await downloadCourse(courseId)
      setDownloaded(prev => { const next = new Set(Array.from(prev)); next.add(courseId); return next })
    } catch (e) {
      console.error('download failed', e)
    } finally {
      setDownloading(null)
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/map">
            <Logo width={110} height={33} />
          </Link>
          <div className="flex items-center gap-3">
            {userId ? (
              <Link
                href="/my-courses"
                className="text-[13px] font-semibold text-gray-600 hover:text-gray-900 transition-colors"
              >
                내 코스
              </Link>
            ) : (
              <Link
                href="/"
                className="text-[13px] font-semibold text-blue-600 hover:text-blue-700 transition-colors"
              >
                로그인
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-1">커뮤니티 피드</h1>
        <p className="text-[13px] text-gray-400 mb-5">다른 러너들의 코스를 구경하고 다운로드해보세요</p>

        {/* Sort tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-2xl p-1 mb-3">
          {(['latest', 'popular'] as const).map(s => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`flex-1 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                sort === s ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              {s === 'latest' ? '최신순' : '인기순'}
            </button>
          ))}
        </div>

        {/* Period selector (popular only) */}
        {sort === 'popular' && (
          <div className="flex gap-1.5 mb-5">
            {PERIODS.map(p => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-colors ${
                  period === p.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white border border-gray-200 text-gray-500 hover:border-blue-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        )}

        {/* Guest banner */}
        {!userId && (
          <div className="mb-5 bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center justify-between">
            <p className="text-[13px] text-blue-700 font-medium">로그인하면 코스를 다운로드할 수 있어요</p>
            <Link
              href="/?next=/feed"
              className="ml-3 shrink-0 text-[12px] font-bold text-blue-600 bg-white border border-blue-200 rounded-full px-3 py-1.5 hover:bg-blue-50 transition-colors"
            >
              로그인
            </Link>
          </div>
        )}

        {/* Course list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <span className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : courses.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-400 text-[14px]">아직 공개된 코스가 없어요</p>
            <p className="text-gray-300 text-[12px] mt-1">코스를 저장할 때 커뮤니티에 공개해보세요</p>
          </div>
        ) : (
          <div className="space-y-3">
            {courses.map((course, idx) => {
              const rankIdx = sort === 'popular' && idx < 3 ? idx as 0 | 1 | 2 : null
              return (
              <div
                key={course.id}
                className={rankIdx !== null ? RANK_CARD_CLASS[rankIdx] : 'relative bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-100'}
              >
                {rankIdx !== null && <RankBadge idx={rankIdx} />}
                <div className="p-3 flex gap-3">
                  {/* Route preview */}
                  <CoursePreviewSVG segments={course.segments ?? []} size={80} />

                  {/* Content */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    {/* Top: title + download */}
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-[14px] font-bold text-gray-900 truncate leading-snug">{course.title}</h3>
                      <button
                        onClick={() => handleDownload(course.id)}
                        disabled={downloading === course.id || downloaded.has(course.id)}
                        className={`shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-bold transition-colors ${
                          downloaded.has(course.id)
                            ? 'bg-emerald-50 text-emerald-600'
                            : 'bg-blue-50 text-blue-600 hover:bg-blue-100 disabled:opacity-50'
                        }`}
                      >
                        {downloading === course.id ? (
                          <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                        ) : downloaded.has(course.id) ? (
                          <IconCheck />
                        ) : (
                          <IconDownload />
                        )}
                        {downloaded.has(course.id) ? '저장됨' : '다운로드'}
                      </button>
                    </div>

                    {/* Meta */}
                    <p className="text-[11px] text-gray-400 mt-1 truncate">
                      {course.creator_name ?? '익명'}
                      {course.region_name && <> · {course.region_name}</>}
                      {' · '}{formatDate(course.created_at)}
                    </p>

                    {/* Stats */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[12px] font-semibold text-gray-700">
                        {formatDist(course.distance_m)}
                      </span>
                      {course.loop_closed && (
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                          루프
                        </span>
                      )}
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-gray-400">
                        <IconDownload />
                        {course.download_count}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* Draw CTA */}
        <div className="mt-10 text-center">
          <Link
            href="/map"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-2xl transition-colors"
          >
            내 코스 그리기
          </Link>
        </div>
      </div>
    </main>
  )
}
