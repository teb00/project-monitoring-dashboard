import { useMemo, useState } from "react";
import { Card, Icon, Sparkline } from "./ui";
import { compact, full, pct } from "@/lib/format";
import {
  CATEGORIES,
  DAYS,
  LANGUAGES,
  PROJECTS,
  colorForSegment,
  gainInRange,
} from "@/data/dataset";
import { rangeDays, resampleNum } from "@/data/analytics";
import type { Project, RangeKey } from "@/types";
import { cn } from "@/utils/cn";

type SortKey =
  | "name"
  | "category"
  | "stars"
  | "forks"
  | "contributors"
  | "growth";

interface Row {
  p: Project;
  gain: number;
  spark: number[];
}

export function ProjectsTable({
  range,
  lockedCategory = null,
  lockedLanguage = null,
  onClearLock,
}: {
  range: RangeKey;
  lockedCategory?: string | null;
  lockedLanguage?: string | null;
  onClearLock?: () => void;
}) {
  const locked = lockedCategory || lockedLanguage;
  const [sortKey, setSortKey] = useState<SortKey>("stars");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [query, setQuery] = useState("");
  const [lang, setLang] = useState("all");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 15;

  const days = rangeDays(range);

  const rows = useMemo<Row[]>(() => {
    const start = Math.max(0, DAYS - days);
    return PROJECTS.map((p) => {
      const gain = gainInRange(p, days);
      let run = 0;
      const cum = p.increments.slice(start).map((x) => (run += x));
      return { p, gain, spark: resampleNum(cum, 18) };
    });
  }, [days]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter(({ p }) => {
      if (lockedLanguage && p.language !== lockedLanguage) return false;
      if (lockedCategory && p.category !== lockedCategory) return false;
      if (lang !== "all" && p.language !== lang) return false;
      if (category !== "all" && p.category !== category) return false;
      if (!q) return true;
      return (
        p.repo.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q)
      );
    });
  }, [rows, query, lang, category, lockedLanguage, lockedCategory]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      let av: number | string;
      let bv: number | string;
      switch (sortKey) {
        case "name":
          av = a.p.repo.toLowerCase();
          bv = b.p.repo.toLowerCase();
          break;
        case "category":
          av = a.p.category.toLowerCase();
          bv = b.p.category.toLowerCase();
          break;
        case "forks":
          av = a.p.forks;
          bv = b.p.forks;
          break;
        case "contributors":
          av = a.p.contributors;
          bv = b.p.contributors;
          break;
        case "growth":
          av = a.gain;
          bv = b.gain;
          break;
        default:
          av = a.p.stars;
          bv = b.p.stars;
      }
      if (typeof av === "string" && typeof bv === "string") {
        return av.localeCompare(bv) * dir;
      }
      return ((av as number) - (bv as number)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "name" || key === "category" ? "asc" : "desc");
    }
    setPage(1);
  };

  const selectCls =
    "rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 outline-none transition-colors focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-300";

  const headers: { key: SortKey; label: string; align: "left" | "right" }[] = [
    { key: "name", label: "Repository", align: "left" },
    { key: "category", label: "Category", align: "left" },
    { key: "stars", label: "Stars", align: "right" },
    { key: "forks", label: "Forks", align: "right" },
    { key: "contributors", label: "Devs", align: "right" },
    { key: "growth", label: `Growth · ${range}`, align: "right" },
  ];

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const paginated = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Reset to page 1 when filters change
  const handleQueryChange = (v: string) => { setQuery(v); setPage(1); };
  const handleLangChange = (v: string) => { setLang(v); setPage(1); };
  const handleCategoryChange = (v: string) => { setCategory(v); setPage(1); };

  return (
    <Card className="overflow-hidden">
      {/* filter row */}
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-white/[0.05] lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
            <Icon name="repo" className="h-[18px] w-[18px]" />
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              Tracked repositories
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {sorted.length} of {PROJECTS.length} projects
              {locked && (
                <button
                  type="button"
                  onClick={onClearLock}
                  className="ml-2 inline-flex items-center gap-1 rounded-md border border-indigo-200 bg-indigo-50 px-1.5 py-0.5 text-[11px] font-medium text-indigo-700 align-middle transition-colors hover:bg-indigo-100 dark:border-indigo-500/30 dark:bg-indigo-500/10 dark:text-indigo-300"
                >
                  <Icon name="filter" className="h-3 w-3" />
                  {lockedLanguage ?? lockedCategory}
                  <span className="text-indigo-400">✕</span>
                </button>
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Icon
              name="search"
              className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            />
            <input
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search repos…"
              className={cn(selectCls, "w-44 pl-8")}
            />
          </div>
          <select
            value={lang}
            onChange={(e) => handleLangChange(e.target.value)}
            className={selectCls}
          >
            <option value="all">All languages</option>
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
          <select
            value={category}
            onChange={(e) => handleCategoryChange(e.target.value)}
            className={cn(selectCls, "max-w-[180px]")}
          >
            <option value="all">All categories</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* table */}
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[820px] border-collapse text-sm"
          aria-label="Tracked GitHub repositories"
        >
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs text-slate-400 dark:border-white/[0.05] dark:text-slate-500">
              {headers.map((h) => {
                const active = sortKey === h.key;
                return (
                  <th
                    key={h.key}
                    onClick={() => toggleSort(h.key)}
                    aria-sort={
                      sortKey === h.key
                        ? sortDir === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                    }
                    className={cn(
                      "cursor-pointer select-none whitespace-nowrap px-4 py-2.5 font-semibold transition-colors hover:text-slate-700 dark:hover:text-slate-200",
                      h.align === "right" ? "text-right" : "text-left",
                      active && "text-indigo-600 dark:text-indigo-400",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-flex items-center gap-1",
                        h.align === "right" && "flex-row-reverse",
                      )}
                    >
                      {h.label}
                      <Icon
                        name={active ? (sortDir === "asc" ? "chevronUp" : "chevronDown") : "chevronDown"}
                        className={cn(
                          "h-3 w-3 transition-opacity",
                          active ? "opacity-100" : "opacity-25",
                        )}
                      />
                    </span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginated.map(({ p, gain, spark }) => {
              const langColor = colorForSegment("language", p.language);
              const gainPct = (gain / (p.stars - gain || 1)) * 100;
              return (
                <tr
                  key={p.id}
                  className="group border-b border-slate-50 transition-colors last:border-0 hover:bg-slate-50/70 dark:border-white/[0.03] dark:hover:bg-white/[0.03]"
                >
                  {/* repository */}
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <div
                        className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[11px] font-bold uppercase text-white"
                        style={{ background: langColor }}
                      >
                        {p.name.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <a
                          href={`https://github.com/${p.repo}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
                        >
                          <span className="truncate">{p.owner}/</span>
                          <span className="truncate font-bold">{p.name}</span>
                          <Icon
                            name="external"
                            className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-60"
                          />
                        </a>
                        <p className="line-clamp-1 max-w-[360px] text-xs text-slate-400 dark:text-slate-500">
                          {p.description}
                        </p>
                        <span className="mt-1 inline-flex items-center gap-1 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/[0.05] dark:text-slate-400">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: langColor }}
                          />
                          {p.language}
                        </span>
                      </div>
                    </div>
                  </td>
                  {/* category */}
                  <td className="px-4 py-3">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-white/[0.05] dark:text-slate-300">
                      {p.category}
                    </span>
                  </td>
                  {/* stars */}
                  <td className="px-4 py-3 text-right tnum font-semibold text-slate-800 dark:text-slate-100">
                    {full(p.stars)}
                  </td>
                  {/* forks */}
                  <td className="px-4 py-3 text-right tnum text-slate-600 dark:text-slate-300">
                    {compact(p.forks)}
                  </td>
                  {/* contributors */}
                  <td className="px-4 py-3 text-right tnum text-slate-600 dark:text-slate-300">
                    {full(p.contributors)}
                  </td>
                  {/* growth */}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-3">
                      <Sparkline
                        data={spark}
                        color="#10b981"
                        width={72}
                        height={26}
                        strokeWidth={1.6}
                      />
                      <div className="text-right">
                        <div className="tnum text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          {pct(gainPct)}
                        </div>
                        <div className="tnum text-[10px] text-slate-400 dark:text-slate-500">
                          +{compact(gain)}
                        </div>
                      </div>
                    </div>
                  </td>
                </tr>
              );
            })}
            {paginated.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-400">
                  No projects match your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 dark:border-white/[0.05]">
          <span className="text-xs text-slate-400 dark:text-slate-500">
            Page {safePage} of {totalPages} · {sorted.length} results
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
              aria-label="Previous page"
            >
              <Icon name="chevronUp" className="h-3.5 w-3.5 -rotate-90" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                if (idx > 0 && p - (arr[idx - 1] as number) > 1) acc.push("...");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-slate-400">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === safePage ? "page" : undefined}
                    className={cn(
                      "h-8 min-w-[2rem] rounded-lg px-2 text-xs font-medium transition-colors",
                      p === safePage
                        ? "bg-indigo-600 text-white"
                        : "border border-slate-200 text-slate-500 hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5",
                    )}
                  >
                    {p}
                  </button>
                ),
              )}
            <button
              type="button"
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
              aria-label="Next page"
            >
              <Icon name="chevronUp" className="h-3.5 w-3.5 rotate-90" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
