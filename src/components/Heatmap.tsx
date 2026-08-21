import { useMemo, useState } from "react";
import { ChartCard } from "./ui";
import { compact, full } from "@/lib/format";
import { commitHeatmap } from "@/data/analytics";

const LEVEL_LIGHT = ["#eef1f5", "#c6e8b8", "#7bc96f", "#2ea043", "#116329"];
const LEVEL_DARK = ["#161b22", "#0e4429", "#006d32", "#26a641", "#39d353"];
const WEEKDAYS = ["", "Mon", "", "Wed", "", "Fri", ""];

export function Heatmap({ isDark }: { isDark: boolean }) {
  const data = useMemo(() => commitHeatmap(), []);
  const levels = isDark ? LEVEL_DARK : LEVEL_LIGHT;
  const [hover, setHover] = useState<{
    x: number;
    y: number;
    date: string;
    count: number;
  } | null>(null);

  const cell = 13;
  const gap = 3;
  const pitch = cell + gap;
  const left = 34;
  const top = 20;
  const width = left + data.weeks * pitch;
  const height = top + 7 * pitch;

  const grid = useMemo(() => {
    const m = new Map<string, (typeof data.cells)[number]>();
    for (const c of data.cells) m.set(`${c.week}-${c.row}`, c);
    return m;
  }, [data.cells]);

  return (
    <ChartCard
      title="Commit pulse"
      subtitle={`${compact(data.total)} commits in the last year · click-free heatmap`}
      icon="commit"
      bodyClassName="px-4 pb-3"
    >
      <div className="overflow-x-auto pb-1">
        <div className="relative" style={{ width, minWidth: "100%" }}>
          <svg width={width} height={height} className="block">
            {/* month labels */}
            {data.monthLabels.map((ml) => (
              <text
                key={`${ml.week}-${ml.label}`}
                x={left + ml.week * pitch}
                y={12}
                fontSize={10}
                fill="currentColor"
                className="text-slate-400 dark:text-slate-500"
              >
                {ml.label}
              </text>
            ))}
            {/* weekday labels */}
            {WEEKDAYS.map((wd, i) =>
              wd ? (
                <text
                  key={wd}
                  x={4}
                  y={top + i * pitch + pitch / 2 + 3}
                  fontSize={9}
                  fill="currentColor"
                  className="text-slate-400 dark:text-slate-500"
                >
                  {wd}
                </text>
              ) : null,
            )}
            {/* cells */}
            {Array.from({ length: data.weeks }).map((_, w) =>
              Array.from({ length: 7 }).map((_, r) => {
                const c = grid.get(`${w}-${r}`);
                if (!c) return null;
                return (
                  <rect
                    key={`${w}-${r}`}
                    x={left + w * pitch}
                    y={top + r * pitch}
                    width={cell}
                    height={cell}
                    rx={3}
                    fill={levels[c.level]}
                    className="cursor-pointer transition-opacity hover:opacity-70"
                    onMouseEnter={() =>
                      setHover({
                        x: left + w * pitch + cell / 2,
                        y: top + r * pitch,
                        date: new Date(c.date + "T00:00:00").toLocaleDateString(
                          "en-US",
                          { month: "short", day: "numeric", year: "numeric" },
                        ),
                        count: c.count,
                      })
                    }
                    onMouseLeave={() => setHover(null)}
                  />
                );
              }),
            )}
          </svg>

          {hover && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-lg border border-white/10 bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
              style={{ left: hover.x, top: hover.y - 6 }}
            >
              <div className="font-semibold tnum">{full(hover.count)} commits</div>
              <div className="text-[10px] text-slate-300">{hover.date}</div>
            </div>
          )}
        </div>
      </div>

      {/* legend */}
      <div className="mt-2 flex items-center justify-end gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
        <span>Less</span>
        {levels.map((c, i) => (
          <span
            key={i}
            className="h-3 w-3 rounded-[3px]"
            style={{ background: c }}
          />
        ))}
        <span>More</span>
      </div>
    </ChartCard>
  );
}
