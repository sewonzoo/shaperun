export interface NavInfo {
  distanceToNextWpM: number
  nextWpIndex: number   // 0-based index into navTargets
  totalTargets: number
  isOffRoute: boolean
  isComplete: boolean
}

export const OFF_ROUTE_THRESHOLD_M = 40
export const ARRIVAL_RADIUS_M = 25

export function haversineM(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

/** 현재 위치에서 경로 폴리라인까지의 최소 수직 거리 (미터) */
export function minDistToRoute(
  curLat: number,
  curLng: number,
  routeCoords: [number, number][],
): number {
  if (routeCoords.length < 2) return Infinity
  const cosLat = Math.cos(curLat * Math.PI / 180)
  const mLat = 111320
  const mLng = 111320 * cosLat
  let min = Infinity

  for (let i = 0; i < routeCoords.length - 1; i++) {
    const [alng, alat] = routeCoords[i]
    const [blng, blat] = routeCoords[i + 1]
    const px = (curLng - alng) * mLng
    const py = (curLat - alat) * mLat
    const dx = (blng - alng) * mLng
    const dy = (blat - alat) * mLat
    const len2 = dx * dx + dy * dy
    let d: number
    if (len2 < 1e-6) {
      d = Math.sqrt(px * px + py * py)
    } else {
      const t = Math.max(0, Math.min(1, (px * dx + py * dy) / len2))
      d = Math.sqrt((px - t * dx) ** 2 + (py - t * dy) ** 2)
    }
    if (d < min) min = d
  }
  return min
}
