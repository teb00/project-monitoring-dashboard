import { useEffect, useRef } from "react";

/** Declarative setInterval — pass null as delay to pause. */
export function useInterval(callback: () => void, delay: number | null) {
  const saved = useRef(callback);
  useEffect(() => {
    saved.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) return;
    const id = setInterval(() => {
      try {
        saved.current();
      } catch (err) {
        console.error("[useInterval] callback threw:", err);
      }
    }, delay);
    return () => clearInterval(id);
  }, [delay]);
}
