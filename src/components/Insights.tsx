import { motion } from "framer-motion";
import { Card, Icon } from "./ui";
import { generateInsights } from "@/data/analytics";
import type { RangeKey } from "@/types";

export function Insights({ range }: { range: RangeKey }) {
  const insights = generateInsights(range);
  return (
    <Card className="h-full p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 text-white">
          <Icon name="spark" className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-sm font-semibold tracking-tight text-slate-800 dark:text-slate-100">
            Smart insights
          </h3>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Auto-generated from the last {range}
          </p>
        </div>
      </div>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {insights.map((ins, i) => (
          <motion.div
            key={ins.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.07 }}
            className="relative overflow-hidden rounded-xl border border-slate-100 bg-slate-50/60 p-3 dark:border-white/[0.05] dark:bg-white/[0.02]"
          >
            <span
              className="absolute left-0 top-0 h-full w-1"
              style={{ background: ins.accent }}
            />
            <div className="flex items-start gap-2 pl-1">
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg"
                style={{ backgroundColor: `${ins.accent}1f`, color: ins.accent }}
              >
                <Icon name={ins.icon} className="h-3.5 w-3.5" strokeWidth={2.2} />
              </span>
              <div className="min-w-0">
                <div className="text-[13px] font-semibold leading-tight text-slate-800 dark:text-slate-100">
                  {ins.title}
                </div>
                <div className="mt-0.5 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                  {ins.detail}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </Card>
  );
}
