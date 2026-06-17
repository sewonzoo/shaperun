export default function Logo({ width = 140, height = 42 }: { width?: number; height?: number }) {
  return (
    <svg viewBox="0 0 200 60" width={width} height={height} xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arr-sr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke="#378ADD" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      <polyline points="8,52 8,28 32,28 32,8" fill="none" stroke="#378ADD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" markerEnd="url(#arr-sr)" />
      <circle cx="8" cy="52" r="4.5" fill="#378ADD" />
      <circle cx="32" cy="28" r="3" fill="white" stroke="#378ADD" strokeWidth="2" />
      <text x="44" y="42" fontSize="28" fontWeight="700" letterSpacing="-1" fontFamily="system-ui, sans-serif" fill="#1a1a1a">
        Shape<tspan fill="#378ADD">Run</tspan>
      </text>
    </svg>
  )
}
