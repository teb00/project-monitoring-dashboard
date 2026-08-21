import { motion } from "framer-motion";
import { AnimatedNumber, Card, Icon, Sparkline, TrendChip } from "./ui";
import type { Kpi } from "@/types";
import { compact } from "@/lib/format";

function KpiCard({ kpi, index }: { kpi: Kpi; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="group relative h-full overflow-hidden p-4 transition-shadow hover:shadow-md">
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-28 w-28 rounded-full opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: kpi.accent }}
        />
        <div className="relative flex items-start justify-between">
          <span
            className="grid h-10 w-10 place-items-center rounded-xl"
            style={{
              backgroundColor: `${kpi.accent}1a`,
              color: kpi.accent,
            }}
          >
            <Icon name={kpi.icon} className="h-5 w-5" strokeWidth={2.1} />
          </span>
          <TrendChip delta={kpi.deltaPct} />
        </div>

        <div className="relative mt-3">
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {kpi.label}
          </p>
          <AnimatedNumber
            value={kpi.value}
            format={(n) => (kpi.id === "tracked" ? String(Math.round(n)) : compact(n))}
            className="mt-0.5 block text-2xl font-bold tracking-tight text-slate-900 dark:text-white"
          />
        </div>

        <div className="relative mt-2 h-9">
          <Sparkline data={kpi.spark} color={kpi.accent} height={36} fluid />
        </div>
      </Card>
    </motion.div>
  );
}

export function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {kpis.map((kpi, i) => (
        <KpiCard key={kpi.id} kpi={kpi} index={i} />
      ))}
    </div>
  );
}
