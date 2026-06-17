import type { SupabaseClient } from '@supabase/supabase-js'
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
  client: SupabaseClient,
  data: { title: string; waypoints: LngLat[]; segments: RouteSegment[]; loop_closed: boolean },
): Promise<Course> {
  const distance_m = Math.round(data.segments.reduce((s, seg) => s + seg.distance, 0))
  const duration_s = Math.round(data.segments.reduce((s, seg) => s + seg.duration, 0))

  const { data: course, error } = await client
    .from('courses')
    .insert({ title: data.title, distance_m, duration_s, waypoints: data.waypoints, segments: data.segments, loop_closed: data.loop_closed })
    .select()
    .single()

  if (error) throw error
  return course as Course
}

export async function listMyCourses(client: SupabaseClient): Promise<Course[]> {
  const { data, error } = await client
    .from('courses')
    .select('id, title, distance_m, duration_s, loop_closed, is_public, created_at, waypoints')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as Course[]
}

export async function deleteCourse(client: SupabaseClient, id: string): Promise<void> {
  const { error } = await client.from('courses').delete().eq('id', id)
  if (error) throw error
}
