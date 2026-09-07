import { describe, it, expect } from 'vitest';
import { appReducer, initialAppState } from '../src/state/appReducer';
import { slices } from '../src/data/slices';

describe('appReducer', () => {
  it('selects first slice of a chapter', () => {
    const next = appReducer(initialAppState, { type: 'SELECT_CHAPTER', chapterId: 'c2' });
    const firstSlice = slices.find((s) => s.chapterId === 'c2')!;
    expect(next.chapterId).toBe('c2');
    expect(next.sliceId).toBe(firstSlice.id);
  });

  it('toggles play', () => {
    const next = appReducer(initialAppState, { type: 'TOGGLE_PLAY' });
    expect(next.playing).toBe(true);
  });
});
