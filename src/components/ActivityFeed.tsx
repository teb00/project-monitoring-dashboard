import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, Icon } from "./ui";
import { useInterval } from "@/hooks/useInterval";
import {
  makeActivityEvent,
  seedActivityEvents,
  type ActivityEvent,
  type ActivityKind,
} from "@/data/analytics";

const KIND_META: Record<
  ActivityKind,
  { icon: string; accent: string; label: string }
> = {
  star: { icon: "star", accent: "#f59e0b", label: "starred" },
  fork: { icon: "commit", accent: "#06b6d4", label: "forked" },
  release: { icon: "spark", accent: "#8b5cf6", label: "released" },
  newrepo: { icon: "repo", accent: "#6366f1", label: "discovered" },
  issue: { icon: "dot", accent: "#ef4444", label: "issues" },
};

function timeAgo(ts: number, now: number): string {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  return `${m}m ago`;
}

export function ActivityFeed() {
  const [events, setEvents] = useState<ActivityEvent[]>(() =>
    seedActivityEvents(7),
  );
  const [paused, setPaused] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  useInterval(
    () => {
      setEvents((prev) => [makeActivityEvent(), ...prev].slice(0, 9));
    },
    paused ? null : 2600,
  );
  useInterval(() => setNow(Date.now()), 1000);

  return (
    <Card className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-4">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[0.06] dark:text-slate-300">
            <Icon name="trending" className="h-[18px] w-[18px]" strokeWidth={2.2} />
          </span>
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
              Live activity
            </h3>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Streaming events across tracked repos
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-white/10 dark:text-slate-400 dark:hover:bg-white/5"
        >
          <span className="relative flex h-2 w-2">
            {!paused && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${paused ? "bg-slate-400" : "bg-emerald-400"}`}
            />
          </span>
          {paused ? "Paused" : "Live"}
        </button>
      </div>

      <div
        className="relative mt-2 flex-1 overflow-hidden px-3 pb-3"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <AnimatePresence initial={false}>
          {events.map((ev) => {
            const m = KIND_META[ev.kind];
            return (
              <motion.div
                key={ev.id}
                layout
                initial={{ opacity: 0, height: 0, y: -8 }}
                animate={{ opacity: 1, height: "auto", y: 0 }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <a
                  href={`https://github.com/${ev.repo}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-slate-50 dark:hover:bg-white/[0.03] cursor-pointer"
                >
                  <span
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-lg"
                    style={{ backgroundColor: `${m.accent}1f`, color: m.accent }}
                  >
                    <Icon name={m.icon} className="h-4 w-4" strokeWidth={2.2} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: ev.langColor }}
                      />
                      <span className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                        {ev.name}
                      </span>
                    </div>
                    <div className="truncate text-[11px] text-slate-400 dark:text-slate-500">
                      {ev.text}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] text-slate-400 dark:text-slate-500">
                    {timeAgo(ev.ts, now)}
                  </span>
                  <Icon
                    name="external"
                    className="h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-600"
                    strokeWidth={2}
                  />
                </a>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </Card>
  );
}
