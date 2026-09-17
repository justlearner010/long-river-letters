import type { EventCategory, Region } from '../types';
import { chapters } from '../data/chapters';
import { slices } from '../data/slices';

export type CategoryFilter = EventCategory | 'all';

export interface AppState {
  chapterId: string;
  sliceId: string;
  category: CategoryFilter;
  region: Region | 'all';
  search: string;
  selectedPolityId: string | null;
  selectedEventId: string | null;
  drawerOpen: boolean;
  letterOpen: boolean;
  letterIntentId: string | null;
  letterId: string | null;
  letterFocusedEventId: string | null;
}

export type AppAction =
  | { type: 'SELECT_CHAPTER'; chapterId: string }
  | { type: 'SELECT_SLICE'; sliceId: string }
  | { type: 'SET_CATEGORY'; category: CategoryFilter }
  | { type: 'SET_REGION'; region: Region | 'all' }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SELECT_POLITY'; polityId: string }
  | { type: 'SELECT_EVENT'; eventId: string }
  | { type: 'SYNC_FRAME'; chapterId: string; sliceId: string }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'RESTORE'; state: Partial<AppState> }
  | { type: 'OPEN_LETTERS' }
  | { type: 'CLOSE_LETTERS' }
  | { type: 'SELECT_LETTER_INTENT'; intentId: string }
  | { type: 'SET_LETTER'; letterId: string }
  | { type: 'FOCUS_LETTER_EVENT'; eventId: string | null };

export const initialAppState: AppState = {
  chapterId: chapters[0].id,
  sliceId: chapters[0].sliceIds[0],
  category: 'all',
  region: 'all',
  search: '',
  selectedPolityId: null,
  selectedEventId: null,
  drawerOpen: false,
  letterOpen: false,
  letterIntentId: null,
  letterId: null,
  letterFocusedEventId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_CHAPTER': {
      const chapter = chapters.find((c) => c.id === action.chapterId) ?? chapters[0];
      return { ...state, chapterId: chapter.id, sliceId: chapter.sliceIds[0], selectedEventId: null };
    }
    case 'SELECT_SLICE': {
      const chapter = chapters.find((c) => c.id === state.chapterId) ?? chapters[0];
      const slice = slices.find((s) => s.id === action.sliceId && s.chapterId === chapter.id);
      return { ...state, sliceId: slice?.id ?? chapter.sliceIds[0], selectedEventId: null };
    }
    case 'SET_CATEGORY':
      return { ...state, category: action.category };
    case 'SET_REGION':
      return { ...state, region: action.region };
    case 'SET_SEARCH':
      return { ...state, search: action.search };
    case 'SELECT_POLITY':
      return { ...state, selectedPolityId: action.polityId, selectedEventId: null, drawerOpen: true };
    case 'SELECT_EVENT':
      return { ...state, selectedEventId: action.eventId, selectedPolityId: null, drawerOpen: true };
    case 'SYNC_FRAME':
      return { ...state, chapterId: action.chapterId, sliceId: action.sliceId };
    case 'OPEN_LETTERS':
      return {
        ...state,
        letterOpen: true,
        letterIntentId: null,
        letterId: null,
        letterFocusedEventId: null,
        drawerOpen: false,
        selectedEventId: null,
        selectedPolityId: null,
      };
    case 'CLOSE_LETTERS':
      return {
        ...state,
        letterOpen: false,
        letterIntentId: null,
        letterId: null,
        letterFocusedEventId: null,
        selectedEventId: null,
        selectedPolityId: null,
      };
    case 'SELECT_LETTER_INTENT':
      return { ...state, letterIntentId: action.intentId, letterId: null, letterFocusedEventId: null };
    case 'SET_LETTER':
      return { ...state, letterId: action.letterId, letterFocusedEventId: null };
    case 'FOCUS_LETTER_EVENT':
      return { ...state, letterFocusedEventId: action.eventId };
    case 'CLOSE_DRAWER':
      return { ...state, drawerOpen: false, selectedPolityId: null, selectedEventId: null };
    case 'RESTORE': {
      const chapter = chapters.find((c) => c.id === action.state.chapterId) ?? chapters[0];
      const slice = slices.find((s) => s.id === action.state.sliceId && s.chapterId === chapter.id);
      return {
        ...state,
        chapterId: chapter.id,
        sliceId: slice?.id ?? chapter.sliceIds[0],
        category: action.state.category ?? state.category,
        region: action.state.region ?? state.region,
      };
    }
    default:
      return state;
  }
}

export function chapterSlices(chapterId: string) {
  return slices.filter((s) => s.chapterId === chapterId);
}
