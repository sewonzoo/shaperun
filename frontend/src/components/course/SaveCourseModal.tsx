'use client'

import { useState, useEffect, useRef } from 'react'
import { saveCourse } from '@/lib/courses'
import type { Course } from '@/lib/courses'
import type { LngLat, RouteSegment } from '@/lib/api'

interface Props {
  waypoints: LngLat[]
  segments: RouteSegment[]
  loopClosed: boolean
  initialTitle?: string
  onClose: () => void
  onSaved: (course: Course) => void
}

function defaultTitle(segments: RouteSegment[]): string {
  const km = (segments.reduce((s, seg) => s + seg.distance, 0) / 1000).toFixed(1)
  return `${km} km 코스`
}

export default function SaveCourseModal({ waypoints, segments, loopClosed, initialTitle, onClose, onSaved }: Props) {
  const [title,    setTitle]    = useState(() => initialTitle ?? defaultTitle(segments))
  const [isPublic, setIsPublic] = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus(); inputRef.current?.select() }, [])

  const handleSave = async () => {
    const t = title.trim()
    if (!t) { setError('코스 이름을 입력해주세요'); return }
    setSaving(true)
    setError(null)
    try {
      const course = await saveCourse({ title: t, waypoints, segments, loop_closed: loopClosed, is_public: isPublic })
      onSaved(course)
    } catch {
      setError('저장에 실패했어요. 다시 시도해주세요.')
      setSaving(false)
    }
  }

  return (
    <div className="absolute inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
      <div
        className="relative w-full max-w-sm bg-white rounded-t-3xl shadow-2xl px-6 pt-5 pb-10 pointer-events-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-6" />

        <h2 className="text-base font-bold text-gray-900 mb-1">코스 저장</h2>
        <p className="text-[13px] text-gray-400 mb-5">코스 이름을 입력하세요</p>

        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={e => { setTitle(e.target.value); setError(null) }}
          onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
          maxLength={60}
          placeholder="예: 한강 5km 코스"
          className="w-full h-12 rounded-2xl border border-gray-200 px-4 text-base text-gray-800 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition mb-3"
          disabled={saving}
        />

        {/* Public toggle */}
        <label className="flex items-center gap-3 cursor-pointer select-none mb-2">
          <div
            onClick={() => setIsPublic(p => !p)}
            className={`relative w-10 h-6 rounded-full transition-colors ${isPublic ? 'bg-blue-500' : 'bg-gray-200'}`}
          >
            <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${isPublic ? 'translate-x-5' : 'translate-x-1'}`} />
          </div>
          <div>
            <p className="text-[13px] font-semibold text-gray-800">커뮤니티에 공개</p>
            <p className="text-[11px] text-gray-400">다른 사람들이 이 코스를 다운로드할 수 있어요</p>
          </div>
        </label>

        {error && <p className="text-[12px] text-red-500 mt-2 pl-1">{error}</p>}

        <div className="flex gap-3 mt-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 h-12 rounded-2xl border border-gray-200 text-[14px] font-semibold text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-40"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim()}
            className="flex-1 h-12 rounded-2xl bg-blue-600 text-[14px] font-semibold text-white hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving && <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  )
}
