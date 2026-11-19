import { memo, useMemo, type CSSProperties } from 'react'
import type { Ambient as AmbientKind } from '../lib/deptTheme'

/** Seeded random so the layout is stable between renders. */
function rng(seed: number) {
  let s = seed
  return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646 }
}

const v = (vars: Record<string, string | number>) => vars as CSSProperties

/** Decorative, department-specific animated background. Purely visual and hidden from assistive tech. */
export const Ambient = memo(function Ambient({ kind }: { kind: AmbientKind }) {
  const items = useMemo(() => {
    const r = rng(kind.length * 97 + 13)
    return Array.from({ length: 18 }, (_, i) => ({ i, x: r() * 100, y: r() * 100, s: r(), d: r(), alt: r() > 0.62 }))
  }, [kind])

  return (
    <div className={`ambient ambient-${kind}`} aria-hidden="true">
      <span className="orb orb-a" /><span className="orb orb-b" /><span className="orb orb-c" />

      {kind === 'bubbles' && <>
        {items.map((b) => <i key={b.i} className={`bubble ${b.alt ? 'alt' : ''}`} style={v({ left: `${b.x}%`, '--size': `${14 + b.s * 46}px`, '--dur': `${16 + b.d * 18}s`, '--delay': `${-b.d * 30}s`, '--sway': `${(b.s - 0.5) * 80}px` })} />)}
        {items.slice(0, 8).map((b) => <svg key={`s${b.i}`} className="star" viewBox="0 0 24 24" style={v({ left: `${(b.x * 7) % 100}%`, top: `${(b.y * 3) % 90}%`, '--dur': `${3 + b.d * 4}s`, '--delay': `${-b.s * 6}s` })}><path d="M12 2l2.9 6.9L22 10l-5.5 4.7L18.2 22 12 18.3 5.8 22l1.7-7.3L2 10l7.1-1.1z" /></svg>)}
      </>}

      {kind === 'waves' && <>
        <svg className="waves" viewBox="0 0 1440 320" preserveAspectRatio="none">
          {[0, 1, 2].map((n) => <path key={n} className={`wave w${n}`} d="M0 160 C 180 100 360 220 540 160 S 900 100 1080 160 S 1260 220 1440 160 S 1800 100 1980 160 S 2340 220 2520 160 S 2700 100 2880 160 V320 H0 Z" />)}
        </svg>
        {items.slice(0, 12).map((p) => <i key={p.i} className={`petal ${p.alt ? 'alt' : ''}`} style={v({ left: `${p.x}%`, '--size': `${8 + p.s * 12}px`, '--dur': `${18 + p.d * 16}s`, '--delay': `${-p.d * 30}s`, '--sway': `${(p.s - 0.5) * 120}px` })} />)}
      </>}

      {kind === 'ribbons' && <>
        <span className="ribbon r1" /><span className="ribbon r2" /><span className="ribbon r3" />
      </>}

      {kind === 'ecg' && (
        <svg className="ecg-bg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path className="ecg-line" d="M0 60 H180 l14 -6 l10 6 H250 l8 10 l12 -58 l12 74 l10 -26 H360 l18 -10 l18 10 H600 l14 -6 l10 6 H670 l8 10 l12 -58 l12 74 l10 -26 H780 l18 -10 l18 10 H1020 l14 -6 l10 6 H1090 l8 10 l12 -58 l12 74 l10 -26 H1200" />
        </svg>
      )}

      {kind === 'neural' && (
        <svg className="neural" viewBox="0 0 100 100" preserveAspectRatio="none">
          {items.flatMap((a, ai) => items.slice(ai + 1).filter((b) => Math.hypot(a.x - b.x, a.y - b.y) < 24).map((b) => <line key={`${a.i}-${b.i}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />))}
          {items.map((n) => <circle key={n.i} cx={n.x} cy={n.y} r={0.5 + n.s * 0.7} style={v({ '--delay': `${-n.d * 5}s` })} />)}
        </svg>
      )}

      {kind === 'scan' && <><span className="scan-grid" /><span className="scan-bar" /></>}

      {kind === 'molecules' && items.slice(0, 14).map((m) => (
        <svg key={m.i} className={`hex ${m.alt ? 'alt' : ''}`} viewBox="0 0 40 40" style={v({ left: `${m.x}%`, '--size': `${22 + m.s * 34}px`, '--dur': `${24 + m.d * 20}s`, '--delay': `${-m.d * 40}s` })}>
          <path d="M20 3l14.7 8.5v17L20 37 5.3 28.5v-17z" />
        </svg>
      ))}
    </div>
  )
})
