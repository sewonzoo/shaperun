import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Course } from '@/lib/courses'
import MyCourseList from './MyCourseList'
import Logo from '@/components/ui/Logo'
import Link from 'next/link'

export default async function MyCoursesPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/?next=/my-courses')

  const name   = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? '러너'
  const avatar = user.user_metadata?.avatar_url as string | undefined

  const { data } = await supabase
    .from('courses')
    .select('id, title, distance_m, duration_s, loop_closed, is_public, creator_name, download_count, original_course_id, original_user_name, created_at, waypoints, segments')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const courses: Course[] = (data ?? []) as Course[]

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/map">
            <Logo width={110} height={33} />
          </Link>
          <div className="flex items-center gap-3">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt={name} className="w-7 h-7 rounded-full object-cover" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xs font-bold">
                {name[0].toUpperCase()}
              </div>
            )}
            <Link
              href="/feed"
              className="text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              피드
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <h1 className="text-xl font-bold text-gray-900 mb-1">내 코스</h1>
        <p className="text-[13px] text-gray-400 mb-6">
          {courses.length > 0 ? `${courses.length}개의 코스가 있어요` : '저장된 코스가 없어요'}
        </p>

        <Link
          href="/map"
          className="flex items-center justify-center gap-2 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-2xl transition-colors mb-6"
        >
          새 코스 그리기
        </Link>

        <MyCourseList courses={courses} />
      </div>
    </main>
  )
}
