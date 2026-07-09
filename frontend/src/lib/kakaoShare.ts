import { SITE_URL, ogImageUrl } from './site'

export interface ShareCourseParams {
  courseId: string
  title: string
  distanceM: number
  createdAt: string
}

// 방금 저장된 코스는 /api/og가 콜드 상태라 카카오가 이미지를 가져오는 타이밍에
// 렌더링이 끝나지 않아 미리보기가 간헐적으로 비는 경우가 있다.
// 공유 다이얼로그를 열기 전에 한 번 미리 요청해 캐시를 워밍업한다.
// 성공/실패(타임아웃 포함) 모두 소요 시간을 콘솔에 남겨 콜드/웜 응답 속도를
// 비교할 수 있게 한다 — 로깅만 할 뿐 공유 흐름에는 영향을 주지 않는다.
async function warmOgImageCache(imageUrl: string, courseId: string, timeoutMs = 3000) {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  const start = performance.now()
  try {
    const res = await fetch(imageUrl, { cache: 'no-store', signal: controller.signal })
    const elapsedMs = Math.round(performance.now() - start)
    console.log('[kakaoShare] OG 이미지 워밍업 성공:', { courseId, elapsedMs, status: res.status })
  } catch (err) {
    const elapsedMs = Math.round(performance.now() - start)
    console.warn('[kakaoShare] OG 이미지 워밍업 실패:', { courseId, elapsedMs, error: String(err) })
    // 워밍업 실패/타임아웃이어도 공유 자체는 계속 진행한다
  } finally {
    clearTimeout(timeout)
  }
}

export async function shareCourse({ courseId, title, distanceM, createdAt }: ShareCourseParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kakao = (window as any).Kakao
  if (!kakao?.Share) {
    alert('카카오 SDK가 아직 로드 중입니다. 잠시 후 다시 시도해주세요.')
    return
  }

  const distKm = (distanceM / 1000).toFixed(1)
  const pageUrl = `${SITE_URL}/course/${courseId}`
  const imageUrl = ogImageUrl(courseId, createdAt)

  await warmOgImageCache(imageUrl, courseId)

  const payload = {
    objectType: 'feed' as const,
    content: {
      title,
      description: `${distKm}km 러닝 코스`,
      imageUrl,
      link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
    },
    buttons: [
      { title: '코스 보기', link: { mobileWebUrl: pageUrl, webUrl: pageUrl } },
      { title: '서비스 이용하기', link: { mobileWebUrl: SITE_URL, webUrl: SITE_URL } },
    ],
  }

  console.log('[kakaoShare] sendDefault payload:', JSON.stringify(payload, null, 2))

  kakao.Share.sendDefault(payload)
}
