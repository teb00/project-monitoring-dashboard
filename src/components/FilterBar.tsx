import { Icon, SegmentedControl } from "./ui";
import type { RangeKey, SegmentKey } from "@/types";
import { RANGE_META } from "@/data/analytics";

export function FilterBar({
  range,
  segment,
  onRangeChange,
  onSegmentChange,
  onRefresh,
  onShare,
  shareLabel,
  updatedAt,
  crossLabel,
  onClearCross,
}: {
  range: RangeKey;
  segment: SegmentKey;
  onRangeChange: (r: RangeKey) => void;
  onSegmentChange: (s: SegmentKey) => void;
  onRefresh: () => void;
  onShare: () => void;
  shareLabel: string;
  updatedAt: string;
  crossLabel?: string | null;
  onClearCross?: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-wrap items-center gap-2">
        <span className="hidden items-center gap-1.5 text-xs font-medium text-slate-400 dark:text-slate-500 sm:inline-flex">
          <Icon name="filter" className="h-3.5 w-3.5" />
          Filters
        </span>
        <SegmentedControl<RangeKey>
          value={range}
          onChange={onRangeChange}
          options={RANGE_META.map((r) => ({
            value: r.key,
            label: r.key,
          }))}
        />
        <div className="hidden h-5 w-px bg-slate-200 dark:bg-white/10 sm:block" />
        <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
          Group by
        </span>
        <SegmentedControl<SegmentKey>
          size="sm"
          value={segment}
          onChange={onSegmentChange}
          options={[
            { value: "language", label: "Language" },
            { value: "category", label: "Category" },
          ]}
        />
        {crossLabel && (
          <button
            type="button"
            onClick={onClearCross}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          >
            <Icon name="filter" className="h-3.5 w-3.5" />
            {crossLabel}
            <span className="ml-0.5 text-indigo-400">✕</span>
          </button>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 lg:justify-end">
        <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
          </span>
          <span className="tnum">Demo data · refreshed {updatedAt}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onShare}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-medium text-indigo-700 transition-colors hover:bg-indigo-100 active:scale-[0.97] dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300 dark:hover:bg-indigo-500/20"
          >
            <Icon name="link" className="h-3.5 w-3.5" strokeWidth={2.2} />
            {shareLabel}
          </button>
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 active:scale-[0.97] dark:border-white/10 dark:bg-white/[0.03] dark:text-slate-300 dark:hover:bg-white/[0.07]"
          >
            <Icon name="refresh" className="h-3.5 w-3.5" strokeWidth={2.2} />
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
