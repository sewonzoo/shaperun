import type { Metadata } from 'next'
import './globals.css'
import KakaoSDKInit from '@/components/ui/KakaoSDKInit'

export const metadata: Metadata = {
  title: 'ShapeRun',
  description: '내 달리기 코스를 직접 그려보세요',
  openGraph: {
    title: 'ShapeRun - 내 달리기 코스를 직접 그려보세요',
    description: '원하는 코스를 지도에 그리고 GPX로 내보내 가민 워치에서 바로 사용하세요',
    images: ['https://shaperun.kr/og-image.png'],
    url: 'https://shaperun.kr',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <KakaoSDKInit />
        {children}
      </body>
    </html>
  )
}
