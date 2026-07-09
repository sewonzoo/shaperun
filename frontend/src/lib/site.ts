export const SITE_URL = 'https://shaperun.kr'

// OG 이미지 URL에 코스의 생성 시각을 버전 파라미터로 붙인다. 코스 내용이
// 바뀌어도 URL 자체는 그대로라 Vercel/카카오 캐시를 완전히 무효화하진
// 못하지만, 최소한 이전에 캐시되지 않은 새 URL이라 최초 공유 시점의
// 크롤링에서는 캐시를 우회한다.
export function ogImageUrl(courseId: string, createdAt: string): string {
  const v = new Date(createdAt).getTime()
  return `${SITE_URL}/api/og?courseId=${courseId}&v=${v}`
}
