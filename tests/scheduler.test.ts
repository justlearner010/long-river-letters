import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { usePlaybackScheduler } from '../src/hooks/usePlaybackScheduler';

let rafCallbacks: Array<{ id: number; cb: FrameRequestCallback }> = [];
let rafId = 0;

describe('usePlaybackScheduler', () => {
  let currentTs = 0;

  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    rafCallbacks = [];
    rafId = 0;
    currentTs = 0;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      const id = ++rafId;
      rafCallbacks.push({ id, cb });
      return id;
    });
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      rafCallbacks = rafCallbacks.filter((item) => item.id !== id);
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  function flushRafs(elapsedMs: number) {
    const frameTime = 16;
    const frames = Math.max(1, Math.ceil(elapsedMs / frameTime));
    for (let i = 0; i < frames; i++) {
      const snapshot = [...rafCallbacks];
      rafCallbacks = [];
      for (const item of snapshot) {
        currentTs += frameTime;
        item.cb(currentTs);
      }
      vi.advanceTimersByTime(frameTime);
    }
  }

  it('does not call onTick when not playing', () => {
    const onTick = vi.fn();
    renderHook(() =>
      usePlaybackScheduler({
        playing: false,
        speed: 1,
        mode: 'event',
        resetKey: 'e1',
        onTick,
      }),
    );
    flushRafs(5000);
    expect(onTick).not.toHaveBeenCalled();
  });

  it('calls onTick after base interval at 1x speed', () => {
    const onTick = vi.fn();
    renderHook(() =>
      usePlaybackScheduler({
        playing: true,
        speed: 1,
        mode: 'event',
        resetKey: 'e1',
        onTick,
      }),
    );
    flushRafs(1999);
    expect(onTick).not.toHaveBeenCalled();
    flushRafs(10);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('calls onTick faster at 2x speed', () => {
    const onTick = vi.fn();
    renderHook(() =>
      usePlaybackScheduler({
        playing: true,
        speed: 2,
        mode: 'event',
        resetKey: 'e1',
        onTick,
      }),
    );
    flushRafs(1050);
    expect(onTick).toHaveBeenCalledTimes(1);
  });

  it('uses longer interval for slice mode', () => {
    const onTick = vi.fn();
    renderHook(() =>
      usePlaybackScheduler({
        playing: true,
        speed: 1,
        mode: 'slice',
        resetKey: 's1',
        onTick,
      }),
    );
    flushRafs(2500);
    expect(onTick).not.toHaveBeenCalled();
    flushRafs(600);
    expect(onTick).toHaveBeenCalledTimes(1);
  });
});
