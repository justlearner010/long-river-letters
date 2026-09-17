import type { EventCategory, Region } from '../types';
import { chapters } from '../data/chapters';
import { slices } from '../data/slices';

export type CategoryFilter = EventCategory | 'all';

export type ViewMode = 'map' | 'causal';

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
  playbackSpeed: number;
  viewMode: ViewMode;
  quizEnabled: boolean;
  quizScore: number;
  quizAnswered: number;
  quizPendingEventId: string | null;
  letterOpen: boolean;
  letterIntentId: string | null;
  letterId: string | null;
  letterFocusedEventId: string | null;
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
  | { type: 'RESTORE'; state: Partial<AppState> }
  | { type: 'SET_PLAYBACK_SPEED'; speed: number }
  | { type: 'SET_VIEW_MODE'; mode: ViewMode }
  | { type: 'TOGGLE_QUIZ' }
  | { type: 'RECORD_QUIZ_ANSWER'; correct: boolean }
  | { type: 'SET_QUIZ_PENDING'; eventId: string | null }
  | { type: 'OPEN_LETTERS' }
  | { type: 'CLOSE_LETTERS' }
  | { type: 'SELECT_LETTER_INTENT'; intentId: string }
  | { type: 'SET_LETTER'; letterId: string }
  | { type: 'FOCUS_LETTER_EVENT'; eventId: string | null };

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
  playbackMode: 'event',
  drawerOpen: false,
  playbackSpeed: 1,
  viewMode: 'map',
  quizEnabled: false,
  quizScore: 0,
  quizAnswered: 0,
  quizPendingEventId: null,
  letterOpen: false,
  letterIntentId: null,
  letterId: null,
  letterFocusedEventId: null,
};

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SELECT_CHAPTER': {
      const chapter = chapters.find((c) => c.id === action.chapterId) ?? chapters[0];
      return { ...state, chapterId: chapter.id, sliceId: chapter.sliceIds[0], playing: false, selectedEventId: null, playbackEventId: null };
    }
    case 'SELECT_SLICE': {
      const chapter = chapters.find((c) => c.id === state.chapterId) ?? chapters[0];
      const slice = slices.find((s) => s.id === action.sliceId && s.chapterId === chapter.id);
      return { ...state, sliceId: slice?.id ?? chapter.sliceIds[0], playing: false, selectedEventId: null, playbackEventId: null };
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
    case 'SET_PLAYBACK_SPEED':
      return { ...state, playbackSpeed: action.speed };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.mode };
    case 'TOGGLE_QUIZ':
      return { ...state, quizEnabled: !state.quizEnabled, quizScore: 0, quizAnswered: 0, quizPendingEventId: null };
    case 'RECORD_QUIZ_ANSWER':
      return {
        ...state,
        quizScore: state.quizScore + (action.correct ? 1 : 0),
        quizAnswered: state.quizAnswered + 1,
      };
    case 'SET_QUIZ_PENDING':
      return { ...state, quizPendingEventId: action.eventId, playing: action.eventId ? false : state.playing };
    case 'OPEN_LETTERS':
      return { ...state, letterOpen: true, letterIntentId: null, letterId: null, letterFocusedEventId: null, playing: false, drawerOpen: false, selectedEventId: null, selectedPolityId: null };
    case 'CLOSE_LETTERS':
      return { ...state, letterOpen: false, letterIntentId: null, letterId: null, letterFocusedEventId: null, selectedEventId: null, selectedPolityId: null };
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
