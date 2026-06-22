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

  const [{ data: coursesData }, { data: profile }] = await Promise.all([
    supabase
      .from('courses')
      .select('id, title, distance_m, duration_s, loop_closed, is_public, creator_name, download_count, original_course_id, original_user_name, region_name, created_at, waypoints, segments')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('profiles')
      .select('nickname')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const courses: Course[] = (coursesData ?? []) as Course[]
  const originalCourses   = courses.filter(c => !c.original_course_id)
  const downloadedCourses = courses.filter(c => !!c.original_course_id)
  const totalDownloads    = originalCourses.reduce((s, c) => s + (c.download_count ?? 0), 0)

  return (
    <main className="min-h-screen bg-gray-50">

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/map">
            <Logo width={110} height={33} />
          </Link>
          <Link
            href="/feed"
            className="text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            피드
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">
        <MyCourseList
          userId={user.id}
          userName={name}
          userAvatar={avatar}
          initialNickname={profile?.nickname ?? null}
          originalCourses={originalCourses}
          downloadedCourses={downloadedCourses}
          totalDownloads={totalDownloads}
        />
      </div>
    </main>
  )
}
