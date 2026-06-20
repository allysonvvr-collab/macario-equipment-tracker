// Dual-line trend chart, built with plain SVG so the app doesn't need a
// charting library just for one graph. Shows Suggested vs Actual gallons
// across whatever date range is currently filtered on the FWC Tracker page.
export function TrendChart({ points, height = 200 }) {
  const width = 720
  const padL = 44, padR = 16, padT = 16, padB = 28
  const innerW = width - padL - padR
  const innerH = height - padT - padB

  if (!points || points.length < 2) {
    return <p className="text-muted text-sm">Log at least two days to see a trend line here.</p>
  }

  const allVals = points.flatMap(p => [p.suggested, p.actual]).filter(v => v !== null && v !== undefined)
  const maxVal = Math.max(...allVals, 1)
  const step = innerW / (points.length - 1)

  function xy(i, val) {
    const x = padL + i * step
    const y = padT + innerH - (val / maxVal) * innerH
    return [x, y]
  }

  function lineFor(key) {
    return points
      .map((p, i) => (p[key] === null || p[key] === undefined) ? null : xy(i, p[key]))
      .filter(Boolean)
      .map(([x, y]) => `${x},${y}`)
      .join(' ')
  }

  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  const tickIdxs = points.length <= 6
    ? points.map((_, i) => i)
    : [0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1]

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: 480, display: 'block' }}>
        {gridLines.map((g, i) => {
          const y = padT + innerH - g * innerH
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={width - padR} y2={y} stroke="var(--gray-200)" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} textAnchor="end" fontSize="10" fill="var(--gray-400)">{Math.round(g * maxVal)}</text>
            </g>
          )
        })}

        {tickIdxs.map(i => (
          <text key={i} x={padL + i * step} y={height - 8} textAnchor="middle" fontSize="10" fill="var(--gray-400)">
            {points[i].label}
          </text>
        ))}

        <polyline points={lineFor('suggested')} fill="none" stroke="var(--green-600)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={lineFor('actual')} fill="none" stroke="var(--gold-dark)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {points.map((p, i) => {
          const [x, y] = xy(i, p.suggested)
          return <circle key={`s${i}`} cx={x} cy={y} r="2.5" fill="var(--green-600)" />
        })}
        {points.map((p, i) => {
          if (p.actual === null || p.actual === undefined) return null
          const [x, y] = xy(i, p.actual)
          return <circle key={`a${i}`} cx={x} cy={y} r="2.5" fill="var(--gold-dark)" />
        })}
      </svg>
      <div className="flex items-center gap-14 mt-6" style={{ fontSize: '.78rem' }}>
        <span className="flex items-center gap-6"><span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--green-600)', display: 'inline-block' }} /> Suggested</span>
        <span className="flex items-center gap-6"><span style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--gold-dark)', display: 'inline-block' }} /> Actual</span>
      </div>
    </div>
  )
}