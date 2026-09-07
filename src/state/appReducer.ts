import type { EventCategory, Region } from '../types';
import { chapters } from '../data/chapters';
import { slices } from '../data/slices';

export type CategoryFilter = EventCategory | 'all';

export interface AppState {
  chapterId: string;
  sliceId: string;
  playing: boolean;
  category: CategoryFilter;
  region: Region | 'all';
  search: string;
  selectedPolityId: string | null;
  selectedEventId: string | null;
  playbackEventId: string | null;
  playbackMode: 'slice' | 'event';
  drawerOpen: boolean;
}

export type AppAction =
  | { type: 'SELECT_CHAPTER'; chapterId: string }
  | { type: 'SELECT_SLICE'; sliceId: string }
  | { type: 'TOGGLE_PLAY' }
  | { type: 'SET_CATEGORY'; category: CategoryFilter }
  | { type: 'SET_REGION'; region: Region | 'all' }
  | { type: 'SET_SEARCH'; search: string }
  | { type: 'SELECT_POLITY'; polityId: string }
  | { type: 'SELECT_EVENT'; eventId: string }
  | { type: 'SET_PLAYBACK_EVENT'; eventId: string | null }
  | { type: 'SET_PLAYBACK_MODE'; mode: 'slice' | 'event' }
  | { type: 'SYNC_FRAME'; chapterId: string; sliceId: string }
  | { type: 'CLOSE_DRAWER' }
  | { type: 'RESTORE'; state: Partial<AppState> };

export const initialAppState: AppState = {
  chapterId: chapters[0].id,
  sliceId: chapters[0].sliceIds[0],
  playing: false,
  category: 'all',
  region: 'all',
  search: '',
  selectedPolityId: null,
  selectedEventId: null,
  playbackEventId: null,
  playbackMode: 'slice',
  drawerOpen: false,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_CHAPTER': {
      const chapter = chapters.find((c) => c.id === action.chapterId) ?? chapters[0];
      return { ...state, chapterId: chapter.id, sliceId: chapter.sliceIds[0], playing: false, selectedEventId: null };
    }
    case 'SELECT_SLICE': {
      const chapter = chapters.find((c) => c.id === state.chapterId) ?? chapters[0];
      const slice = slices.find((s) => s.id === action.sliceId && s.chapterId === chapter.id);
      return { ...state, sliceId: slice?.id ?? chapter.sliceIds[0], playing: false, selectedEventId: null };
    }
    case 'TOGGLE_PLAY':
      return { ...state, playing: !state.playing };
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
    case 'SET_PLAYBACK_EVENT':
      return { ...state, playbackEventId: action.eventId, drawerOpen: false };
    case 'SET_PLAYBACK_MODE':
      return { ...state, playbackMode: action.mode, playing: false };
    case 'SYNC_FRAME':
      return { ...state, chapterId: action.chapterId, sliceId: action.sliceId };
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
