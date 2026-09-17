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

  it('sets playback event without clearing selection', () => {
    const next = appReducer(initialAppState, { type: 'SET_PLAYBACK_EVENT', eventId: 'e101' });
    expect(next.playbackEventId).toBe('e101');
  });

  it('syncs frame while preserving play state', () => {
    const next = appReducer({ ...initialAppState, playing: true }, {
      type: 'SYNC_FRAME',
      chapterId: 'c2',
      sliceId: 's1453',
    });
    expect(next.chapterId).toBe('c2');
    expect(next.sliceId).toBe('s1453');
    expect(next.playing).toBe(true);
  });

  it('sets playback speed', () => {
    const next = appReducer(initialAppState, { type: 'SET_PLAYBACK_SPEED', speed: 2 });
    expect(next.playbackSpeed).toBe(2);
  });

  it('opens letters with a clean slate', () => {
    const next = appReducer(
      { ...initialAppState, playing: true, drawerOpen: true, selectedEventId: 'e101' },
      { type: 'OPEN_LETTERS' },
    );
    expect(next.letterOpen).toBe(true);
    expect(next.letterIntentId).toBeNull();
    expect(next.letterId).toBeNull();
    expect(next.playing).toBe(false);
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
