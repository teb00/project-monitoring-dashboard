import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "./ui";
import { cn } from "@/utils/cn";
import { PROJECTS } from "@/data/dataset";
import { colorForSegment } from "@/data/dataset";
import { compact } from "@/lib/format";

function ThemeToggle({
  isDark,
  onToggle,
}: {
  isDark: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle dark mode"
      className={cn(
        "relative inline-flex h-9 w-16 items-center rounded-full border px-1 transition-colors",
        isDark ? "border-white/10 bg-slate-800" : "border-slate-200 bg-slate-100",
      )}
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full text-white shadow-sm transition-transform duration-300",
          isDark
            ? "translate-x-7 bg-gradient-to-br from-slate-700 to-slate-900"
            : "translate-x-0 bg-gradient-to-br from-amber-400 to-orange-500",
        )}
      >
        <Icon name={isDark ? "moon" : "sun"} className="h-4 w-4" strokeWidth={2.2} />
      </span>
    </button>
  );
}

function RepoSearch() {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const results = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return [];
    return PROJECTS.filter(
      (p) =>
        p.repo.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.language.toLowerCase().includes(query),
    )
      .sort((a, b) => b.stars - a.stars)
      .slice(0, 6);
  }, [q]);

  return (
    <div className="relative hidden flex-1 max-w-md md:block">
      <Icon
        name="search"
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
      />
      <input
        aria-label="Search tracked repositories"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search 60+ tracked repos…"
        className="w-full rounded-xl border border-slate-200 bg-white/70 py-2 pl-9 pr-3 text-sm text-slate-700 outline-none transition-colors placeholder:text-slate-400 focus:border-indigo-400 dark:border-white/10 dark:bg-white/[0.04] dark:text-slate-200"
      />
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900"
          >
            {results.map((p) => {
              const col = colorForSegment("language", p.language);
              return (
                <a
                  key={p.id}
                  href={`https://github.com/${p.repo}`}
                  target="_blank"
                  rel="noreferrer"
                  onMouseDown={(e) => e.preventDefault()}
                  className="flex items-center gap-3 px-3 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.04]"
                >
                  <span
                    className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold uppercase text-white"
                    style={{ background: col }}
                  >
                    {p.name.slice(0, 2)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-800 dark:text-slate-100">
                      {p.owner}/{p.name}
                    </div>
                    <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                      {p.language} · {p.category}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-amber-500">
                    ★ {compact(p.stars)}
                  </span>
                </a>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Header({
  isDark,
  onToggleTheme,
}: {
  isDark: boolean;
  onToggleTheme: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#070b16]/70">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-cyan-500 text-white shadow-lg shadow-indigo-500/30">
            <Icon name="trending" className="h-5 w-5" strokeWidth={2.4} />
            <span className="absolute -right-0.5 -top-0.5 flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
            </span>
          </div>
          <div className="leading-tight">
            <div className="flex items-center gap-2">
              <h1 className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white sm:text-base">
                RepoRadar
              </h1>
              <span className="hidden rounded-md bg-indigo-500/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 sm:inline">
                CS
              </span>
            </div>
            <p className="text-[11px] text-slate-400 dark:text-slate-500 sm:text-xs">
              Discovery radar for computer-systems projects on GitHub
            </p>
          </div>
        </div>

        <RepoSearch />

        <div className="flex items-center gap-2 sm:gap-3">
          <a
            href="https://github.com/trending"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5 sm:inline-flex"
          >
            <Icon name="github" className="h-4 w-4" />
            GitHub
          </a>
          <ThemeToggle isDark={isDark} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>
  );
}
