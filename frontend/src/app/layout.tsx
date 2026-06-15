import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ShapeRun',
  description: '달리기 코스를 원하는 모양으로',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans">{children}</body>
    </html>
  )
}
