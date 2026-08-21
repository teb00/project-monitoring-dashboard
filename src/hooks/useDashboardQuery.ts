import { useEffect, useState } from "react";
import type { RangeKey, SegmentKey } from "@/types";
import { CATEGORIES, LANGUAGES } from "@/data/dataset";

export interface CrossFilter {
  seg: SegmentKey;
  value: string;
}

interface DashboardQueryState {
  range: RangeKey;
  segment: SegmentKey;
  cross: CrossFilter | null;
}

const DEFAULT_STATE: DashboardQueryState = {
  range: "30D",
  segment: "language",
  cross: null,
};

const RANGE_KEYS: RangeKey[] = ["7D", "30D", "90D", "1Y"];
const SEGMENT_KEYS: SegmentKey[] = ["language", "category"];

function isRangeKey(value: string | null): value is RangeKey {
  return value !== null && RANGE_KEYS.includes(value as RangeKey);
}

function isSegmentKey(value: string | null): value is SegmentKey {
  return value !== null && SEGMENT_KEYS.includes(value as SegmentKey);
}

function isValidFilter(segment: SegmentKey, value: string | null): value is string {
  if (!value) return false;
  return segment === "language"
    ? LANGUAGES.includes(value)
    : CATEGORIES.includes(value as (typeof CATEGORIES)[number]);
}

function readQuery(): DashboardQueryState {
  const params = new URLSearchParams(window.location.search);
  const rangeParam = params.get("range");
  const segmentParam = params.get("group");
  const filterSegmentParam = params.get("filterGroup");
  const range = isRangeKey(rangeParam)
    ? rangeParam
    : DEFAULT_STATE.range;
  const segment = isSegmentKey(segmentParam)
    ? segmentParam
    : DEFAULT_STATE.segment;
  const filterSegment = isSegmentKey(filterSegmentParam)
    ? filterSegmentParam
    : segment;
  const crossValue = params.get("filter");

  return {
    range,
    segment,
    cross:
      isValidFilter(filterSegment, crossValue)
        ? { seg: filterSegment, value: crossValue }
        : null,
  };
}

function writeQuery(state: DashboardQueryState): void {
  const params = new URLSearchParams();
  if (state.range !== DEFAULT_STATE.range) params.set("range", state.range);
  if (state.segment !== DEFAULT_STATE.segment) params.set("group", state.segment);
  if (state.cross) {
    if (state.cross.seg !== state.segment) {
      params.set("filterGroup", state.cross.seg);
    }
    params.set("filter", state.cross.value);
  }

  const query = params.toString();
  const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
  window.history.replaceState(null, "", nextUrl);
}

export function useDashboardQuery(): DashboardQueryState & {
  setRange: (range: RangeKey) => void;
  setSegment: (segment: SegmentKey) => void;
  setCross: (cross: CrossFilter | null) => void;
} {
  const [state, setState] = useState<DashboardQueryState>(readQuery);

  useEffect(() => {
    writeQuery(state);
  }, [state]);

  return {
    ...state,
    setRange: (range) => setState((current) => ({ ...current, range, cross: null })),
    setSegment: (segment) => setState((current) => ({ ...current, segment, cross: null })),
    setCross: (cross) => setState((current) => ({ ...current, cross })),
  };
}
