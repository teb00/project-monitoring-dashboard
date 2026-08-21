const compactFmt = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const fullFmt = new Intl.NumberFormat("en-US");

/** 12,300 -> "12.3K" */
export const compact = (n: number): string => compactFmt.format(n);

/** 12345 -> "12,345" */
export const full = (n: number): string => fullFmt.format(Math.round(n));

/** 12.3 -> "+12.3%", -4.1 -> "-4.1%" */
export const pct = (n: number): string =>
  `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
