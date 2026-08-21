import { useMemo, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/Header";
import { FilterBar } from "@/components/FilterBar";
import { KpiGrid } from "@/components/KpiGrid";
import { TrendChart } from "@/components/TrendChart";
import { BarSegmentChart, DonutSegmentChart } from "@/components/SegmentCharts";
import { TrendingCard } from "@/components/TrendingCard";
import { ProjectsTable } from "@/components/ProjectsTable";
import { Heatmap } from "@/components/Heatmap";
import { Streamgraph } from "@/components/Streamgraph";
import { BubbleChart } from "@/components/BubbleChart";
import { ActivityFeed } from "@/components/ActivityFeed";
import { Insights } from "@/components/Insights";
import { FadeIn } from "@/components/ui";
import { useTheme } from "@/hooks/useTheme";
import { useDashboardQuery } from "@/hooks/useDashboardQuery";
import { computeKpis } from "@/data/analytics";
import type { SegmentKey } from "@/types";

const SEG_LABEL: Record<SegmentKey, string> = {
  language: "Language",
  category: "Category",
};

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
        {children}
      </h2>
      <div className="h-px flex-1 bg-slate-200/70 dark:bg-white/[0.07]" />
    </div>
  );
}

function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <motion.div
        className="absolute -left-32 -top-32 h-[34rem] w-[34rem] rounded-full bg-indigo-500/20 blur-[130px] dark:bg-indigo-600/20"
        animate={{ x: [0, 60, 0], y: [0, 40, 0], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-40 top-1/3 h-[30rem] w-[30rem] rounded-full bg-cyan-400/15 blur-[130px] dark:bg-cyan-500/15"
        animate={{ x: [0, -50, 0], y: [0, 60, 0], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

export default function App() {
  const { isDark, toggle } = useTheme();
  const {
    range,
    segment,
    cross,
    setRange,
    setSegment,
    setCross,
  } = useDashboardQuery();
  const [tick, setTick] = useState(0);
  const [isCopied, setIsCopied] = useState(false);
  const [shareFailed, setShareFailed] = useState(false);
  const [updatedAt, setUpdatedAt] = useState(() =>
    new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  );

  const kpis = useMemo(() => {
    return computeKpis(range);
  }, [range]);

  const handleRefresh = () => {
    setTick((t) => t + 1);
    setUpdatedAt(
      new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
    );
  };

  const handleShare = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(window.location.href);
      } else {
        throw new Error("Clipboard API unavailable");
      }
      setShareFailed(false);
      setIsCopied(true);
      window.setTimeout(() => setIsCopied(false), 1800);
    } catch {
      setIsCopied(false);
      setShareFailed(true);
      window.setTimeout(() => setShareFailed(false), 1800);
    }
  };

  const pickDonut = (value: string) =>
    setCross(
      cross && cross.seg === segment && cross.value === value
        ? null
        : { seg: segment, value },
    );
  const pickBubble = (category: string) =>
    setCross(
      cross && cross.seg === "category" && cross.value === category
        ? null
        : { seg: "category", value: category },
    );

  const crossLabel = cross
    ? `${SEG_LABEL[cross.seg]} · ${cross.value}`
    : null;

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <Aurora />
      <Header isDark={isDark} onToggleTheme={toggle} />

      <main className="mx-auto max-w-[1400px] space-y-6 px-4 py-6 sm:px-6">
        <FadeIn>
          <FilterBar
            range={range}
            segment={segment}
            onRangeChange={setRange}
            onSegmentChange={setSegment}
            onRefresh={handleRefresh}
            updatedAt={updatedAt}
            onShare={handleShare}
            shareLabel={
              isCopied ? "Copied" : shareFailed ? "Copy unavailable" : "Share view"
            }
            crossLabel={crossLabel}
            onClearCross={() => setCross(null)}
          />
        </FadeIn>

        {/* KPI summary */}
        <FadeIn delay={0.05}>
          <SectionLabel>Performance overview</SectionLabel>
        </FadeIn>
        <KpiGrid key={`${range}-${tick}`} kpis={kpis} />

        {/* Simulated pulse */}
        <FadeIn delay={0.05}>
          <SectionLabel>Pulse preview</SectionLabel>
        </FadeIn>
        <div className="grid gap-4 xl:grid-cols-3">
          <FadeIn delay={0.05}>
            <ActivityFeed />
          </FadeIn>
          <FadeIn className="xl:col-span-2" delay={0.1}>
            <Insights range={range} />
          </FadeIn>
        </div>

        {/* Activity + distribution */}
        <FadeIn delay={0.05}>
          <SectionLabel>Activity &amp; distribution</SectionLabel>
        </FadeIn>
        <div className="grid gap-4 xl:grid-cols-3">
          <FadeIn className="xl:col-span-2" delay={0.05}>
            <TrendChart range={range} isDark={isDark} />
          </FadeIn>
          <FadeIn delay={0.12}>
            <DonutSegmentChart
              range={range}
              segment={segment}
              onPick={pickDonut}
            />
          </FadeIn>
        </div>

        {/* Engagement heatmap */}
        <FadeIn delay={0.05}>
          <Heatmap isDark={isDark} />
        </FadeIn>

        {/* Ecosystem */}
        <FadeIn delay={0.05}>
          <SectionLabel>Ecosystem &amp; momentum</SectionLabel>
        </FadeIn>
        <div className="grid gap-4 xl:grid-cols-3">
          <FadeIn className="xl:col-span-2" delay={0.05}>
            <Streamgraph segment={segment} isDark={isDark} />
          </FadeIn>
          <FadeIn delay={0.12}>
            <TrendingCard range={range} />
          </FadeIn>
        </div>

        {/* Landscape */}
        <FadeIn delay={0.05}>
          <SectionLabel>Project landscape</SectionLabel>
        </FadeIn>
        <div className="grid gap-4 xl:grid-cols-3">
          <FadeIn className="xl:col-span-2" delay={0.05}>
            <BubbleChart
              range={range}
              isDark={isDark}
              activeCategory={cross?.seg === "category" ? cross.value : null}
              onPick={pickBubble}
            />
          </FadeIn>
          <FadeIn delay={0.12}>
            <BarSegmentChart range={range} segment={segment} />
          </FadeIn>
        </div>

        {/* Repositories */}
        <FadeIn delay={0.05}>
          <SectionLabel>Repositories</SectionLabel>
        </FadeIn>
        <FadeIn delay={0.08}>
          <ProjectsTable
            range={range}
            lockedCategory={cross?.seg === "category" ? cross.value : null}
            lockedLanguage={cross?.seg === "language" ? cross.value : null}
            onClearLock={() => setCross(null)}
          />
        </FadeIn>

        <footer className="flex flex-col items-center justify-between gap-2 border-t border-slate-200/70 pt-5 text-xs text-slate-400 dark:border-white/[0.06] dark:text-slate-500 sm:flex-row">
          <p>
            RepoRadar · An analytics dashboard for{" "}
            <span className="font-medium text-slate-500 dark:text-slate-400">
              computer-systems projects
            </span>{" "}
            on GitHub.
          </p>
          <p>Simulated data for demonstration · built with React, Tailwind &amp; Framer Motion</p>
        </footer>
      </main>
    </div>
  );
}
