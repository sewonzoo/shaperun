'use client'

import Script from 'next/script'

const APP_KEY = process.env.NEXT_PUBLIC_KAKAO_JS_KEY ?? '8804e7821ececb6d6a6f125112012b7a'

export default function KakaoSDKInit() {
  return (
    <Script
      src="https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js"
      strategy="afterInteractive"
      onLoad={() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const kakao = (window as any).Kakao
        if (kakao && !kakao.isInitialized()) {
          kakao.init(APP_KEY)
        }
      }}
    />
  )
}
