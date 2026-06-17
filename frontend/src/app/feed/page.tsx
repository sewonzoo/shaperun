import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import type { Course } from '@/lib/courses'
import LogoutButton from './LogoutButton'
import CourseList from './CourseList'

export default async function FeedPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const name   = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? '러너'
  const avatar = user.user_metadata?.avatar_url as string | undefined

  const { data } = await supabase
    .from('courses')
    .select('id, title, distance_m, duration_s, loop_closed, is_public, created_at, waypoints')
    .order('created_at', { ascending: false })
    .returns<Course[]>()
  const courses: Course[] = data ?? []

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-base font-bold tracking-tight text-gray-900">ShapeRun</span>
          </div>
          <div className="flex items-center gap-3">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} className="w-8 h-8 rounded-full object-cover" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                {name[0].toUpperCase()}
              </div>
            )}
            <LogoutButton />
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="max-w-lg mx-auto px-4 py-8">

        {/* Welcome */}
        <div className="mb-6">
          <h1 className="text-xl font-bold text-gray-900">
            안녕하세요, {name}님!
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {courses.length > 0 ? `${courses.length}개의 코스가 저장됐어요` : '오늘도 달려볼까요?'}
          </p>
        </div>

        {/* CTA */}
        <Link
          href="/"
          className="flex items-center justify-center gap-2 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-2xl transition-colors mb-8"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
            <path d="M12 5v14M5 12l7-7 7 7" />
          </svg>
          새 코스 그리기
        </Link>

        {/* Course list */}
        <CourseList initialCourses={courses} />
      </div>
    </main>
  )
}
