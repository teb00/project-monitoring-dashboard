import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard, Icon, SegmentedControl } from "./ui";
import { compact, full } from "@/lib/format";
import {
  segmentAggregates,
  segmentTotals,
} from "@/data/analytics";
import type { RangeKey, SegmentKey, SegmentSlice } from "@/types";
import { cn } from "@/utils/cn";

/* ===========================================================================
 * Donut chart — share of new stars by segment (reacts to range + segment)
 * ======================================================================== */
function describeArc(
  cx: number,
  cy: number,
  r: number,
  start: number,
  end: number,
): string {
  const x0 = cx + r * Math.sin(start);
  const y0 = cy - r * Math.cos(start);
  const x1 = cx + r * Math.sin(end);
  const y1 = cy - r * Math.cos(end);
  const large = end - start > Math.PI ? 1 : 0;
  return `M ${x0.toFixed(2)} ${y0.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

export function DonutSegmentChart({
  range,
  segment,
  onPick,
}: {
  range: RangeKey;
  segment: SegmentKey;
  onPick?: (value: string) => void;
}) {
  const slices = useMemo(
    () => segmentAggregates(segment, range),
    [segment, range],
  );
  const [hover, setHover] = useState<number | null>(null);
  const total = slices.reduce((a, s) => a + s.value, 0) || 1;

  let acc = 0;
  const arcs = slices.map((s, i) => {
    const frac = s.value / total;
    const start = acc * Math.PI * 2;
    acc += frac;
    const end = acc * Math.PI * 2;
    return { ...s, frac, start, end, index: i };
  });

  const active = hover != null ? arcs[hover] : null;
  const segmentPlural = segment === "language" ? "languages" : "categories";
  const cx = 100;
  const cy = 100;

  return (
    <ChartCard
      title="Where the stars are going"
      subtitle={`New stars by ${segment} · click to filter`}
      icon="dot"
      bodyClassName="px-4 pb-4"
    >
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
        <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
          <svg viewBox="0 0 200 200" width={200} height={200}>
            {/* track ring */}
            <circle
              cx={cx}
              cy={cy}
              r={72}
              fill="none"
              className="stroke-slate-100 dark:stroke-white/[0.04]"
              strokeWidth={20}
            />
            {arcs.map((a) => {
              const isHover = hover === a.index;
              const dim = hover != null && !isHover;
              return (
                <motion.path
                  key={a.key}
                  d={describeArc(cx, cy, isHover ? 78 : 72, a.start, a.end)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${a.label}: ${compact(a.value)} new stars, ${(a.frac * 100).toFixed(1)} percent`}
                  fill="none"
                  stroke={a.color}
                  strokeWidth={isHover ? 24 : 20}
                  strokeLinecap="butt"
                  style={{ cursor: "pointer", opacity: dim ? 0.4 : 1 }}
                  animate={{ d: describeArc(cx, cy, isHover ? 78 : 72, a.start, a.end) }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  onMouseEnter={() => setHover(a.index)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onPick?.(a.key)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onPick?.(a.key);
                    }
                  }}
                />
              );
            })}
          </svg>

          {/* center label */}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
            {active ? (
              <>
                <span className="max-w-[120px] truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                  {active.label}
                </span>
                <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {compact(active.value)}
                </span>
                <span className="text-xs font-semibold text-indigo-500 dark:text-indigo-400">
                  {(active.frac * 100).toFixed(1)}%
                </span>
              </>
            ) : (
              <>
                <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:text-slate-500">
                  New stars
                </span>
                <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {compact(total)}
                </span>
                <span className="text-[11px] text-slate-400 dark:text-slate-500">
                  {slices.length} {segmentPlural}
                </span>
              </>
            )}
          </div>
        </div>

        {/* legend */}
        <div className="grid w-full grid-cols-1 gap-1 sm:max-h-[200px] sm:overflow-y-auto sm:pr-1">
          {arcs.map((a) => {
            const isHover = hover === a.index;
            return (
              <button
                key={a.key}
                type="button"
                onMouseEnter={() => setHover(a.index)}
                onMouseLeave={() => setHover(null)}
                onClick={() => onPick?.(a.key)}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1 text-left text-xs transition-colors",
                  isHover ? "bg-slate-100 dark:bg-white/[0.06]" : "",
                )}
              >
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: a.color }}
                />
                <span className="flex-1 truncate text-slate-600 dark:text-slate-300">
                  {a.label}
                </span>
                <span className="tnum font-semibold text-slate-700 dark:text-slate-200">
                  {compact(a.value)}
                </span>
                <span className="tnum w-10 text-right text-slate-400 dark:text-slate-500">
                  {(a.frac * 100).toFixed(1)}%
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </ChartCard>
  );
}

/* ===========================================================================
 * Horizontal bar chart — top segments (metric toggle, reacts to filters)
 * ======================================================================== */
type BarMetric = "stars" | "new" | "forks" | "contributors";

export function BarSegmentChart({
  range,
  segment,
}: {
  range: RangeKey;
  segment: SegmentKey;
}) {
  const [metric, setMetric] = useState<BarMetric>("stars");

  const slices: SegmentSlice[] = useMemo(() => {
    if (metric === "new") return segmentAggregates(segment, range);
    return segmentTotals(segment, metric);
  }, [metric, segment, range]);

  const max = Math.max(...slices.map((s) => s.value), 1);
  const total = slices.reduce((a, s) => a + s.value, 0);
  const [hover, setHover] = useState<number | null>(null);

  const metricLabel: Record<BarMetric, string> = {
    stars: "Total stars",
    new: "New stars",
    forks: "Forks",
    contributors: "Contributors",
  };
  const segmentPlural = segment === "language" ? "languages" : "categories";

  return (
    <ChartCard
      title={`Top ${segmentPlural}`}
      subtitle={`${metricLabel[metric]} · ${segment} view`}
      icon="layers"
      right={
        <SegmentedControl<BarMetric>
          size="sm"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "stars", label: "Stars" },
            { value: "new", label: "New" },
            { value: "forks", label: "Forks" },
            { value: "contributors", label: "Devs" },
          ]}
        />
      }
      bodyClassName="px-5 pb-4 pt-1"
    >
      <div className="space-y-2.5">
        {slices.map((s, i) => {
          const w = (s.value / max) * 100;
          const share = (s.value / total) * 100;
          const isHover = hover === i;
          return (
            <div
              key={s.key}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              className="group"
            >
              <div className="mb-1 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {s.label}
                  </span>
                </div>
                <span className="tnum font-semibold text-slate-600 dark:text-slate-300">
                  {compact(s.value)}
                </span>
              </div>
              <div className="relative h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/[0.05]">
                <motion.div
                  className="absolute inset-y-0 left-0 rounded-full"
                  style={{
                    background: `linear-gradient(90deg, ${s.color}, ${s.color}cc)`,
                    boxShadow: isHover ? `0 0 12px ${s.color}80` : "none",
                  }}
                  initial={false}
                  animate={{ width: `${w}%` }}
                  transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              {isHover && (
                <div className="mt-1 pl-4 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="tnum">{full(s.value)}</span> ·{" "}
                  <span className="tnum">{share.toFixed(1)}%</span> of all{" "}
                  {segment}s
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2 text-[11px] text-slate-400 dark:border-white/[0.05] dark:text-slate-500">
        <Icon name="filter" className="h-3 w-3" />
        Switch segment above to regroup by language or category.
      </div>
    </ChartCard>
  );
}
