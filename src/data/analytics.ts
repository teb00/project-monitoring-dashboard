import {
  DAYS,
  DAYS_SERIES,
  PROJECTS,
  colorForSegment,
  gainInRange,
} from "./dataset";
import { compact as compactFor, full as fullFor } from "@/lib/format";
import type {
  DayPoint,
  Kpi,
  MetricKey,
  RangeKey,
  SegmentKey,
  SegmentSlice,
} from "@/types";

export const RANGE_META: { key: RangeKey; days: number; label: string }[] = [
  { key: "7D", days: 7, label: "7 days" },
  { key: "30D", days: 30, label: "30 days" },
  { key: "90D", days: 90, label: "3 months" },
  { key: "1Y", days: 365, label: "12 months" },
];

export const rangeDays = (k: RangeKey): number =>
  RANGE_META.find((r) => r.key === k)?.days ?? 30;

export const METRIC_META: Record<
  MetricKey,
  { label: string; short: string }
> = {
  newStars: { label: "New stars", short: "stars/day" },
  commits: { label: "Commits", short: "commits/day" },
  newRepos: { label: "New repos", short: "repos/day" },
  contributors: { label: "Contributors", short: "active/day" },
};

/** The day points within the selected range (most recent N). */
export function sliceSeries(range: RangeKey): DayPoint[] {
  const d = rangeDays(range);
  return DAYS_SERIES.slice(DAYS_SERIES.length - d);
}

/** Down/up-sample an array of numbers to exactly n points (keeps endpoints). */
export function resampleNum(arr: number[], n: number): number[] {
  if (arr.length === 0) return new Array(n).fill(0);
  if (arr.length <= n) {
    const out = arr.slice();
    while (out.length < n) out.push(arr[arr.length - 1]);
    return out;
  }
  const out: number[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

/** Down/up-sample day points to n evenly spaced samples. */
export function resampleDays(arr: DayPoint[], n: number): DayPoint[] {
  if (arr.length <= n) return arr.slice();
  const out: DayPoint[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
}

function sumMetric(metric: MetricKey, arr: DayPoint[]): number {
  let s = 0;
  for (const d of arr) s += d[metric];
  return s;
}

function avgMetric(metric: MetricKey, arr: DayPoint[]): number {
  if (arr.length === 0) return 0;
  return sumMetric(metric, arr) / arr.length;
}

function deltaPct(curr: number, prev: number): number {
  if (prev === 0) return curr > 0 ? 100 : 0;
  return ((curr - prev) / prev) * 100;
}

/** Build the five KPI summary cards for the active range. */
export function computeKpis(range: RangeKey): Kpi[] {
  const d = rangeDays(range);
  const curr = DAYS_SERIES.slice(DAYS_SERIES.length - d);
  const prev = DAYS_SERIES.slice(
    Math.max(0, DAYS_SERIES.length - d * 2),
    DAYS_SERIES.length - d,
  );

  const totalStars = PROJECTS.reduce((a, p) => a + p.stars, 0);
  const gainNow = PROJECTS.reduce((a, p) => a + gainInRange(p, d), 0);

  const sparkFrom = (metric: MetricKey, agg: "sum" | "avg" = "sum") => {
    const series = DAYS_SERIES.slice(Math.max(0, DAYS_SERIES.length - 90));
    const vals = series.map((x) => x[metric]);
    const line =
      agg === "avg"
        ? rollingAvg(vals, 7)
        : vals;
    return resampleNum(line, 24);
  };

  return [
    {
      id: "tracked",
      label: "Projects tracked",
      value: PROJECTS.length,
      display: String(PROJECTS.length),
      deltaPct: deltaPct(sumMetric("newRepos", curr), sumMetric("newRepos", prev)),
      positive: sumMetric("newRepos", curr) >= sumMetric("newRepos", prev),
      spark: sparkFrom("newRepos"),
      accent: "#6366f1",
      icon: "repo",
    },
    {
      id: "stars",
      label: "Total stars",
      value: totalStars,
      display: compactFor(totalStars),
      deltaPct: (gainNow / (totalStars - gainNow || 1)) * 100,
      positive: true,
      spark: resampleNum(
        cumulative(PROJECTS.reduce((a, p) => a + p.gain365, 0)),
        24,
      ).map((_, i, arr) => arr[i]),
      accent: "#f59e0b",
      icon: "star",
    },
    {
      id: "newStars",
      label: "New stars",
      value: sumMetric("newStars", curr),
      display: compactFor(sumMetric("newStars", curr)),
      deltaPct: deltaPct(sumMetric("newStars", curr), sumMetric("newStars", prev)),
      positive: sumMetric("newStars", curr) >= sumMetric("newStars", prev),
      spark: sparkFrom("newStars"),
      accent: "#8b5cf6",
      icon: "spark",
    },
    {
      id: "commits",
      label: "Commits",
      value: sumMetric("commits", curr),
      display: compactFor(sumMetric("commits", curr)),
      deltaPct: deltaPct(sumMetric("commits", curr), sumMetric("commits", prev)),
      positive: sumMetric("commits", curr) >= sumMetric("commits", prev),
      spark: sparkFrom("commits"),
      accent: "#06b6d4",
      icon: "commit",
    },
    {
      id: "contributors",
      label: "Active contributors",
      value: Math.round(avgMetric("contributors", curr)),
      display: fullFor(Math.round(avgMetric("contributors", curr))),
      deltaPct: deltaPct(avgMetric("contributors", curr), avgMetric("contributors", prev)),
      positive: avgMetric("contributors", curr) >= avgMetric("contributors", prev),
      spark: sparkFrom("contributors", "avg"),
      accent: "#10b981",
      icon: "users",
    },
  ];
}

/** Aggregate project stars-gained-in-range by the chosen segment. */
export function segmentAggregates(
  segment: SegmentKey,
  range: RangeKey,
): SegmentSlice[] {
  const d = rangeDays(range);
  const map = new Map<string, number>();
  for (const p of PROJECTS) {
    const key = segment === "language" ? p.language : p.category;
    map.set(key, (map.get(key) ?? 0) + gainInRange(p, d));
  }
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: key,
      value,
      color: colorForSegment(segment, key),
    }))
    .sort((a, b) => b.value - a.value);
}

/** Aggregate a static metric (stars / forks / contributors) by segment. */
export function segmentTotals(
  segment: SegmentKey,
  metric: "stars" | "forks" | "contributors",
): SegmentSlice[] {
  const map = new Map<string, number>();
  for (const p of PROJECTS) {
    const key = segment === "language" ? p.language : p.category;
    map.set(key, (map.get(key) ?? 0) + p[metric]);
  }
  return [...map.entries()]
    .map(([key, value]) => ({
      key,
      label: key,
      value,
      color: colorForSegment(segment, key),
    }))
    .sort((a, b) => b.value - a.value);
}

export interface TrendingItem {
  repo: string;
  owner: string;
  name: string;
  language: string;
  languageColor: string;
  category: string;
  gain: number;
  sharePct: number;
  totalStars: number;
}

/** Fastest-rising repos by stars gained in the active range. */
export function trending(range: RangeKey, n = 6): TrendingItem[] {
  const d = rangeDays(range);
  const items = PROJECTS.map((p) => {
    const gain = gainInRange(p, d);
    return { p, gain };
  }).sort((a, b) => b.gain - a.gain);
  const total = items.reduce((a, x) => a + x.gain, 0) || 1;
  return items.slice(0, n).map(({ p, gain }) => ({
    repo: p.repo,
    owner: p.owner,
    name: p.name,
    language: p.language,
    languageColor: colorForSegment("language", p.language),
    category: p.category,
    gain,
    sharePct: (gain / total) * 100,
    totalStars: p.stars,
  }));
}

function rollingAvg(vals: number[], win: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < vals.length; i++) {
    let s = 0;
    let c = 0;
    for (let j = Math.max(0, i - win + 1); j <= i; j++) {
      s += vals[j];
      c++;
    }
    out.push(s / c);
  }
  return out;
}
function cumulative(seed: number): number[] {
  // a gentle rising cumulative curve for the "total stars" sparkline
  const arr: number[] = [];
  let v = seed * 0.82;
  for (let i = 0; i < 90; i++) {
    arr.push(v);
    v += (seed * 0.18) / 90 + (Math.sin(i / 9) * seed) / 4000;
  }
  return arr;
}

/* ===========================================================================
 * Contributions heatmap — commit intensity over the last year
 * ======================================================================== */
export interface HeatCell {
  date: string;
  count: number;
  level: number;
  week: number;
  row: number;
}
export interface HeatmapData {
  cells: HeatCell[];
  weeks: number;
  monthLabels: { week: number; label: string }[];
  max: number;
  total: number;
}

export function commitHeatmap(): HeatmapData {
  const WEEKS = 53;
  const totalCells = WEEKS * 7;
  const startIdx = Math.max(0, DAYS_SERIES.length - totalCells);
  const firstDate = new Date(DAYS_SERIES[startIdx].date + "T00:00:00");
  const w0 = firstDate.getDay();
  const cells: HeatCell[] = [];
  const counts: number[] = [];
  for (let i = startIdx; i < DAYS_SERIES.length; i++) {
    const d = DAYS_SERIES[i];
    const date = new Date(d.date + "T00:00:00");
    const dayIndex = i - startIdx;
    const week = Math.floor((dayIndex + w0) / 7);
    const row = date.getDay();
    cells.push({ date: d.date, count: d.commits, level: 0, week, row });
    counts.push(d.commits);
  }
  const positive = counts.filter((c) => c > 0).sort((a, b) => a - b);
  const thr = (p: number) =>
    positive.length
      ? positive[Math.min(positive.length - 1, Math.floor(positive.length * p))]
      : 0;
  const t33 = thr(0.4);
  const t66 = thr(0.7);
  const t90 = thr(0.9);
  for (const c of cells) {
    c.level =
      c.count === 0 ? 0 : c.count <= t33 ? 1 : c.count <= t66 ? 2 : c.count <= t90 ? 3 : 4;
  }
  const monthLabels: { week: number; label: string }[] = [];
  let lastMonth = -1;
  for (const c of cells) {
    if (c.row === 0) {
      const m = new Date(c.date + "T00:00:00").getMonth();
      if (m !== lastMonth) {
        monthLabels.push({
          week: c.week,
          label: new Date(c.date + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
          }),
        });
        lastMonth = m;
      }
    }
  }
  return {
    cells,
    weeks: WEEKS,
    monthLabels,
    max: Math.max(...counts, 1),
    total: counts.reduce((a, b) => a + b, 0),
  };
}

/* ===========================================================================
 * Streamgraph — ecosystem growth by segment over the last year
 * ======================================================================== */
export interface StreamLayer {
  key: string;
  color: string;
  values: number[];
}
export interface StreamData {
  layers: StreamLayer[];
  labels: string[];
}

export function segmentTimeline(
  segment: SegmentKey,
  topN = 6,
  buckets = 12,
): StreamData {
  const daysPerBucket = Math.ceil(DAYS / buckets);
  const tot = new Map<string, number>();
  for (const p of PROJECTS) {
    const key = segment === "language" ? p.language : p.category;
    tot.set(key, (tot.get(key) ?? 0) + p.gain365);
  }
  const top = [...tot.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map((e) => e[0]);
  const layers: StreamLayer[] = top.map((key) => {
    const color = colorForSegment(segment, key);
    const values = new Array(buckets).fill(0);
    for (const p of PROJECTS) {
      const pk = segment === "language" ? p.language : p.category;
      if (pk !== key) continue;
      for (let b = 0; b < buckets; b++) {
        const s = b * daysPerBucket;
        const e = Math.min(DAYS, (b + 1) * daysPerBucket);
        let sum = 0;
        for (let i = s; i < e; i++) sum += p.increments[i];
        values[b] += sum;
      }
    }
    return { key, color, values };
  });
  const labels: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let b = 0; b < buckets; b++) {
    const d = new Date(today);
    d.setDate(d.getDate() - (DAYS - 1 - b * daysPerBucket));
    labels.push(d.toLocaleDateString("en-US", { month: "short" }));
  }
  return { layers, labels };
}

/* ===========================================================================
 * Bubble chart data — stars vs forks, size = recent growth
 * ======================================================================== */
export interface BubblePoint {
  id: number;
  repo: string;
  owner: string;
  name: string;
  language: string;
  langColor: string;
  category: string;
  stars: number;
  forks: number;
  gain: number;
}

export function bubbleData(range: RangeKey): BubblePoint[] {
  const d = rangeDays(range);
  return PROJECTS.map((p) => ({
    id: p.id,
    repo: p.repo,
    owner: p.owner,
    name: p.name,
    language: p.language,
    langColor: colorForSegment("language", p.language),
    category: p.category,
    stars: p.stars,
    forks: p.forks,
    gain: gainInRange(p, d),
  }));
}

/* ===========================================================================
 * Auto insights — generated headline takeaways for the active range
 * ======================================================================== */
export interface Insight {
  icon: string;
  accent: string;
  title: string;
  detail: string;
}

export function generateInsights(range: RangeKey): Insight[] {
  const d = rangeDays(range);
  const slice = sliceSeries(range);
  const top = [...PROJECTS]
    .map((p) => ({ p, g: gainInRange(p, d) }))
    .sort((a, b) => b.g - a.g)[0];
  const topPct = (top.g / (top.p.stars - top.g || 1)) * 100;
  const langTot = new Map<string, number>();
  let totalNew = 0;
  for (const p of PROJECTS) {
    const g = gainInRange(p, d);
    langTot.set(p.language, (langTot.get(p.language) ?? 0) + g);
    totalNew += g;
  }
  const topLang = [...langTot.entries()].sort((a, b) => b[1] - a[1])[0];
  const busiest = [...slice].sort((a, b) => b.commits - a.commits)[0];
  const newRepos = slice.reduce((a, x) => a + x.newRepos, 0);
  return [
    {
      icon: "flame",
      accent: "#f97316",
      title: `${top.p.name} is on fire`,
      detail: `+${compactFor(top.g)} new stars this window (${topPct.toFixed(0)}% of its total).`,
    },
    {
      icon: "dot",
      accent: colorForSegment("language", topLang[0]),
      title: `${topLang[0]} leads growth`,
      detail: `Accounts for ${((topLang[1] / (totalNew || 1)) * 100).toFixed(0)}% of all new stars.`,
    },
    {
      icon: "commit",
      accent: "#06b6d4",
      title: `Peak day · ${busiest.label}`,
      detail: `${compactFor(busiest.commits)} commits — the busiest day in range.`,
    },
    {
      icon: "repo",
      accent: "#6366f1",
      title: `${newRepos} new projects`,
      detail: `Fresh computer-systems repos discovered and tracked.`,
    },
  ];
}

/* ===========================================================================
 * Live activity feed events
 * ======================================================================== */
export type ActivityKind = "star" | "fork" | "release" | "newrepo" | "issue";
export interface ActivityEvent {
  id: number;
  kind: ActivityKind;
  repo: string;
  owner: string;
  name: string;
  text: string;
  langColor: string;
  ts: number;
}
let _evId = 1;
const _kinds: ActivityKind[] = [
  "star",
  "star",
  "star",
  "fork",
  "release",
  "newrepo",
  "issue",
];
export function makeActivityEvent(): ActivityEvent {
  const p = PROJECTS[Math.floor(Math.random() * PROJECTS.length)];
  const kind = _kinds[Math.floor(Math.random() * _kinds.length)];
  let text = "";
  if (kind === "star") text = `+${20 + Math.floor(Math.random() * 220)} stars`;
  else if (kind === "fork") text = `+${1 + Math.floor(Math.random() * 12)} forks`;
  else if (kind === "release")
    text = `shipped v${1 + Math.floor(Math.random() * 5)}.${Math.floor(
      Math.random() * 9,
    )}.${Math.floor(Math.random() * 9)}`;
  else if (kind === "newrepo") text = `new project discovered`;
  else text = `${1 + Math.floor(Math.random() * 14)} issues opened`;
  return {
    id: _evId++,
    kind,
    repo: p.repo,
    owner: p.owner,
    name: p.name,
    text,
    langColor: colorForSegment("language", p.language),
    ts: Date.now(),
  };
}
export function seedActivityEvents(n: number): ActivityEvent[] {
  const out: ActivityEvent[] = [];
  for (let i = 0; i < n; i++) {
    const e = makeActivityEvent();
    e.ts = Date.now() - i * 2600;
    out.push(e);
  }
  return out;
}

export { gainInRange, DAYS };
