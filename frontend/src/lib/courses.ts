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
  created_at: string
}

export async function saveCourse(
  data: { title: string; waypoints: LngLat[]; segments: RouteSegment[]; loop_closed: boolean },
): Promise<Course> {
  const client = createClient()
  const { data: { session } } = await client.auth.getSession()
  console.log('saveCourse session:', session ? session.user.id : null)
  const { data: { user } } = await client.auth.getUser()
  const distance_m = Math.round(data.segments.reduce((s, seg) => s + seg.distance, 0))
  const duration_s = Math.round(data.segments.reduce((s, seg) => s + seg.duration, 0))

  const insertPayload = { user_id: user?.id, title: data.title, distance_m, duration_s, waypoints: data.waypoints, segments: data.segments, loop_closed: data.loop_closed }
  console.log('insert payload:', JSON.stringify(insertPayload))
  const { data: course, error } = await client
    .from('courses')
    .insert(insertPayload)
    .select()
    .single()

  if (error) throw error
  return course as Course
}

export async function listMyCourses(): Promise<Course[]> {
  const client = createClient()
  const { data, error } = await client
    .from('courses')
    .select('id, title, distance_m, duration_s, loop_closed, is_public, created_at, waypoints')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Course[]
}

export async function deleteCourse(id: string): Promise<void> {
  const client = createClient()
  const { error } = await client.from('courses').delete().eq('id', id)
  if (error) throw error
}
