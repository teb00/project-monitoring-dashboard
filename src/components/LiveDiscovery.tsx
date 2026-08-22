import { useEffect, useMemo, useRef, useState } from "react";
import { Card, Icon } from "./ui";
import {
  GitHubApiError,
  searchGitHubRepositories,
  type GitHubRepository,
} from "@/lib/github";
import { compact, full } from "@/lib/format";
import { colorForSegment } from "@/data/dataset";
import { cn } from "@/utils/cn";

const TOPIC_PRESETS = [
  { label: "Computer systems", query: "topic:computer-systems" },
  { label: "Rust", query: "language:Rust" },
  { label: "AI systems", query: "topic:machine-learning" },
  { label: "Developer tools", query: "topic:developer-tools" },
];

const FAVORITES_KEY = "reporadar-live-favorites";
const REQUEST_COOLDOWN_MS = 1_200;

function readFavorites(): number[] {
  try {
    const stored = JSON.parse(localStorage.getItem(FAVORITES_KEY) ?? "[]");
    return Array.isArray(stored) && stored.every((id) => typeof id === "number")
      ? stored
      : [];
  } catch {
    return [];
  }
}

function formatUpdatedAt(value: string): string {
  return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
    -Math.max(1, Math.round((Date.now() - new Date(value).getTime()) / 86_400_000)),
    "day",
  );
}

function exportRepositories(repositories: GitHubRepository[]): void {
  const header = ["Repository", "Description", "Language", "Stars", "Forks", "Issues", "URL"];
  const escape = (value: string | number) => {
    const text = String(value);
    const safeText = /^[\s\u0000-\u001f]*[=+\-@]/.test(text) ? `'${text}` : text;
    return `"${safeText.replace(/"/g, '""')}"`;
  };
  const rows = repositories.map((repo) =>
    [repo.fullName, repo.description, repo.language, repo.stars, repo.forks, repo.openIssues, repo.htmlUrl]
      .map(escape)
      .join(","),
  );
  const blob = new Blob([[header.map(escape).join(","), ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "reporadar-live-repositories.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function RepositoryRow({
  repository,
  isFavorite,
  onToggleFavorite,
}: {
  repository: GitHubRepository;
  isFavorite: boolean;
  onToggleFavorite: (id: number) => void;
}) {
  const languageColor = colorForSegment("language", repository.language);
  return (
    <article className="group flex flex-col gap-3 border-b border-slate-100 px-4 py-4 transition-colors last:border-0 hover:bg-slate-50/70 dark:border-white/[0.05] dark:hover:bg-white/[0.03] sm:flex-row sm:items-center">
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-xs font-bold uppercase text-white" style={{ background: languageColor }}>
        {repository.name.slice(0, 2)}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href={repository.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-slate-800 hover:text-indigo-600 dark:text-slate-100 dark:hover:text-indigo-400"
          >
            {repository.fullName}
          </a>
          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-white/[0.06] dark:text-slate-400">
            {repository.language}
          </span>
        </div>
        <p className="mt-1 line-clamp-1 text-xs text-slate-500 dark:text-slate-400">
          {repository.description}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500">
          <span className="tnum font-semibold text-amber-500">★ {compact(repository.stars)}</span>
          <span className="tnum">{compact(repository.forks)} forks</span>
          <span className="tnum">{full(repository.openIssues)} open issues</span>
          <span>updated {formatUpdatedAt(repository.updatedAt)}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:pl-3">
        <button
          type="button"
          aria-label={`${isFavorite ? "Remove" : "Add"} ${repository.fullName} ${isFavorite ? "from" : "to"} favorites`}
          aria-pressed={isFavorite}
          onClick={() => onToggleFavorite(repository.id)}
          className={cn(
            "grid h-9 w-9 place-items-center rounded-lg border transition-colors",
            isFavorite
              ? "border-amber-300 bg-amber-50 text-amber-500 dark:border-amber-500/30 dark:bg-amber-500/10"
              : "border-slate-200 text-slate-400 hover:border-amber-300 hover:text-amber-500 dark:border-white/10",
          )}
        >
          <Icon name="star" className="h-4 w-4" />
        </button>
        <a
          href={repository.htmlUrl}
          target="_blank"
          rel="noreferrer"
          aria-label={`Open ${repository.fullName} on GitHub`}
          className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 text-slate-400 transition-colors hover:border-indigo-300 hover:text-indigo-500 dark:border-white/10"
        >
          <Icon name="external" className="h-4 w-4" />
        </a>
      </div>
    </article>
  );
}

export function LiveDiscovery() {
  const [query, setQuery] = useState("");
  const [activePreset, setActivePreset] = useState(TOPIC_PRESETS[0].query);
  const [repositories, setRepositories] = useState<GitHubRepository[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [favorites, setFavorites] = useState<number[]>(readFavorites);
  const [isLoading, setIsLoading] = useState(true);
  const [isCoolingDown, setIsCoolingDown] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitReset, setRateLimitReset] = useState<number | null>(null);
  const [searchVersion, setSearchVersion] = useState(0);
  const requestIdRef = useRef(0);
  const controllerRef = useRef<AbortController | null>(null);
  const lastStartedQueryRef = useRef<string | null>(null);
  const abortTimerRef = useRef<number | null>(null);

  const search = async (searchQuery: string) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setIsLoading(true);
    setIsCoolingDown(false);
    setError(null);
    setRateLimitReset(null);
    try {
      const result = await searchGitHubRepositories(searchQuery, controller.signal);
      if (requestId !== requestIdRef.current) return;
      setRepositories(result.repositories);
      setTotalCount(result.totalCount);
      setRemaining(result.rateLimitRemaining);
      setRateLimitReset(null);
    } catch (caught) {
      if (requestId !== requestIdRef.current) return;
      if (caught instanceof DOMException && caught.name === "AbortError") {
        setError("The GitHub request timed out. Try again.");
        return;
      }
      if (caught instanceof GitHubApiError) {
        setError(caught.message);
        setRateLimitReset(caught.rateLimitReset);
      } else {
        setError("GitHub is unavailable right now. Try again in a moment.");
      }
    } finally {
      if (requestId === requestIdRef.current) {
        setIsLoading(false);
        setIsCoolingDown(true);
        window.setTimeout(() => setIsCoolingDown(false), REQUEST_COOLDOWN_MS);
      }
    }
  };

  useEffect(() => {
    const scheduleAbort = () => {
      abortTimerRef.current = window.setTimeout(() => {
        controllerRef.current?.abort();
        abortTimerRef.current = null;
      }, 0);
    };
    if (abortTimerRef.current !== null) {
      window.clearTimeout(abortTimerRef.current);
      abortTimerRef.current = null;
    }
    if (lastStartedQueryRef.current === activePreset && searchVersion === 0) return scheduleAbort;
    lastStartedQueryRef.current = activePreset;
    void search(activePreset);
    return scheduleAbort;
  }, [activePreset, searchVersion]);

  useEffect(() => {
    try {
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
    } catch {
      // Keep favorites in memory when browser storage is unavailable.
    }
  }, [favorites]);

  const visibleRepositories = useMemo(() => repositories, [repositories]);

  const toggleFavorite = (id: number) => {
    setFavorites((current) =>
      current.includes(id) ? current.filter((favorite) => favorite !== id) : [...current, id],
    );
  };

  const handleSearch = () => {
    const value = query.trim();
    setActivePreset(value || TOPIC_PRESETS[0].query);
    setSearchVersion((version) => version + 1);
  };

  return (
    <Card className="overflow-hidden border-indigo-200/70 dark:border-indigo-400/20">
      <div className="border-b border-indigo-100 bg-indigo-50/60 px-5 py-5 dark:border-indigo-400/10 dark:bg-indigo-500/[0.06]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-start gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-600 text-white shadow-lg shadow-indigo-500/20">
              <Icon name="github" className="h-5 w-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold tracking-tight text-slate-900 dark:text-white">Live discovery</h2>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> GitHub API
                </span>
              </div>
              <p className="mt-1 max-w-2xl text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                Explore the live public repository index. These results are separate from the deterministic demo charts below.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {remaining !== null && <span>{remaining} API requests left</span>}
            <button type="button" onClick={() => exportRepositories(visibleRepositories)} className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-2.5 py-1.5 font-semibold text-indigo-700 hover:bg-indigo-50 dark:border-indigo-400/20 dark:bg-white/[0.05] dark:text-indigo-300">
              <Icon name="download" className="h-3.5 w-3.5" /> Export CSV
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              aria-label="Search GitHub repositories"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter" && !isLoading && !isCoolingDown) handleSearch(); }}
              placeholder="Search GitHub, e.g. wasm runtime observability"
              className="w-full rounded-xl border border-indigo-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 dark:border-indigo-400/20 dark:bg-slate-950/40 dark:text-slate-100"
            />
          </div>
          <button type="button" disabled={isLoading || isCoolingDown} onClick={handleSearch} className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/20 transition-transform hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60">
            <Icon name="search" className="h-4 w-4" /> Search GitHub
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TOPIC_PRESETS.map((preset) => (
            <button key={preset.query} type="button" disabled={isLoading || isCoolingDown} aria-pressed={activePreset === preset.query} onClick={() => { setQuery(""); setSearchVersion((version) => version + 1); setActivePreset(preset.query); }} className={cn("rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50", activePreset === preset.query ? "border-indigo-500 bg-indigo-600 text-white" : "border-indigo-200 bg-white/70 text-indigo-700 hover:border-indigo-400 dark:border-indigo-400/20 dark:bg-white/[0.04] dark:text-indigo-300")}>{preset.label}</button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500 dark:text-slate-400">
        <span role="status" aria-live="polite">{isLoading ? "Searching GitHub..." : `${compact(totalCount)} repositories found`}</span>
        <span className="text-slate-400 dark:text-slate-500">Public index · sorted by stars</span>
      </div>

      {error ? (
        <div role="alert" className="mx-4 mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-300">
          <p className="font-semibold">{error}</p>
          {rateLimitReset && <p className="mt-1 text-xs opacity-80">Try again after {new Date(rateLimitReset).toLocaleTimeString()}.</p>}
          <button type="button" disabled={isLoading || isCoolingDown} onClick={() => void search(activePreset)} className="mt-3 rounded-lg border border-current px-3 py-1.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-60">Retry</button>
        </div>
      ) : isLoading ? (
        <div className="space-y-3 px-4 pb-5" role="status" aria-label="Loading repositories">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-white/[0.04]" />)}
        </div>
      ) : visibleRepositories.length === 0 ? (
        <div className="px-5 py-12 text-center text-sm text-slate-500 dark:text-slate-400">No public repositories matched this search.</div>
      ) : (
        <div>
          {visibleRepositories.map((repository) => <RepositoryRow key={repository.id} repository={repository} isFavorite={favorites.includes(repository.id)} onToggleFavorite={toggleFavorite} />)}
        </div>
      )}
    </Card>
  );
}
