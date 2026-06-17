import { createClient } from '@/lib/supabase/client'
import type { LngLat, RouteSegment } from './api'

export interface Course {
  id: string
  title: string
  distance_m: number
  duration_s: number
  waypoints: LngLat[]
  segments: RouteSegment[]
  loop_closed: boolean
  is_public: boolean
  creator_name: string | null
  download_count: number
  original_course_id: string | null
  original_user_name: string | null
  created_at: string
}

export async function saveCourse(data: {
  title: string
  waypoints: LngLat[]
  segments: RouteSegment[]
  loop_closed: boolean
  is_public?: boolean
}): Promise<Course> {
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  const distance_m = Math.round(data.segments.reduce((s, seg) => s + seg.distance, 0))
  const duration_s = Math.round(data.segments.reduce((s, seg) => s + seg.duration, 0))
  const creator_name = user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? null

  const { data: course, error } = await client
    .from('courses')
    .insert({
      user_id: user?.id,
      title: data.title,
      distance_m,
      duration_s,
      waypoints: data.waypoints,
      segments: data.segments,
      loop_closed: data.loop_closed,
      is_public: data.is_public ?? false,
      creator_name,
    })
    .select()
    .single()

  if (error) throw error
  return course as Course
}

export async function downloadCourse(courseId: string): Promise<Course> {
  const client = createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다')

  const { data: original, error: fetchError } = await client
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('is_public', true)
    .single()

  if (fetchError || !original) throw new Error('코스를 찾을 수 없습니다')

  const { data: copied, error: insertError } = await client
    .from('courses')
    .insert({
      user_id: user.id,
      title: original.title,
      distance_m: original.distance_m,
      duration_s: original.duration_s,
      waypoints: original.waypoints,
      segments: original.segments,
      loop_closed: original.loop_closed,
      is_public: false,
      creator_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? null,
      original_course_id: original.id,
      original_user_name: original.creator_name,
    })
    .select()
    .single()

  if (insertError) throw insertError

  await client.rpc('increment_download_count', { course_id: courseId })

  return copied as Course
}

export type SortType = 'latest' | 'popular'
export type PeriodType = '1d' | '1w' | '1m' | '1y'

export async function listPublicCourses(sort: SortType, period?: PeriodType): Promise<Course[]> {
  const client = createClient()

  let query = client
    .from('courses')
    .select('id, title, distance_m, duration_s, loop_closed, download_count, creator_name, created_at, waypoints')
    .eq('is_public', true)
    .is('original_course_id', null)

  if (sort === 'popular' && period) {
    const cutoff = new Date()
    if (period === '1d') cutoff.setDate(cutoff.getDate() - 1)
    else if (period === '1w') cutoff.setDate(cutoff.getDate() - 7)
    else if (period === '1m') cutoff.setMonth(cutoff.getMonth() - 1)
    else if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1)
    query = query.gte('created_at', cutoff.toISOString()).order('download_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query.limit(50)
  if (error) throw error
  return (data ?? []) as Course[]
}

export async function deleteCourse(id: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('courses').delete().eq('id', id)
  if (error) throw error
}
