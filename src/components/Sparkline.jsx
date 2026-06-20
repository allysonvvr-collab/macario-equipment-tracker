// Tiny inline trend line — no charting library needed for a 5-point squiggle.
export function Sparkline({ values, width = 90, height = 26 }) {
  const clean = (values || []).filter(v => v !== null && v !== undefined && !Number.isNaN(Number(v)))
  if (clean.length < 2) return <span className="text-xs text-muted">Not enough data</span>

  const min = Math.min(...clean)
  const max = Math.max(...clean)
  const range = max - min || 1
  const step = width / (clean.length - 1)
  const points = clean.map((v, i) => `${i * step},${height - 2 - ((v - min) / range) * (height - 4)}`).join(' ')
  const trendUp = clean[clean.length - 1] >= clean[0]

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
      <polyline
        points={points} fill="none"
        stroke={trendUp ? 'var(--green-600)' : 'var(--amber)'}
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  )
}