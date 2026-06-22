'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import Logo from '@/components/ui/Logo'

type Tab = 'kakao' | 'garmin' | 'galaxy'
type GarminSub = 'pc' | 'mobile'

const KAKAO_STEPS = [
  { n: 1, text: '코스 그리기가 완료되면 하단 바에서 [GPX] 버튼을 탭하세요. 파일이 자동으로 다운로드됩니다.', img: '/guide/kakao-1.jpg' },
  { n: 2, text: 'GPX 파일이 다운로드되면 파일을 열고 하단의 [공유] 버튼을 탭하세요.', img: '/guide/kakao-2.jpg' },
  { n: 3, text: '공유 메뉴에서 [카카오맵]을 탭하면 자동으로 카카오맵이 실행되며 코스가 표시됩니다.', img: '/guide/kakao-3.jpg' },
  { n: 4, text: '코스가 표시된 화면에서 우측 하단 [주행시작] 버튼을 탭하면 내비게이션이 시작됩니다. 현재 위치에서 코스를 따라 안내받을 수 있어요.', img: '/guide/kakao-4.jpg' },
]

const GARMIN_PC_STEPS = [
  { n: 1, text: 'ShapeRun에서 코스 작성이 완료되면 하단 바에서 [GPX] 버튼을 클릭하세요. 파일이 자동으로 다운로드됩니다.', img: '/guide/garmin-pc-1.jpg' },
  { n: 2, text: 'Garmin Connect 웹사이트(connect.garmin.com)에 로그인 후, 왼쪽 메뉴에서 [트레이닝 및 플래닝]을 클릭하세요.', img: '/guide/garmin-pc-2.jpg' },
  { n: 3, text: '펼쳐진 메뉴에서 [코스]를 클릭하세요.', img: '/guide/garmin-pc-3.jpg' },
  { n: 4, text: '코스 페이지 상단의 [가져오기] 버튼을 클릭하세요.', img: '/guide/garmin-pc-4.jpg' },
  { n: 5, text: '다운로드한 GPX 파일을 끌어다 놓거나 찾아보기로 선택한 후 [시작하기]를 클릭하세요.', img: '/guide/garmin-pc-5.jpg' },
]

const GARMIN_MOBILE_STEPS = [
  { n: 1, text: '코스 그리기가 완료되면 하단 바에서 [GPX] 버튼을 탭하세요. 파일이 자동으로 다운로드됩니다.', img: '/guide/garmin-mobile-1.jpg' },
  { n: 2, text: '다운로드된 GPX 파일을 열고 하단의 [공유] 버튼을 탭하세요.', img: '/guide/garmin-mobile-2.jpg' },
  { n: 3, text: '공유 메뉴에서 [Garmin Connect]를 선택하세요.', img: '/guide/garmin-mobile-3.jpg' },
  { n: 4, text: '코스 유형에서 [러닝]을 선택하세요.', img: '/guide/garmin-mobile-4.jpg' },
  { n: 5, text: '자동으로 코스 미리보기가 생성되면 [저장]을 탭하세요.', img: '/guide/garmin-mobile-5.jpg' },
  { n: 6, text: '코스 이름을 지정하고 공개/비공개를 설정한 후 [저장]을 탭하세요.', img: '/guide/garmin-mobile-6.jpg' },
  { n: 7, text: '저장된 코스 화면에서 [전송] 아이콘을 탭하세요.', img: '/guide/garmin-mobile-7.jpg' },
  { n: 8, text: '호환 장치 목록에서 사용 중인 가민 워치를 선택하세요.', img: '/guide/garmin-mobile-7b.jpg' },
  { n: 9, text: '워치에서 동기화가 완료되면 코스를 사용할 수 있습니다.', img: '/guide/garmin-mobile-8.jpg' },
]

const GALAXY_STEPS = [
  { n: 1, text: 'ShapeRun에서 코스 작성이 완료되면 하단 바에서 [GPX] 버튼을 탭하세요. 파일이 자동으로 다운로드됩니다.', img: '/guide/galaxy-1.jpg' },
  { n: 2, text: 'Samsung Health 앱 홈 화면에서 [걷기]를 탭하세요.', img: '/guide/galaxy-2.jpg' },
  { n: 3, text: '위치 정보 접근 권한 요청이 뜨면 [앱 사용 중에만 허용]을 탭하세요.', img: '/guide/galaxy-3.jpg' },
  { n: 4, text: '우측 상단 메뉴(⋮)를 탭해 [경로]를 선택하세요.', img: '/guide/galaxy-4.jpg' },
  { n: 5, text: '경로 추가 화면에서 [내 파일에서 가져오기]를 선택하세요.', img: '/guide/galaxy-5.jpg' },
  { n: 6, text: '연결 앱 목록에서 [삼성 헬스]를 선택하세요.', img: '/guide/galaxy-6.jpg' },
  { n: 7, text: '운동 유형 선택에서 [걷기]를 확인하세요.', img: '/guide/galaxy-7.jpg' },
  { n: 8, text: '경로 이름과 운동 유형을 확인한 후 [저장]을 탭하세요.', img: '/guide/galaxy-8.jpg' },
]

function StepCard({ n, text, img, isLast }: { n: number; text: string; img: string; isLast?: boolean }) {
  return (
    <div className={`flex flex-col gap-3${isLast ? '' : ' pb-6 border-b border-gray-100'}`}>
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
      <div className="w-full bg-gray-100 rounded-xl flex items-center justify-center border border-dashed border-gray-200 py-10">
        <span className="text-[12px] text-gray-400">이미지 준비 중</span>
      </div>
    )
  }

  return (
    <div className="w-full rounded-xl overflow-hidden border-2 border-gray-800">
      <Image
        src={src}
        alt={alt}
        width={0}
        height={0}
        sizes="100vw"
        className="w-full h-auto"
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


        {/* Steps */}
        <div style={{ display: tab === 'kakao' ? 'block' : 'none' }} className="space-y-6">
          {KAKAO_STEPS.map((s, idx) => (
            <StepCard key={s.n} n={s.n} text={s.text} img={s.img} isLast={idx === KAKAO_STEPS.length - 1} />
          ))}
        </div>
        <div style={{ display: tab === 'garmin' && garminSub === 'mobile' ? 'block' : 'none' }} className="space-y-6">
          {GARMIN_MOBILE_STEPS.map((s, idx) => (
            <StepCard key={s.n} n={s.n} text={s.text} img={s.img} isLast={idx === GARMIN_MOBILE_STEPS.length - 1} />
          ))}
        </div>
        <div style={{ display: tab === 'garmin' && garminSub === 'pc' ? 'block' : 'none' }} className="space-y-6">
          {GARMIN_PC_STEPS.map((s, idx) => (
            <StepCard key={s.n} n={s.n} text={s.text} img={s.img} isLast={idx === GARMIN_PC_STEPS.length - 1} />
          ))}
        </div>
        <div style={{ display: tab === 'galaxy' ? 'block' : 'none' }} className="space-y-6">
          {GALAXY_STEPS.map((s, idx) => (
            <StepCard key={s.n} n={s.n} text={s.text} img={s.img} isLast={idx === GALAXY_STEPS.length - 1} />
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
