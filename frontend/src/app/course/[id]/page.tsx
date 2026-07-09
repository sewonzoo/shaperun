import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import type { Course } from '@/lib/courses'
import { SITE_URL, ogImageUrl } from '@/lib/site'
import CoursePreviewSVG from '@/components/course/CoursePreviewSVG'
import Logo from '@/components/ui/Logo'
import CourseActions from './CourseActions'

interface Props {
  params: { id: string }
}

async function getCourse(id: string): Promise<Course | null> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('courses')
    .select('id, title, distance_m, duration_s, loop_closed, is_public, creator_name, region_name, waypoints, segments, created_at')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as Course
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const course = await getCourse(params.id)

  if (!course || !course.is_public) {
    return { title: '비공개 코스 - ShapeRun' }
  }

  const distKm = (course.distance_m / 1000).toFixed(1)
  const description = `${distKm}km 러닝 코스`
  const pageUrl = `${SITE_URL}/course/${course.id}`
  const imageUrl = ogImageUrl(course.id, course.created_at)

  return {
    title: `${course.title} - ShapeRun`,
    description,
    openGraph: {
      title: course.title,
      description,
      images: [imageUrl],
      url: pageUrl,
      type: 'website',
    },
  }
}

export default async function CoursePage({ params }: Props) {
  const course = await getCourse(params.id)

  if (!course) notFound()

  if (!course.is_public) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-[15px] font-bold text-gray-700">비공개 코스입니다</p>
          <p className="text-[13px] text-gray-400 mt-1">코스 작성자가 공개로 전환하면 볼 수 있어요</p>
          <Link href="/map" className="inline-block mt-6 text-[13px] font-semibold text-blue-600">
            ShapeRun 홈으로
          </Link>
        </div>
      </main>
    )
  }

  const distKm = (course.distance_m / 1000).toFixed(1)

  return (
    <main className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center">
          <Link href="/map">
            <Logo width={110} height={33} />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 flex flex-col items-center text-center gap-4">
            <CoursePreviewSVG segments={course.segments ?? []} size={160} />
            <div>
              <h1 className="text-[18px] font-bold text-gray-900">{course.title}</h1>
              <p className="text-[13px] text-gray-400 mt-1">
                {distKm}km
                {course.region_name && <> · {course.region_name}</>}
                {course.creator_name && <> · {course.creator_name}</>}
              </p>
            </div>
          </div>

          <CourseActions course={course} />
        </div>
      </div>
    </main>
  )
}
