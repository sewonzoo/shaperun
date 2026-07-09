import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Course, DownloadedCourse } from '@/lib/courses'
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
  const originalCourses     = courses.filter(c => !c.original_course_id)
  const downloadedCoursesRaw = courses.filter(c => !!c.original_course_id)
  const totalDownloads      = originalCourses.reduce((s, c) => s + (c.download_count ?? 0), 0)

  // 다운로드한 사본마다 원본이 아직 존재하는지 / 공개 상태인지 확인해서
  // 공유 버튼의 가능 여부를 결정한다. 사본 목록 로드 시 한 번에 조회한다.
  const originalIds = Array.from(new Set(downloadedCoursesRaw.map(c => c.original_course_id!)))
  const originalsById = new Map<string, { id: string; title: string; distance_m: number; created_at: string; is_public: boolean }>()
  if (originalIds.length > 0) {
    const { data: originals } = await supabase
      .from('courses')
      .select('id, title, distance_m, created_at, is_public')
      .in('id', originalIds)
    for (const o of originals ?? []) originalsById.set(o.id, o)
  }

  const downloadedCourses: DownloadedCourse[] = downloadedCoursesRaw.map(c => {
    const original = originalsById.get(c.original_course_id!)
    if (!original) return { ...c, originalStatus: 'deleted', original: null }
    if (!original.is_public) return { ...c, originalStatus: 'private', original: null }
    return {
      ...c,
      originalStatus: 'available',
      original: { id: original.id, title: original.title, distance_m: original.distance_m, created_at: original.created_at },
    }
  })

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
