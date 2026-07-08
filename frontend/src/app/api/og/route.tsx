import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { computeCoursePath } from '@/lib/coursePreview'
import type { RouteSegment } from '@/lib/api'

export const runtime = 'edge'

function fallbackImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f9fafb',
        }}
      >
        <div style={{ display: 'flex', fontSize: 64, fontWeight: 700, color: '#1a1a1a' }}>
          Shape<span style={{ color: '#378ADD' }}>Run</span>
        </div>
        <div style={{ display: 'flex', fontSize: 24, color: '#6b7280', marginTop: 16 }}>
          내 달리기 코스를 직접 그려보세요
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const courseId = searchParams.get('courseId')
  if (!courseId) return fallbackImage()

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const { data: course } = await supabase
    .from('courses')
    .select('title, distance_m, segments')
    .eq('id', courseId)
    .eq('is_public', true)
    .single()

  if (!course) return fallbackImage()

  const geometry = computeCoursePath((course.segments ?? []) as RouteSegment[], 400)
  const distKm = (course.distance_m / 1000).toFixed(1)
  const pathDataUri = geometry
    ? `data:image/svg+xml,${encodeURIComponent(
        `<svg xmlns="http://www.w3.org/2000/svg" width="${geometry.size}" height="${geometry.size}" viewBox="0 0 ${geometry.size} ${geometry.size}"><polyline points="${geometry.points}" fill="none" stroke="#378ADD" stroke-width="${geometry.strokeWidth * 1.5}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
      )}`
    : null

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          padding: '60px',
        }}
      >
        <div style={{ display: 'flex', fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>
          Shape<span style={{ color: '#378ADD' }}>Run</span>
        </div>
        <div style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {pathDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pathDataUri} width={400} height={400} />
          ) : (
            <div style={{ display: 'flex', width: 400, height: 400, borderRadius: 24, backgroundColor: '#f3f4f6' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 48, fontWeight: 700, color: '#111827' }}>
            {course.title}
          </div>
          <div style={{ display: 'flex', fontSize: 28, color: '#6b7280', marginTop: 8 }}>
            {distKm}km 러닝 코스
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        'Cache-Control': 'public, immutable, no-transform, max-age=86400',
      },
    },
  )
}
