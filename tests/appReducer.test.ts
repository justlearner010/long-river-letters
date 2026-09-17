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


  it('opens letters with a clean slate', () => {
    const next = appReducer(
      { ...initialAppState, drawerOpen: true, selectedEventId: 'e101' },
      { type: 'OPEN_LETTERS' },
    );
    expect(next.letterOpen).toBe(true);
    expect(next.letterIntentId).toBeNull();
    expect(next.letterId).toBeNull();
    expect(next.drawerOpen).toBe(false);
    expect(next.selectedEventId).toBeNull();
  });

  it('clears the chosen letter when the intent changes', () => {
    const opened = appReducer(initialAppState, { type: 'OPEN_LETTERS' });
    const chosen = appReducer(opened, { type: 'SELECT_LETTER_INTENT', intentId: 'war' });
    const withLetter = appReducer(chosen, { type: 'SET_LETTER', letterId: 'l001' });
    const switched = appReducer(withLetter, { type: 'SELECT_LETTER_INTENT', intentId: 'plague' });
    expect(switched.letterIntentId).toBe('plague');
    expect(switched.letterId).toBeNull();
  });

  it('drops the focused event when a new letter is set', () => {
    const focused = appReducer(
      { ...initialAppState, letterOpen: true, letterId: 'l001' },
      { type: 'FOCUS_LETTER_EVENT', eventId: 'e165' },
    );
    expect(focused.letterFocusedEventId).toBe('e165');
    const next = appReducer(focused, { type: 'SET_LETTER', letterId: 'l002' });
    expect(next.letterId).toBe('l002');
    expect(next.letterFocusedEventId).toBeNull();
  });

  it('closes letters without touching the map frame', () => {
    const open = appReducer(
      { ...initialAppState, letterOpen: true, letterId: 'l001', letterIntentId: 'war' },
      { type: 'CLOSE_LETTERS' },
    );
    expect(open.letterOpen).toBe(false);
    expect(open.letterId).toBeNull();
    expect(open.chapterId).toBe(initialAppState.chapterId);
    expect(open.sliceId).toBe(initialAppState.sliceId);
  });
});
