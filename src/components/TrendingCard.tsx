import { useMemo } from "react";
import { ChartCard, Icon } from "./ui";
import { compact, full } from "@/lib/format";
import { trending } from "@/data/analytics";
import type { RangeKey } from "@/types";

export function TrendingCard({ range }: { range: RangeKey }) {
  const items = useMemo(() => trending(range, 6), [range]);

  return (
    <ChartCard
      title="Trending right now"
      subtitle={`Fastest-rising repos · last ${range.toLowerCase()}`}
      icon="flame"
      bodyClassName="px-3 pb-3"
    >
      <div className="space-y-1">
        {items.map((it, i) => (
          <a
            key={it.repo}
            href={`https://github.com/${it.repo}`}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
          >
            <span
              className={
                "grid h-7 w-7 shrink-0 place-items-center rounded-lg text-xs font-bold " +
                (i === 0
                  ? "bg-amber-400/20 text-amber-600 dark:text-amber-400"
                  : i === 1
                    ? "bg-slate-300/40 text-slate-600 dark:bg-white/10 dark:text-slate-300"
                    : i === 2
                      ? "bg-orange-400/15 text-orange-600 dark:text-orange-400"
                      : "bg-slate-100 text-slate-400 dark:bg-white/[0.05] dark:text-slate-500")
              }
            >
              {i + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ background: it.languageColor }}
                />
                <span className="truncate text-[13px] font-semibold text-slate-800 group-hover:text-indigo-600 dark:text-slate-100 dark:group-hover:text-indigo-400">
                  {it.name}
                </span>
              </div>
              <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                {it.owner} · {it.category}
              </div>
            </div>

            <div className="flex shrink-0 flex-col items-end">
              <span className="inline-flex items-center gap-0.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <Icon name="star" className="h-3 w-3" />
                +{compact(it.gain)}
              </span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                {full(it.totalStars)} total
              </span>
            </div>
          </a>
        ))}
      </div>
    </ChartCard>
  );
}
