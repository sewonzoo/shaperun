import type { RouteSegment } from './api'

export function buildGPX(segments: RouteSegment[]): string {
  const now = new Date().toISOString()

  const coords: [number, number][] = []
  for (let i = 0; i < segments.length; i++) {
    const c = segments[i].coordinates
    coords.push(...(i === 0 ? c : c.slice(1)))
  }

  const trkpts = coords
    .map(([lng, lat]) => `      <trkpt lat="${lat.toFixed(7)}" lon="${lng.toFixed(7)}"></trkpt>`)
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="ShapeRun" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>ShapeRun Route</name>
    <time>${now}</time>
  </metadata>
  <trk>
    <name>Walking Route</name>
    <trkseg>
${trkpts}
    </trkseg>
  </trk>
</gpx>`
}

export function downloadGPX(segments: RouteSegment[]) {
  const content = buildGPX(segments)
  const blob = new Blob([content], { type: 'application/gpx+xml' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `shaperun-${Date.now()}.gpx`
  a.click()
  URL.revokeObjectURL(url)
}
