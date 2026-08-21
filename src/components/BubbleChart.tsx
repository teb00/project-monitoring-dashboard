import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { ChartCard } from "./ui";
import { compact } from "@/lib/format";
import { bubbleData } from "@/data/analytics";
import { colorForSegment } from "@/data/dataset";
import { chartColors } from "@/hooks/useTheme";
import type { RangeKey } from "@/types";

const log = (n: number) => Math.log10(Math.max(1, n));
const X0 = 800;
const X1 = 250000;
const Y0 = 80;
const Y1 = 60000;
const X_TICKS = [1000, 10000, 100000];
const Y_TICKS = [100, 1000, 10000, 100000];

export function BubbleChart({
  range,
  isDark,
  activeCategory,
  onPick,
}: {
  range: RangeKey;
  isDark: boolean;
  activeCategory: string | null;
  onPick: (category: string) => void;
}) {
  const points = useMemo(() => bubbleData(range), [range]);
  const colors = isDark ? chartColors.dark : chartColors.light;
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
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

  const H = 320;
  const pad = { top: 16, right: 16, bottom: 34, left: 46 };
  const plotW = Math.max(10, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;

  const maxGain = Math.max(...points.map((p) => p.gain), 1);

  const pos = (p: (typeof points)[number]) => {
    const x =
      pad.left +
      ((log(p.stars) - log(X0)) / (log(X1) - log(X0))) * plotW;
    const y =
      pad.top +
      plotH *
        (1 - (log(p.forks) - log(Y0)) / (log(Y1) - log(Y0)));
    const r = Math.max(4, 4 + (Math.sqrt(p.gain) / Math.sqrt(maxGain)) * 22);
    return { x, y, r };
  };

  const tickX = (v: number) =>
    pad.left + ((log(v) - log(X0)) / (log(X1) - log(X0))) * plotW;
  const tickY = (v: number) =>
    pad.top + plotH * (1 - (log(v) - log(Y0)) / (log(Y1) - log(Y0)));

  const hovered = hover != null ? points[hover] : null;
  const hp = hovered ? pos(hovered) : null;

  return (
    <ChartCard
      title="Project landscape"
      subtitle="Stars vs forks · bubble size = recent growth · click to filter"
      icon="spark"
      bodyClassName="px-1"
    >
      <div ref={wrapRef} className="relative w-full" style={{ height: H }}>
        <svg width={width} height={H} className="block">
          {/* grid + y ticks */}
          {Y_TICKS.map((v) => (
            <g key={v}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tickY(v)}
                y2={tickY(v)}
                stroke={colors.grid}
                strokeWidth={1}
                strokeDasharray="3 4"
              />
              <text
                x={pad.left - 8}
                y={tickY(v) + 3.5}
                textAnchor="end"
                fontSize={10}
                fill={colors.text}
              >
                {compact(v)}
              </text>
            </g>
          ))}
          {/* x ticks */}
          {X_TICKS.map((v) => (
            <text
              key={v}
              x={tickX(v)}
              y={H - 12}
              textAnchor="middle"
              fontSize={10}
              fill={colors.text}
            >
              {compact(v)}
            </text>
          ))}
          <text
            x={width / 2}
            y={H - 0.5}
            textAnchor="middle"
            fontSize={9}
            fill={colors.text}
            opacity={0.7}
          >
            stars →
          </text>

          {/* bubbles */}
          {points.map((p, i) => {
            const { x, y, r } = pos(p);
            const col = colorForSegment("category", p.category);
            const dim =
              (activeCategory && p.category !== activeCategory) ||
              (hover != null && hover !== i);
            const isActive = activeCategory === p.category;
            return (
              <motion.circle
                key={p.id}
                cx={x}
                cy={y}
                r={r}
                fill={col}
                fillOpacity={dim ? 0.08 : 0.45}
                stroke={col}
                strokeWidth={isActive ? 2.5 : 1.5}
                strokeOpacity={dim ? 0.25 : 0.9}
                initial={{ scale: 0, opacity: 0 }}
                animate={{
                  scale: 1,
                  opacity: dim ? 0.4 : 1,
                }}
                transition={{
                  duration: 0.5,
                  delay: Math.min(i * 0.015, 0.5),
                  type: "spring",
                  stiffness: 160,
                  damping: 18,
                }}
                style={{ cursor: "pointer", transformOrigin: `${x}px ${y}px` }}
                onPointerEnter={() => setHover(i)}
                onPointerLeave={() => setHover(null)}
                onClick={() => onPick(p.category)}
              />
            );
          })}

          {hp && hovered && (
            <line
              x1={pad.left}
              x2={hp.x}
              y1={hp.y}
              y2={hp.y}
              stroke={colors.axis}
              strokeWidth={1}
              strokeDasharray="3 3"
            />
          )}
        </svg>

        {hp && hovered && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-slate-900 px-3 py-2 text-xs text-white shadow-lg"
            style={{
              left: Math.max(70, Math.min(width - 70, hp.x)),
              top: hp.y - hp.r - 8,
            }}
          >
            <div className="flex items-center gap-1.5 font-semibold">
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: hovered.langColor }}
              />
              {hovered.owner}/{hovered.name}
            </div>
            <div className="mt-0.5 text-[10px] text-slate-300">
              {hovered.category}
            </div>
            <div className="mt-1 grid grid-cols-3 gap-2 tnum">
              <span>
                <span className="text-amber-400">★</span> {compact(hovered.stars)}
              </span>
              <span>
                <span className="text-cyan-400">⑂</span> {compact(hovered.forks)}
              </span>
              <span className="text-emerald-400">+{compact(hovered.gain)}</span>
            </div>
          </div>
        )}
      </div>
    </ChartCard>
  );
}
