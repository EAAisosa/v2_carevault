import { useEffect, useRef, useCallback } from "react";

const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes

export function useInactivityTimeout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (enabled) {
      timerRef.current = setTimeout(onTimeout, INACTIVITY_TIMEOUT);
    }
  }, [onTimeout, enabled]);

  useEffect(() => {
    if (!enabled) return;

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, enabled]);
}
