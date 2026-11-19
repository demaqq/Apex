import { useEffect, useRef, useState, type ReactNode } from 'react'

export type Shape = 'circle' | 'ring' | 'square' | 'diamond' | 'cross'

export interface PlotPoint { key: string; x: number; y: number; shape?: Shape; danger?: boolean; tip: ReactNode }
export interface PlotSeries { id: string; label?: string; color: string; dashed?: boolean; line?: boolean; points: PlotPoint[] }
export interface PlotRefLine { id: string; label: string; points: Array<[number, number]>; tone: 'alert' | 'action' | 'ref' }
export interface PlotBand { y0: number; y1: number; tone?: 'normal' | 'danger' }
export interface PlotBar { key: string; x0: number; x1: number; y: number; fill: string; danger?: boolean; tip: ReactNode }

interface PlotProps {
  label: string
  height?: number
  x: [number, number]
  y: [number, number]
  xTicks: Array<{ v: number; label: string }>
  yTicks: Array<number | { v: number; label: string }>
  series?: PlotSeries[]
  refs?: PlotRefLine[]
  bands?: PlotBand[]
  bars?: PlotBar[]
  yTitle?: string
}

export function useWidth<T extends HTMLElement>(min = 220) {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(360)
  useEffect(() => {
    if (!ref.current) return
    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(min, Math.round(entry.contentRect.width))))
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [min])
  return [ref, width] as const
}

export function MarkerShape({ shape = 'circle', x, y, fill, size = 4.5 }: { shape?: Shape; x: number; y: number; fill: string; size?: number }) {
  const ring = { stroke: 'var(--paper)', strokeWidth: 2 }
  if (shape === 'square') return <rect x={x - size} y={y - size} width={size * 2} height={size * 2} rx={1.5} fill={fill} {...ring} />
  if (shape === 'diamond') return <path d={`M${x} ${y - size - 1.5}L${x + size + 1.5} ${y}L${x} ${y + size + 1.5}L${x - size - 1.5} ${y}Z`} fill={fill} {...ring} />
  if (shape === 'cross') return <g stroke={fill} strokeWidth={2.5} strokeLinecap="round"><path d={`M${x - size} ${y - size}L${x + size} ${y + size}M${x + size} ${y - size}L${x - size} ${y + size}`} /></g>
  if (shape === 'ring') return <circle cx={x} cy={y} r={size} fill="var(--paper)" stroke={fill} strokeWidth={2.5} />
  return <circle cx={x} cy={y} r={size} fill={fill} {...ring} />
}

/** Small, themeable SVG chart with reference lines, bands, bars and a hover tooltip. */
export function Plot({ label, height = 180, x, y, xTicks, yTicks, series = [], refs = [], bands = [], bars = [], yTitle }: PlotProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [hover, setHover] = useState<{ px: number; py: number; tip: ReactNode } | null>(null)
  const ticks = yTicks.map((tick) => (typeof tick === 'number' ? { v: tick, label: String(tick) } : tick))
  const pad = { l: Math.max(30, Math.max(...ticks.map((t) => t.label.length)) * 6.4 + 12), r: 12, t: yTitle ? 20 : 10, b: 22 }
  const sx = (v: number) => pad.l + ((v - x[0]) / (x[1] - x[0] || 1)) * (width - pad.l - pad.r)
  const sy = (v: number) => pad.t + (1 - (v - y[0]) / (y[1] - y[0] || 1)) * (height - pad.t - pad.b)
  const longest = Math.max(1, ...xTicks.map((t) => t.label.length)) * 6.6 + 16
  const spacing = xTicks.length > 1 ? Math.abs(sx(xTicks[1].v) - sx(xTicks[0].v)) : Infinity
  const labelEvery = Math.max(1, Math.ceil(longest / spacing))
  const hits = [
    ...series.flatMap((s) => s.points.map((p) => ({ px: sx(p.x), py: sy(p.y), tip: p.tip }))),
    ...bars.map((b) => ({ px: (sx(b.x0) + sx(b.x1)) / 2, py: sy(b.y), tip: b.tip })),
  ]

  const onMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!hits.length) return
    const box = event.currentTarget.getBoundingClientRect()
    const mx = ((event.clientX - box.left) / box.width) * width
    const my = event.clientY - box.top
    let best = hits[0]
    let bestD = Infinity
    hits.forEach((hit) => { const d = Math.abs(hit.px - mx) * 3 + Math.abs(hit.py - my); if (d < bestD) { bestD = d; best = hit } })
    setHover(best)
  }

  return (
    <div className="trend-plot plot" ref={ref}>
      <svg width={width} height={height} role="img" aria-label={label} onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {yTitle && <text className="trend-axis" x={4} y={10}>{yTitle}</text>}
        {bands.map((band, i) => <rect key={i} className={band.tone === 'danger' ? 'plot-band-danger' : 'trend-band'} x={pad.l} width={width - pad.l - pad.r} y={sy(Math.min(band.y1, y[1]))} height={Math.max(0, sy(Math.max(band.y0, y[0])) - sy(Math.min(band.y1, y[1])))} />)}
        {ticks.map((tick) => <g key={tick.v}><line className="trend-grid" x1={pad.l} x2={width - pad.r} y1={sy(tick.v)} y2={sy(tick.v)} /><text className="trend-axis" x={pad.l - 6} y={sy(tick.v) + 3} textAnchor="end">{tick.label}</text></g>)}
        {xTicks.map((tick, i) => <g key={tick.v}><line className="trend-day" x1={sx(tick.v)} x2={sx(tick.v)} y1={pad.t} y2={height - pad.b} />{i % labelEvery === 0 && <text className="trend-axis" x={sx(tick.v)} y={height - 6} textAnchor={i === xTicks.length - 1 && sx(tick.v) > width - pad.r - 20 ? 'end' : 'middle'}>{tick.label}</text>}</g>)}
        {refs.map((line) => (
          <g key={line.id} className={`plot-ref plot-ref-${line.tone}`}>
            <path d={line.points.map(([px, py], i) => `${i ? 'L' : 'M'}${sx(px).toFixed(1)} ${sy(py).toFixed(1)}`).join('')} fill="none" />
            <text x={sx(line.points[line.points.length - 1][0]) - 4} y={sy(line.points[line.points.length - 1][1]) + 12} textAnchor="end">{line.label}</text>
          </g>
        ))}
        {bars.map((bar) => <rect key={bar.key} x={sx(bar.x0) + 1} width={Math.max(2, sx(bar.x1) - sx(bar.x0) - 2)} y={sy(bar.y)} height={Math.max(0, sy(y[0]) - sy(bar.y))} rx={2} fill={bar.fill} stroke={bar.danger ? 'var(--danger)' : 'none'} strokeWidth={bar.danger ? 2 : 0} />)}
        {hover && <line className="trend-cross" x1={hover.px} x2={hover.px} y1={pad.t} y2={height - pad.b} />}
        {series.map((s) => (
          <g key={s.id}>
            {s.line !== false && s.points.length > 1 && <path d={s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join('')} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '5 4' : undefined} strokeLinejoin="round" strokeLinecap="round" />}
            {s.points.map((p) => <MarkerShape key={p.key} shape={p.shape} x={sx(p.x)} y={sy(p.y)} fill={p.danger ? 'var(--danger)' : s.color} />)}
          </g>
        ))}
      </svg>
      {hover && <div className="trend-tip" style={{ left: Math.min(Math.max(hover.px, 80), width - 80), top: Math.max(hover.py - 8, 0) }}>{hover.tip}</div>}
    </div>
  )
}

export const PlotLegend = ({ items }: { items: Array<{ label: string; color?: string; shape?: Shape; dashed?: boolean; swatch?: string }> }) => (
  <div className="trend-key">
    {items.map((item) => (
      <span key={item.label}>
        {item.swatch ? <i className="legend-swatch" style={{ background: item.swatch }} /> : item.shape ? <svg width="14" height="14"><MarkerShape shape={item.shape} x={7} y={7} fill={item.color ?? 'var(--muted)'} size={4} /></svg> : <i className={`legend-line ${item.dashed ? 'dashed' : ''}`} style={{ borderColor: item.color }} />}
        {item.label}
      </span>
    ))}
  </div>
)
