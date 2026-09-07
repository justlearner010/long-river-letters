import type { AppState } from '../state/appReducer';

const KEY = 'world-history-map:v1';

export function saveState(state: Pick<AppState, 'chapterId' | 'sliceId' | 'category' | 'region'>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // 无痕模式或存储不可用时忽略
  }
}

export function loadState(): Partial<Pick<AppState, 'chapterId' | 'sliceId' | 'category' | 'region'>> {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
