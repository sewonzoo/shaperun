import { haversineM } from './navigation'

export interface GpxPoint {
  lat: number
  lon: number
  ele?: number
}

export interface ParsedGpx {
  name: string
  points: GpxPoint[]
  hasElevation: boolean
  totalDistance: number // km
}

export class GpxParseError extends Error {}

// GPX는 보통 xmlns 기본 네임스페이스(prefix 없음)를 쓰지만, 혹시 prefix가
// 붙은 파일(<gpx:trk> 등)도 있을 수 있어 tagName이 아닌 localName으로 비교한다.
function childrenByLocalName(parent: Element, name: string): Element[] {
  return Array.from(parent.children).filter(el => el.localName === name)
}

function firstChildByLocalName(parent: Element, name: string): Element | null {
  return childrenByLocalName(parent, name)[0] ?? null
}

function descendantsByLocalName(root: Element, name: string): Element[] {
  const result: Element[] = []
  const walk = (el: Element) => {
    for (const child of Array.from(el.children)) {
      if (child.localName === name) result.push(child)
      walk(child)
    }
  }
  walk(root)
  return result
}

function parsePoint(el: Element): GpxPoint | null {
  const lat = parseFloat(el.getAttribute('lat') ?? '')
  const lon = parseFloat(el.getAttribute('lon') ?? '')
  if (Number.isNaN(lat) || Number.isNaN(lon)) return null

  const eleEl = firstChildByLocalName(el, 'ele')
  const eleVal = eleEl?.textContent ? parseFloat(eleEl.textContent) : NaN
  return { lat, lon, ele: Number.isNaN(eleVal) ? undefined : eleVal }
}

// <trk><trkseg><trkpt> 우선. trkseg가 여러 개면 순서대로 이어붙인다.
function extractTrackPoints(root: Element): GpxPoint[] {
  const points: GpxPoint[] = []
  for (const trk of descendantsByLocalName(root, 'trk')) {
    for (const seg of descendantsByLocalName(trk, 'trkseg')) {
      for (const pt of descendantsByLocalName(seg, 'trkpt')) {
        const p = parsePoint(pt)
        if (p) points.push(p)
      }
    }
  }
  return points
}

// <trk>가 없을 때의 fallback
function extractRoutePoints(root: Element): GpxPoint[] {
  const points: GpxPoint[] = []
  for (const rte of descendantsByLocalName(root, 'rte')) {
    for (const pt of descendantsByLocalName(rte, 'rtept')) {
      const p = parsePoint(pt)
      if (p) points.push(p)
    }
  }
  return points
}

// <metadata><name> 또는 <metadata><n> 둘 다 체크 (GPX 생성기마다 태그명이 다름).
// <wpt> 안의 장소명/설명은 의도적으로 읽지 않는다.
function extractName(root: Element, fallback: string): string {
  const metadata = descendantsByLocalName(root, 'metadata')[0]
  if (metadata) {
    const nameEl = firstChildByLocalName(metadata, 'name') ?? firstChildByLocalName(metadata, 'n')
    const text = nameEl?.textContent?.trim()
    if (text) return text
  }
  return fallback
}

function stripExtension(fileName: string): string {
  const idx = fileName.lastIndexOf('.')
  return idx > 0 ? fileName.slice(0, idx) : fileName
}

export function parseGPX(xmlText: string, fileName: string): ParsedGpx {
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml')
  const root = doc.documentElement

  if (!root || doc.getElementsByTagName('parsererror').length > 0) {
    throw new GpxParseError('GPX 파일을 읽을 수 없습니다. 올바른 GPX 파일인지 확인해주세요.')
  }

  let points = extractTrackPoints(root)
  if (points.length === 0) points = extractRoutePoints(root)

  if (points.length === 0) {
    throw new GpxParseError('GPX 파일에서 경로 정보(트랙 또는 루트)를 찾을 수 없습니다.')
  }
  if (points.length < 2) {
    throw new GpxParseError(`경로를 그리려면 좌표가 2개 이상 필요합니다. (현재 ${points.length}개)`)
  }

  let totalDistanceM = 0
  for (let i = 1; i < points.length; i++) {
    totalDistanceM += haversineM(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon)
  }

  return {
    name: extractName(root, stripExtension(fileName)),
    points,
    hasElevation: points.some(p => p.ele !== undefined),
    totalDistance: totalDistanceM / 1000,
  }
}
