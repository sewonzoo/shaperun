'use client'

import { useState } from 'react'

interface Props {
  onClose: () => void
}

const PHONE_STEPS = [
  { n: 1, text: 'ShapeRun에서 GPX 다운로드' },
  { n: 2, text: '가민 커넥트 앱 열기' },
  { n: 3, text: '트레이닝 및 플래닝 → 코스 → 가져오기' },
  { n: 4, text: 'GPX 파일 선택 → 시작하기' },
  { n: 5, text: '코스 유형 선택 (러닝) → 저장' },
  { n: 6, text: '워치로 전송 탭 → 연결된 워치 선택' },
]

const PC_STEPS = [
  { n: 1, text: 'ShapeRun에서 GPX 다운로드' },
  { n: 2, text: 'connect.garmin.com 접속 → 로그인' },
  { n: 3, text: '트레이닝 및 플래닝 → 코스 → 가져오기 버튼' },
  { n: 4, text: 'GPX 파일 드래그 앤 드롭 → 시작하기' },
  { n: 5, text: '코스 이름 입력 → 저장' },
  { n: 6, text: '워치와 동기화' },
]

export default function GarminGuideModal({ onClose }: Props) {
  const [tab, setTab] = useState<'phone' | 'pc'>('phone')
  const steps = tab === 'phone' ? PHONE_STEPS : PC_STEPS

  return (
    <div
      className="absolute inset-0 z-50 flex items-end justify-center"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl shadow-2xl pt-5 pb-8 pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Handle */}
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-5" />

        {/* Title */}
        <div className="px-6 mb-5">
          <h2 className="text-base font-bold text-gray-900">가민에 GPX 넣는 법</h2>
          <p className="text-[13px] text-gray-400 mt-0.5">가민 커넥트로 코스를 전송하세요</p>
        </div>

        {/* Tabs */}
        <div className="flex mx-6 mb-5 bg-gray-100 rounded-xl p-1">
          <button
            onClick={() => setTab('phone')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
              tab === 'phone' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            스마트폰 (추천)
          </button>
          <button
            onClick={() => setTab('pc')}
            className={`flex-1 py-2 text-[13px] font-semibold rounded-lg transition-colors ${
              tab === 'pc' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-400'
            }`}
          >
            PC
          </button>
        </div>

        {/* Steps */}
        <div className="px-6 space-y-3 mb-6">
          {steps.map(({ n, text }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white text-[11px] font-bold flex items-center justify-center mt-0.5">
                {n}
              </span>
              <p className="text-[14px] text-gray-700 leading-snug">{text}</p>
            </div>
          ))}
        </div>

        {/* Tip */}
        <div className="mx-6 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-3">
          <p className="text-[12px] text-amber-700 leading-relaxed">
            💡 카카오톡으로 GPX 파일을 받은 경우, 가민 커넥트 앱에서 바로 열기가 가능합니다
          </p>
        </div>
      </div>
    </div>
  )
}
