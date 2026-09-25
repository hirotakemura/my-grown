import { useState } from 'react';
import { formatMD } from '../lib/date';

export interface Point { date: string; value: number; note?: string }

/** 1系列の折れ線。タップ／ホバーで一番近い点の値を出す */
export function LineChart({ points, unit, label }: { points: Point[]; unit: string; label: string }) {
  const [active, setActive] = useState<number | null>(null);
  if (points.length === 0) return <p className="muted">まだ記録がありません。</p>;

  const W = 340, H = 180, L = 40, R = 12, T = 12, B = 26;
  const vals = points.map((p) => p.value);
  let lo = Math.min(...vals), hi = Math.max(...vals);
  if (hi - lo < 1) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1;
  lo -= pad; hi += pad;
  const x = (i: number) => (points.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (points.length - 1));
  const y = (v: number) => T + ((hi - v) * (H - T - B)) / (hi - lo);
  const ticks = [lo + (hi - lo) * 0.1, (lo + hi) / 2, hi - (hi - lo) * 0.1];
  const fmt = (v: number) => (Math.abs(hi - lo) < 10 ? v.toFixed(1) : String(Math.round(v)));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ');
  const shown = active ?? points.length - 1;

  const pick = (clientX: number, rect: DOMRect) => {
    const px = ((clientX - rect.left) / rect.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setActive(best);
  };

  const sp = points[shown];
  const xLabels = points.length === 1 ? [0] : [0, points.length - 1];

  return (
    <div>
      <div className="chart-tip num" aria-live="polite">
        {formatMD(sp.date)}：<b style={{ color: 'var(--text)' }}>{sp.value}{unit}</b>{sp.note ? `　${sp.note}` : ''}
      </div>
      <svg
        className="chart"
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`${label}の推移`}
        onPointerMove={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerDown={(e) => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setActive(null)}
      >
        {ticks.map((t) => (
          <g key={t}>
            <line className="grid" x1={L} x2={W - R} y1={y(t)} y2={y(t)} />
            <text x={L - 6} y={y(t) + 4} textAnchor="end">{fmt(t)}</text>
          </g>
        ))}
        {xLabels.map((i) => (
          <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 && points.length > 1 ? 'start' : 'end'}>{formatMD(points[i].date)}</text>
        ))}
        {active !== null && <line className="cross" x1={x(active)} x2={x(active)} y1={T} y2={H - B} />}
        <path className="line" d={path} />
        {points.map((p, i) => (
          <circle key={p.date} className="dot" cx={x(i)} cy={y(p.value)} r={i === shown ? 5.5 : 4} />
        ))}
      </svg>
    </div>
  );
}
