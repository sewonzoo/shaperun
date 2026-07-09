import { createClient } from '@/lib/supabase/client'
import type { LngLat, RouteSegment } from './api'

export interface Course {
  id: string
  user_id?: string
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
  region_name: string | null
  created_at: string
}

export class OwnCourseDownloadError extends Error {
  constructor() {
    super('본인이 만든 코스는 다운로드할 수 없어요')
    this.name = 'OwnCourseDownloadError'
  }
}

export class AlreadyDownloadedError extends Error {
  constructor() {
    super('이미 다운로드한 코스예요')
    this.name = 'AlreadyDownloadedError'
  }
}

export async function getRegionName(lng: number, lat: number): Promise<string | null> {
  const key = process.env.NEXT_PUBLIC_KAKAO_REST_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://dapi.kakao.com/v2/local/geo/coord2regioncode.json?x=${lng}&y=${lat}`,
      { headers: { Authorization: `KakaoAK ${key}` } },
    )
    if (!res.ok) return null
    const json = await res.json()
    const doc = json.documents?.[0]
    if (!doc) return null
    const parts = [doc.region_2depth_name, doc.region_3depth_name].filter(Boolean)
    return parts.join(' ') || null
  } catch {
    return null
  }
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

  const firstWp = data.waypoints[0]
  const region_name = firstWp
    ? await getRegionName(firstWp.lng, firstWp.lat).catch(() => null)
    : null

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
      region_name,
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

  if (original.user_id === user.id) throw new OwnCourseDownloadError()

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
      region_name: original.region_name,
    })
    .select()
    .single()

  if (insertError) {
    if (insertError.code === '23505') throw new AlreadyDownloadedError()
    throw insertError
  }

  // 이중 안전장치: 자기 코스 다운로드는 위에서 이미 막히지만,
  // 혹시라도 여기까지 도달하더라도 자기 자신의 download_count는 올리지 않는다.
  if (original.user_id !== user.id) {
    await client.rpc('increment_download_count', { course_id: courseId })
  }

  return copied as Course
}

export type SortType = 'latest' | 'popular'
export type PeriodType = '1d' | '1w' | '1m' | '1y'

export async function listPublicCourses(sort: SortType, period?: PeriodType): Promise<Course[]> {
  const client = createClient()

  let query = client
    .from('courses')
    .select('id, user_id, title, distance_m, duration_s, loop_closed, download_count, creator_name, region_name, created_at, segments, waypoints')
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

export async function toggleCoursePublic(id: string, isPublic: boolean): Promise<void> {
  const client = createClient()
  const { error } = await client.from('courses').update({ is_public: isPublic }).eq('id', id)
  if (error) throw error
}
