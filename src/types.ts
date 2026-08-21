export type RangeKey = "7D" | "30D" | "90D" | "1Y";
export type SegmentKey = "language" | "category";
export type MetricKey = "newStars" | "commits" | "newRepos" | "contributors";

export interface Project {
  id: number;
  repo: string;
  owner: string;
  name: string;
  description: string;
  language: string;
  category: string;
  stars: number;
  forks: number;
  watchers: number;
  issues: number;
  contributors: number;
  ageDays: number;
  trendBias: number;
  gain365: number;
  /** 365 daily star increments, oldest -> newest */
  increments: number[];
}

export interface DayPoint {
  date: string;
  label: string;
  weekday: string;
  newStars: number;
  commits: number;
  newRepos: number;
  contributors: number;
}

export interface Kpi {
  id: string;
  label: string;
  value: number;
  display: string;
  deltaPct: number | null;
  positive: boolean | null;
  spark: number[];
  accent: string;
  icon: "repo" | "star" | "commit" | "users" | "spark";
}

export interface SegmentSlice {
  key: string;
  label: string;
  value: number;
  color: string;
}
