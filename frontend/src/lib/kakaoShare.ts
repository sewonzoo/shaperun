import { SITE_URL } from './site'

export interface ShareCourseParams {
  courseId: string
  title: string
  distanceM: number
}

export function shareCourse({ courseId, title, distanceM }: ShareCourseParams) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const kakao = (window as any).Kakao
  if (!kakao?.Share) {
    alert('카카오 SDK가 아직 로드 중입니다. 잠시 후 다시 시도해주세요.')
    return
  }

  const distKm = (distanceM / 1000).toFixed(1)
  const pageUrl = `${SITE_URL}/course/${courseId}`
  const imageUrl = `${SITE_URL}/api/og?courseId=${courseId}`

  kakao.Share.sendDefault({
    objectType: 'feed',
    content: {
      title,
      description: `${distKm}km 러닝 코스`,
      imageUrl,
      link: { mobileWebUrl: pageUrl, webUrl: pageUrl },
    },
    buttons: [
      { title: '코스 보기', link: { mobileWebUrl: pageUrl, webUrl: pageUrl } },
    ],
  })
}
