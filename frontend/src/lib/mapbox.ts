import mapboxgl from 'mapbox-gl'

export function initMapboxToken() {
  mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? ''
}

// Seoul city hall as fallback center
export const DEFAULT_CENTER: [number, number] = [126.978, 37.566]
export const DEFAULT_ZOOM = 14
