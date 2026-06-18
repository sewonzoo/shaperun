'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/ui/Logo'

type Tab = 'kakao' | 'garmin' | 'galaxy'
type GarminSub = 'pc' | 'mobile'

const KAKAO_STEPS = [
  { n: 1, text: 'GPX 다운로드', img: '/guide/kakao-1.png' },
  { n: 2, text: '파일 열기', img: '/guide/kakao-2.png' },
  { n: 3, text: '카카오맵 자동실행', img: '/guide/kakao-3.png' },
  { n: 4, text: '주행시작', img: '/guide/kakao-4.png' },
]

const GARMIN_PC_STEPS = [
  { n: 1, text: 'ShapeRun에서 GPX 다운로드', img: '/guide/garmin-pc-1.png' },
  { n: 2, text: 'Garmin Connect 웹사이트(connect.garmin.com) 접속', img: '/guide/garmin-pc-2.png' },
  { n: 3, text: '트레이닝 → 코스 → 코스 가져오기 → GPX 파일 업로드', img: '/guide/garmin-pc-3.png' },
  { n: 4, text: '업로드한 코스에서 "기기로 보내기" 클릭', img: '/guide/garmin-pc-4.png' },
  { n: 5, text: '워치에서 코스 선택 후 운동 시작', img: '/guide/garmin-pc-5.png' },
]

const GARMIN_MOBILE_STEPS = [
  { n: 1, text: 'ShapeRun에서 GPX 다운로드', img: '/guide/garmin-mobile-1.png' },
  { n: 2, text: 'Garmin Connect 앱 실행', img: '/guide/garmin-mobile-2.png' },
  { n: 3, text: '코스 메뉴에서 GPX 가져오기', img: '/guide/garmin-mobile-3.png' },
  { n: 4, text: '워치로 코스 전송', img: '/guide/garmin-mobile-4.png' },
  { n: 5, text: '워치에서 운동 시작', img: '/guide/garmin-mobile-5.png' },
]

const GALAXY_STEPS = [
  { n: 1, text: 'GPX 다운로드', img: '/guide/galaxy-1.png' },
  { n: 2, text: '삼성 헬스 실행', img: '/guide/galaxy-2.png' },
  { n: 3, text: '운동 → 자전거타기 선택', img: '/guide/galaxy-3.png' },
  { n: 4, text: '점 3개 → 경로 → 가져오기', img: '/guide/galaxy-4.png' },
  { n: 5, text: 'GPX 파일 선택', img: '/guide/galaxy-5.png' },
  { n: 6, text: '라이딩 시작', img: '/guide/galaxy-6.png' },
]

function StepCard({ n, text, img }: { n: number; text: string; img: string }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="shrink-0 w-7 h-7 rounded-full bg-blue-600 text-white text-[12px] font-bold flex items-center justify-center">
          {n}
        </span>
        <p className="text-[14px] font-semibold text-gray-800">{text}</p>
      </div>
      <ImageSlot src={img} alt={`step ${n}`} />
    </div>
  )
}

function ImageSlot({ src, alt }: { src: string; alt: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="w-full h-44 bg-gray-100 rounded-2xl flex items-center justify-center border border-dashed border-gray-200">
        <span className="text-[12px] text-gray-400">이미지 준비 중</span>
      </div>
    )
  }

  return (
    <div className="w-full h-44 bg-gray-100 rounded-2xl overflow-hidden relative">
      <Image
        src={src}
        alt={alt}
        fill
        className="object-contain"
        onError={() => setError(true)}
      />
    </div>
  )
}

const TABS: { id: Tab; label: string }[] = [
  { id: 'kakao',  label: '카카오맵' },
  { id: 'garmin', label: '가민 워치' },
  { id: 'galaxy', label: '갤럭시워치' },
]

export default function GuidePage() {
  const [tab, setTab] = useState<Tab>('kakao')
  const [garminSub, setGarminSub] = useState<GarminSub>('mobile')

  const steps =
    tab === 'kakao'  ? KAKAO_STEPS :
    tab === 'garmin' ? (garminSub === 'pc' ? GARMIN_PC_STEPS : GARMIN_MOBILE_STEPS) :
    GALAXY_STEPS

  return (
    <main className="min-h-screen bg-gray-50" style={{ fontFamily: 'Pretendard, sans-serif' }}>

      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-20">
        <div className="max-w-lg mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/map">
            <Logo width={110} height={33} />
          </Link>
          <Link
            href="/map"
            className="text-[13px] font-semibold text-gray-500 hover:text-gray-800 transition-colors"
          >
            지도로 돌아가기
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-6">

        {/* Title */}
        <h1 className="text-xl font-bold text-gray-900 mb-1">GPX 활용 가이드</h1>
        <p className="text-[13px] text-gray-400 mb-6">
          ShapeRun에서 그린 코스를 기기에서 사용하는 방법을 안내합니다
        </p>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
          {TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
                tab === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Garmin sub-tabs */}
        {tab === 'garmin' && (
          <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
            <button
              onClick={() => setGarminSub('mobile')}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
                garminSub === 'mobile' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              스마트폰 (추천)
            </button>
            <button
              onClick={() => setGarminSub('pc')}
              className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
                garminSub === 'pc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
              }`}
            >
              PC
            </button>
          </div>
        )}

        {/* Galaxy running notice */}
        {tab === 'galaxy' && (
          <div className="mb-5 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3 flex items-start gap-2.5">
            <span className="text-amber-500 text-base leading-none mt-0.5">⚠️</span>
            <p className="text-[12px] text-amber-700 leading-relaxed">
              갤럭시워치의 GPX 경로 기능은 <strong>자전거타기(라이딩) 전용</strong>입니다.
              러닝 모드에서는 경로 가져오기가 지원되지 않습니다.
            </p>
          </div>
        )}

        {/* Steps */}
        <div className="space-y-6">
          {steps.map(s => (
            <StepCard key={s.n} n={s.n} text={s.text} img={s.img} />
          ))}
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <Link
            href="/map"
            className="flex items-center justify-center gap-2 w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[14px] rounded-2xl transition-colors"
          >
            코스 그리러 가기
          </Link>
        </div>
      </div>
    </main>
  )
}
