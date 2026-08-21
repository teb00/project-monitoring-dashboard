import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "./ui";
import { compact } from "@/lib/format";
import { segmentTimeline } from "@/data/analytics";
import { chartColors } from "@/hooks/useTheme";
import type { SegmentKey } from "@/types";

type Pt = { x: number; y: number };

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
      `C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(
        1,
      )}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`,
    );
  }
  return d.join(" ");
}

export function Streamgraph({
  segment,
  isDark,
}: {
  segment: SegmentKey;
  isDark: boolean;
}) {
  const data = useMemo(() => segmentTimeline(segment, 6, 12), [segment]);
  const colors = isDark ? chartColors.dark : chartColors.light;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(700);
  const [hover, setHover] = useState<number | null>(null);

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

  const H = 260;
  const pad = { top: 14, right: 14, bottom: 26, left: 14 };
  const plotW = Math.max(10, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;
  const buckets = data.labels.length;

  const geom = useMemo(() => {
    // cumulative tops/bottoms per bucket
    const bottoms = data.layers.map(() => new Array(buckets).fill(0));
    const totals = new Array(buckets).fill(0);
    data.layers.forEach((layer, li) => {
      let cum = 0;
      for (let b = 0; b < buckets; b++) {
        bottoms[li][b] = cum;
        cum += layer.values[b];
        totals[b] = Math.max(totals[b], cum);
      }
    });
    const globalMax = Math.max(...totals, 1);
    const scaleY = plotH / globalMax;
    const midY = pad.top + plotH / 2;
    const xAt = (b: number) => pad.left + (plotW * b) / (buckets - 1);

    const layerPaths = data.layers.map((layer, li) => {
      const topPts: Pt[] = [];
      const botPts: Pt[] = [];
      for (let b = 0; b < buckets; b++) {
        const topCum = bottoms[li][b] + layer.values[b];
        const screenTop = midY + (topCum - totals[b] / 2) * scaleY;
        const screenBot = midY + (bottoms[li][b] - totals[b] / 2) * scaleY;
        topPts.push({ x: xAt(b), y: screenTop });
        botPts.push({ x: xAt(b), y: screenBot });
      }
      const topPath = smooth(topPts);
      const botPath = smooth([...botPts].reverse());
      const area =
        topPts.length > 1
          ? `${topPath} L ${botPts[botPts.length - 1].x.toFixed(1)} ${botPts[
              botPts.length - 1
            ].y.toFixed(1)} ${botPath.slice(1)} L ${topPts[0].x.toFixed(1)} ${topPts[0].y.toFixed(1)} Z`
          : "";
      return { key: layer.key, color: layer.color, area, topPts, values: layer.values };
    });

    return { layerPaths, xAt, totals };
  }, [data, plotW, plotH, buckets]);

  const handleMove = (clientX: number) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = clientX - rect.left - pad.left;
    const b = Math.round((x / plotW) * (buckets - 1));
    setHover(Math.max(0, Math.min(buckets - 1, b)));
  };

  const tooltipLeft = hover != null ? geom.xAt(hover) : 0;
  const breakdown =
    hover != null
      ? data.layers
          .map((l) => ({ key: l.key, color: l.color, value: l.values[hover] }))
          .filter((l) => l.value > 0)
          .sort((a, b) => b.value - a.value)
      : [];

  return (
    <ChartCard
      title="Ecosystem stream"
      subtitle={`Monthly new stars by ${segment} · last 12 months`}
      icon="layers"
      bodyClassName="px-1"
    >
      <div
        ref={wrapRef}
        className="relative w-full select-none"
        style={{ height: H }}
        onPointerMove={(e) => handleMove(e.clientX)}
        onPointerLeave={() => setHover(null)}
      >
        <svg width={width} height={H} className="block">
          {geom.layerPaths.map((lp, i) => (
            <motion.path
              key={lp.key}
              d={lp.area}
              fill={lp.color}
              fillOpacity={hover == null ? 0.82 : 0.55}
              stroke={lp.color}
              strokeWidth={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: i * 0.05 }}
            />
          ))}

          {/* x labels */}
          {data.labels.map((label, b) => (
            <text
              key={b}
              x={geom.xAt(b)}
              y={H - 8}
              textAnchor="middle"
              fontSize={10}
              fill={colors.text}
            >
              {label}
            </text>
          ))}

          {hover != null && (
            <line
              x1={geom.xAt(hover)}
              x2={geom.xAt(hover)}
              y1={pad.top}
              y2={pad.top + plotH}
              stroke={colors.axis}
              strokeWidth={1}
              strokeDasharray="4 3"
            />
          )}
        </svg>

        {hover != null && (
          <div
            className="pointer-events-none absolute z-10 min-w-[150px] -translate-x-1/2 rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: Math.max(80, Math.min(width - 80, tooltipLeft)),
              top: 8,
            }}
          >
            <div className="mb-1 text-[10px] uppercase tracking-wide text-slate-400">
              {data.labels[hover]} · {compact(geom.totals[hover])} stars
            </div>
            {breakdown.slice(0, 5).map((b) => (
              <div key={b.key} className="flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: b.color }}
                />
                <span className="flex-1 truncate">{b.key}</span>
                <span className="tnum font-semibold">{compact(b.value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </ChartCard>
  );
}
