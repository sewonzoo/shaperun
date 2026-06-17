import type { Metadata } from 'next'
import './globals.css'
import KakaoSDKInit from '@/components/ui/KakaoSDKInit'

export const metadata: Metadata = {
  title: 'ShapeRun',
  description: '내 달리기 코스를 직접 그려보세요',
  openGraph: {
    title: 'ShapeRun',
    description: '내 달리기 코스를 직접 그려보세요',
    images: ['https://shaperun.vercel.app/icon.svg'],
    url: 'https://shaperun.vercel.app',
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
