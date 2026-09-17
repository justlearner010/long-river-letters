import { useEffect, useRef } from 'react';

export type PlaybackMode = 'slice' | 'event';

interface UsePlaybackSchedulerOptions {
  playing: boolean;
  speed: number;
  mode: PlaybackMode;
  resetKey: string;
  onTick: () => void;
}

const BASE_EVENT_MS = 2000;
const BASE_SLICE_MS = 3000;

export function usePlaybackScheduler({
  playing,
  speed,
  mode,
  resetKey,
  onTick,
}: UsePlaybackSchedulerOptions) {
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const elapsedRef = useRef(0);
  const onTickRef = useRef(onTick);

  onTickRef.current = onTick;

  useEffect(() => {
    elapsedRef.current = 0;
    lastTsRef.current = null;
  }, [resetKey]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTsRef.current = null;
      return;
    }

    const baseMs = mode === 'slice' ? BASE_SLICE_MS : BASE_EVENT_MS;
    const targetMs = Math.max(250, baseMs / speed);

    const loop = (ts: number) => {
      if (lastTsRef.current === null) {
        lastTsRef.current = ts;
      }
      const delta = ts - lastTsRef.current;
      lastTsRef.current = ts;
      elapsedRef.current += delta;

      if (elapsedRef.current >= targetMs) {
        elapsedRef.current = 0;
        onTickRef.current();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [playing, speed, mode]);
}
