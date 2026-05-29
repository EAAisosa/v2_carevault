"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000;
const WARNING_BEFORE = 60 * 1000;

export function useInactivityTimeout(onTimeout: () => void, enabled: boolean) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(Math.ceil(WARNING_BEFORE / 1000));
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const clearAllTimers = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
  }, []);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setShowWarning(false);
    setSecondsLeft(Math.ceil(WARNING_BEFORE / 1000));

    if (enabled) {
      warningTimerRef.current = setTimeout(() => {
        setShowWarning(true);
        setSecondsLeft(Math.ceil(WARNING_BEFORE / 1000));
        countdownRef.current = setInterval(() => {
          setSecondsLeft((prev) => {
            if (prev <= 1) {
              if (countdownRef.current) clearInterval(countdownRef.current);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }, INACTIVITY_TIMEOUT - WARNING_BEFORE);

      timerRef.current = setTimeout(onTimeout, INACTIVITY_TIMEOUT);
    }
  }, [onTimeout, enabled, clearAllTimers]);

  const staySignedIn = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setShowWarning(false);
      return;
    }

    const events = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();

    return () => {
      clearAllTimers();
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [resetTimer, enabled, clearAllTimers]);

  return { showWarning, secondsLeft, staySignedIn };
}
