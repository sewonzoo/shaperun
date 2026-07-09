import { ImageResponse } from 'next/og'
import { createClient } from '@supabase/supabase-js'
import { computeCoursePath, buildCoursePathSvgString } from '@/lib/coursePreview'
import type { RouteSegment } from '@/lib/api'

export const runtime = 'edge'

// 카카오톡 Feed 템플릿은 content.imageUrl을 최대 800x800의 중앙 기준
// 정사각형으로 Center Crop해서 보여준다. 즉 1200x600 캔버스에서 실제로
// 항상 보이는 영역은 가운데 600x600(가로 300~900px)뿐이다. 경로 그림은
// 캔버스 전체 폭(PATH_W)에 걸쳐 여백을 두고 그려 잘려도 자연스러운
// 배경 장식으로 남기고, 로고/제목/설명 등 반드시 읽혀야 하는 텍스트는
// 전부 이 중앙 정사각형(SAFE_W) 안에 들어오도록 가로 중앙 정렬한다.
const OG_WIDTH = 1200
const OG_HEIGHT = 600
const SAFE_W = 600
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
        <div style={{ display: 'flex', width: '100%', height: LOGO_H, alignItems: 'center', justifyContent: 'center', fontSize: 32, fontWeight: 700, color: '#1a1a1a' }}>
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
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', height: BOTTOM_H, marginTop: GAP_BOTTOM, justifyContent: 'center' }}>
          <div style={{ display: 'flex', width: SAFE_W, justifyContent: 'center', fontSize: 44, fontWeight: 700, color: '#111827', textAlign: 'center' }}>
            {course.title}
          </div>
          <div style={{ display: 'flex', width: SAFE_W, justifyContent: 'center', fontSize: 26, color: '#6b7280', marginTop: 8, textAlign: 'center' }}>
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
