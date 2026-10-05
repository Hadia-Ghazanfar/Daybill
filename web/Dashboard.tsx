import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from './client';
import { useStrings } from './i18n-utils';
import { fmtMoney, fmtDateShort } from './format';
import { Card, Spinner, Button, SegmentedControl, EmptyState } from './ui';
import type { DashboardData } from './types';

type RangeKey = '7d' | '1m' | '3m' | '6m' | '9m' | '1y' | 'lifetime';

/* ---------------- SVG smooth area chart (no chart lib) ---------------- */

function smoothLine(pts: { x: number; y: number }[]): string {
  if (pts.length === 0) return '';
  if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(pts.length - 1, i + 2)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

function AreaChart({ series }: { series: { date: string; revenue: number }[] }) {
  const t = useStrings();
  const W = 680;
  const H = 190;
  const PAD = 10;

  const { line, area, ticks, maxLabel, last } = useMemo(() => {
    if (series.length === 0) return { line: '', area: '', ticks: [] as { x: number; label: string }[], maxLabel: '', last: null as { x: number; y: number } | null };
    const max = Math.max(1, ...series.map((s) => s.revenue)) * 1.15;
    const n = series.length;
    const stepX = n === 1 ? 0 : (W - PAD * 2) / (n - 1);
    const pts = series.map((s, i) => ({
      x: PAD + i * stepX,
      y: H - PAD - (s.revenue / max) * (H - PAD * 2 - 18),
    }));
    const linePath = smoothLine(pts);
    const baseY = H - PAD;
    const areaPath = n === 1
      ? ''
      : `${linePath} L ${pts[n - 1].x.toFixed(1)} ${baseY} L ${pts[0].x.toFixed(1)} ${baseY} Z`;
    const tickIdx = n <= 4 ? series.map((_, i) => i) : [0, Math.floor(n / 3), Math.floor((2 * n) / 3), n - 1];
    const ticksList = tickIdx.map((i) => ({ x: pts[i].x, label: fmtDateShort(series[i].date) }));
    return { line: linePath, area: areaPath, ticks: ticksList, maxLabel: fmtMoney(Math.max(1, ...series.map((s) => s.revenue))), last: pts[n - 1] };
  }, [series]);

  if (series.length === 0) {
    return <EmptyState title={t['dash.noData']} />;
  }

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H + 22}`} className="w-full h-auto" role="img" aria-label={t['dash.revenueTrend']}>
        <defs>
          <linearGradient id="revFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1={PAD} x2={W - PAD} y1={H - PAD - f * (H - PAD * 2 - 18)} y2={H - PAD - f * (H - PAD * 2 - 18)}
            stroke="currentColor" strokeWidth="1" className="text-slate-200 dark:text-white/10" strokeDasharray="4 4" />
        ))}
        {area ? <path d={area} fill="url(#revFill)" /> : null}
        <path d={line} fill="none" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
        {last ? (
          <circle cx={last.x} cy={last.y} r="4.5" fill="#10B981" stroke="#fff" strokeWidth="2" />
        ) : null}
        <text x={PAD} y={14} fontSize="11" fill="currentColor" className="text-slate-400 dark:text-slate-500">{maxLabel}</text>
        {ticks.map((tk, i) => (
          <text key={i} x={tk.x} y={H + 16} fontSize="11" textAnchor="middle" fill="currentColor" className="text-slate-400 dark:text-slate-500">
            {tk.label}
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ---------------- Page ---------------- */

const RANGES: RangeKey[] = ['7d', '1m', '3m', '6m', '9m', '1y', 'lifetime'];

function StatCard({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'slate' | 'teal' | 'amber' | 'rose' }) {
  const tones: Record<string, string> = {
    emerald: 'text-emerald-700 dark:text-emerald-300',
    slate: 'text-slate-700 dark:text-slate-200',
    teal: 'text-teal-800 dark:text-teal-200',
    amber: 'text-amber-700 dark:text-amber-300',
    rose: 'text-rose-700 dark:text-rose-300',
  };
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`mt-1.5 text-xl font-extrabold tabular-nums ${tones[tone]}`}>{fmtMoney(value)}</p>
    </Card>
  );
}

function activityTone(kind?: string): string {
  if (kind === 'invoice') return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300';
  if (kind === 'purchase') return 'bg-teal-100 text-teal-700 dark:bg-teal-500/15 dark:text-teal-300';
  if (kind === 'payment') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
}

export default function Dashboard() {
  const t = useStrings();
  const [range, setRange] = useState<RangeKey>('1m');
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await api.get<DashboardData>(`/dashboard?range=${range}`);
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [range]);

  useEffect(() => {
    load();
  }, [load]);

  const rangeOptions = RANGES.map((r) => ({ value: r, label: t[`dash.range.${r}` as keyof typeof t] as string }));

  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-5 md:pb-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold text-teal-950 dark:text-white">{t['dash.title']}</h1>
        <div className="max-w-full overflow-x-auto">
          <SegmentedControl options={rangeOptions} value={range} onChange={(v) => setRange(v as RangeKey)} size="sm" />
        </div>
      </div>

      {loading && !data ? (
        <div className="flex justify-center py-16 text-teal-800 dark:text-teal-200">
          <Spinner className="h-8 w-8" />
        </div>
      ) : null}

      {error && !data ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{t['dash.loadError']}</p>
          <Button className="mt-4" onClick={load}>{t['dash.retry']}</Button>
        </Card>
      ) : null}

      {data ? (
        <div className={loading ? 'opacity-60 pointer-events-none' : ''}>
          {/* Received card */}
          <div className="rounded-2xl bg-[#0B3B39] p-5 text-white shadow-md">
            <p className="text-xs font-semibold uppercase tracking-widest text-teal-100/80">{t['dash.received']}</p>
            <p className="mt-1 text-3xl font-extrabold tabular-nums">{fmtMoney(data.received)}</p>
          </div>

          {/* Stat cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <StatCard label={t['dash.revenue']} value={data.revenue} tone="emerald" />
            <StatCard label={t['dash.cost']} value={data.cost} tone="slate" />
            <StatCard label={t['dash.profit']} value={data.profit} tone="teal" />
            <StatCard label={t['dash.customerDues']} value={data.customerDues} tone="amber" />
            <StatCard label={t['dash.supplierPayables']} value={data.supplierPayables} tone="rose" />
          </div>

          {/* Revenue trend */}
          <Card className="mt-4 p-4">
            <h2 className="mb-2 text-base font-bold text-slate-800 dark:text-slate-100">{t['dash.revenueTrend']}</h2>
            <AreaChart series={data.series || []} />
          </Card>

          {/* Recent activity */}
          <Card className="mt-4 p-4">
            <h2 className="mb-3 text-base font-bold text-slate-800 dark:text-slate-100">{t['dash.recentActivity']}</h2>
            {(data.recentActivity || []).length === 0 ? (
              <EmptyState title={t['dash.noActivity']} />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-white/5">
                {(data.recentActivity || []).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5">
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-extrabold uppercase ${activityTone(a.kind)}`}>
                      {(a.title || '?').charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">{a.title}</p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {[a.subtitle, a.date ? fmtDateShort(a.date) : ''].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    {a.amount != null ? (
                      <span className="shrink-0 text-sm font-bold tabular-nums text-slate-800 dark:text-slate-100">
                        {fmtMoney(a.amount)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      ) : null}
    </div>
  );
}
