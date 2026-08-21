import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard, SegmentedControl } from "./ui";
import { chartColors } from "@/hooks/useTheme";
import { compact, full, pct } from "@/lib/format";
import {
  METRIC_META,
  resampleDays,
  sliceSeries,
} from "@/data/analytics";
import type { MetricKey, RangeKey } from "@/types";
import { cn } from "@/utils/cn";

const METRICS: {
  key: MetricKey;
  label: string;
  short: string;
  color: string;
  color2: string;
  totalLabel: string;
}[] = [
  { key: "newStars", label: "New stars", short: "Stars", color: "#6366f1", color2: "#a855f7", totalLabel: "Total" },
  { key: "commits", label: "Commits", short: "Commits", color: "#06b6d4", color2: "#3b82f6", totalLabel: "Total" },
  { key: "newRepos", label: "New repos", short: "Repos", color: "#f59e0b", color2: "#f97316", totalLabel: "Discovered" },
  { key: "contributors", label: "Contributors", short: "Devs", color: "#10b981", color2: "#22d3ee", totalLabel: "Average" },
];

const N = 30;

type Pt = { x: number; y: number; v: number };

function smooth(points: Pt[]): string {
  if (points.length < 2) return "";
  const d: string[] = [`M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d.push(
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    );
  }
  return d.join(" ");
}

export function TrendChart({
  range,
  isDark,
}: {
  range: RangeKey;
  isDark: boolean;
}) {
  const [metric, setMetric] = useState<MetricKey>("newStars");
  const [hover, setHover] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(720);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const meta = METRICS.find((m) => m.key === metric)!;
  const colors = isDark ? chartColors.dark : chartColors.light;

  const data = useMemo(() => {
    const slice = sliceSeries(range);
    const sampled = resampleDays(slice, N);
    return sampled;
  }, [range]);

  const H = 280;
  const pad = { top: 18, right: 18, bottom: 28, left: 46 };
  const plotW = Math.max(10, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;

  const geom = useMemo(() => {
    const values = data.map((d) => d[metric]);
    const dMax = Math.max(...values, 1);
    const dMin = Math.min(...values, 0);
    const range01 = dMax - dMin || 1;
    const yMin = Math.max(0, dMin - range01 * 0.18);
    const yMax = dMax + range01 * 0.12;

    const xAt = (i: number) => pad.left + (plotW * i) / (data.length - 1);
    const yAt = (v: number) =>
      pad.top + plotH * (1 - (v - yMin) / (yMax - yMin || 1));

    const pts: Pt[] = data.map((d, i) => ({
      x: xAt(i),
      y: yAt(d[metric]),
      v: d[metric],
    }));
    const line = smooth(pts);
    const area =
      pts.length > 1
        ? `${line} L ${pts[pts.length - 1].x.toFixed(1)} ${(pad.top + plotH).toFixed(
            1,
          )} L ${pts[0].x.toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`
        : "";

    const gridY: { y: number; label: string }[] = [];
    const steps = 4;
    for (let i = 0; i <= steps; i++) {
      const val = yMin + ((yMax - yMin) * i) / steps;
      gridY.push({ y: yAt(val), label: compact(val) });
    }

    const xTicks: { x: number; label: string }[] = [];
    const tickCount = Math.min(6, data.length);
    for (let i = 0; i < tickCount; i++) {
      const idx = Math.round((i / (tickCount - 1)) * (data.length - 1));
      xTicks.push({ x: xAt(idx), label: data[idx].label });
    }

    return { pts, line, area, gridY, xTicks, yAt, xAt };
  }, [data, metric, plotW, plotH]);

  const total = data.reduce((a, d) => a + d[metric], 0);
  const summary =
    metric === "contributors"
      ? `${full(Math.round(total / data.length))} avg`
      : `${compact(total)} ${meta.totalLabel.toLowerCase()}`;

  const handleMove = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - pad.left;
    const i = Math.round((x / plotW) * (data.length - 1));
    setHover(Math.max(0, Math.min(data.length - 1, i)));
  };

  const active = hover != null ? data[hover] : null;
  const activePt = hover != null ? geom.pts[hover] : null;
  const prevV = hover != null && hover > 0 ? data[hover - 1][metric] : null;

  const tooltipLeft = activePt
    ? Math.max(64, Math.min(width - 64, activePt.x))
    : 0;

  return (
    <ChartCard
      title="Activity over time"
      subtitle={`${summary} · ${METRIC_META[metric].short}`}
      icon="trending"
      right={
        <SegmentedControl<MetricKey>
          size="sm"
          value={metric}
          onChange={setMetric}
          options={METRICS.map((m) => ({ value: m.key, label: m.short }))}
        />
      }
      bodyClassName="px-1"
    >
      <div
        ref={wrapRef}
        className="relative w-full select-none"
        style={{ height: H }}
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg
          width={width}
          height={H}
          className="block"
          role="img"
          aria-label={`${meta.label} over the selected range`}
        >
          <defs>
            <linearGradient id={`area-${metric}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={meta.color} stopOpacity={isDark ? 0.42 : 0.3} />
              <stop offset="55%" stopColor={meta.color2} stopOpacity={isDark ? 0.14 : 0.1} />
              <stop offset="100%" stopColor={meta.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id={`line-${metric}`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={meta.color} />
              <stop offset="100%" stopColor={meta.color2} />
            </linearGradient>
          </defs>

          {/* grid */}
          {geom.gridY.map((g, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={g.y}
                y2={g.y}
                stroke={colors.grid}
                strokeWidth={1}
                strokeDasharray={i === 0 ? "0" : "3 4"}
              />
              <text
                x={pad.left - 8}
                y={g.y + 3.5}
                textAnchor="end"
                fontSize={10}
                fill={colors.text}
                className="tnum"
              >
                {g.label}
              </text>
            </g>
          ))}

          {/* x labels */}
          {geom.xTicks.map((t, i) => (
            <text
              key={i}
              x={t.x}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill={colors.text}
            >
              {t.label}
            </text>
          ))}

          {/* area + line (re-draw on metric/range change) */}
          <motion.path
            key={`area-${metric}-${range}`}
            d={geom.area}
            fill={`url(#area-${metric})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          />
          <motion.path
            key={`line-${metric}-${range}`}
            d={geom.line}
            fill="none"
            stroke={`url(#line-${metric})`}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.9, ease: "easeInOut" }}
          />

          {/* hover crosshair */}
          {activePt && (
            <g>
              <line
                x1={activePt.x}
                x2={activePt.x}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke={meta.color}
                strokeWidth={1}
                strokeDasharray="4 3"
                opacity={0.6}
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r={6.5}
                fill={meta.color}
                opacity={0.18}
              />
              <circle
                cx={activePt.x}
                cy={activePt.y}
                r={3.5}
                fill="#fff"
                stroke={meta.color}
                strokeWidth={2.5}
              />
            </g>
          )}
        </svg>

        {/* tooltip */}
        {active && activePt && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border px-3 py-2 text-xs shadow-lg"
            style={{
              left: tooltipLeft,
              top: activePt.y - 12,
              background: colors.tooltipBg,
              color: colors.tooltipText,
              borderColor: colors.tooltipBorder,
            }}
          >
            <div className="mb-0.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
              {active.weekday}, {active.label}
            </div>
            <div className="flex items-center gap-2">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: meta.color }}
              />
              <span className="font-semibold tnum">{full(active[metric])}</span>
              <span className="opacity-70">{meta.label.toLowerCase()}</span>
            </div>
            {prevV != null && (
              <div
                className={cn(
                  "mt-0.5 text-[10px] font-semibold tnum",
                  active[metric] >= prevV ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {pct(((active[metric] - prevV) / (prevV || 1)) * 100)} vs prev
              </div>
            )}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
