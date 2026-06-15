const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''

export interface LngLat {
  lng: number
  lat: number
}

export interface RouteSegment {
  coordinates: [number, number][]
  distance: number  // meters
  duration: number  // seconds
}

export async function getWalkingRoute(from: LngLat, to: LngLat): Promise<RouteSegment> {
  const coords = `${from.lng},${from.lat};${to.lng},${to.lat}`
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/walking/${coords}` +
    `?steps=false&geometries=geojson&overview=full&access_token=${MAPBOX_TOKEN}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`Directions API 오류 (${res.status})`)

  const data = await res.json()
  const route = data.routes?.[0]
  if (!route) throw new Error('경로를 찾을 수 없습니다')

  return {
    coordinates: route.geometry.coordinates as [number, number][],
    distance: route.distance as number,
    duration: route.duration as number,
  }
}
