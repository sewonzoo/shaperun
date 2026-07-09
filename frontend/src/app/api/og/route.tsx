import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { computeCoursePath, buildCoursePathSvgString } from '@/lib/coursePreview'
import type { RouteSegment } from '@/lib/api'

export const runtime = 'edge'

// 카카오톡 링크 공유 카드는 이미지를 2:1 비율로 크롭해 보여준다(권장 800x400,
// 최대 800x800). 캔버스를 정확히 2:1로 맞춰 크롭으로 인한 잘림을 원천 차단하고,
// 경로는 텍스트 영역을 뺀 나머지 "안전 영역"(PATH_W x PATH_H)에 bounding box
// 기준으로 동적 스케일링해 그린다 — 가로로 넓은 코스든 세로로 긴 코스든 항상
// 이 사각형 안에 여백을 두고 들어온다.
const OG_WIDTH = 1200
const OG_HEIGHT = 600
const PADDING = 56
const LOGO_H = 40
const GAP_TOP = 20
const GAP_BOTTOM = 20
const BOTTOM_H = 96
const PATH_W = OG_WIDTH - PADDING * 2
const PATH_H = OG_HEIGHT - PADDING * 2 - LOGO_H - GAP_TOP - GAP_BOTTOM - BOTTOM_H

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
    { width: OG_WIDTH, height: OG_HEIGHT },
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

  const geometry = computeCoursePath((course.segments ?? []) as RouteSegment[], PATH_W, PATH_H)
  const distKm = (course.distance_m / 1000).toFixed(1)
  const pathDataUri = geometry
    ? `data:image/svg+xml,${encodeURIComponent(
        buildCoursePathSvgString({ ...geometry, strokeWidth: geometry.strokeWidth * 1.5 }),
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
          padding: PADDING,
        }}
      >
        <div style={{ display: 'flex', height: LOGO_H, alignItems: 'center', fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>
          Shape<span style={{ color: '#378ADD' }}>Run</span>
        </div>
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: PATH_H,
            marginTop: GAP_TOP,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {pathDataUri ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pathDataUri} width={PATH_W} height={PATH_H} />
          ) : (
            <div style={{ display: 'flex', width: PATH_W, height: PATH_H, borderRadius: 24, backgroundColor: '#f3f4f6' }} />
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', height: BOTTOM_H, marginTop: GAP_BOTTOM, justifyContent: 'center' }}>
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
      width: OG_WIDTH,
      height: OG_HEIGHT,
      headers: {
        'Cache-Control': 'public, immutable, no-transform, max-age=86400',
      },
    },
  )
}
