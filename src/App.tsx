import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { chapters } from './data/chapters';
import { polities } from './data/polities';
import { polityRules } from './data/polityRules';
import { enrichedEvents as events, getEnrichedEvent } from './lib/enrichEvents';
import { loadCountries } from './lib/world';
import { buildAttributionFrame } from './lib/attribution';
import { locationForPolities } from './lib/eventLocation';
import { saveState, loadState } from './lib/storage';
import { appReducer, chapterSlices, initialAppState } from './state/appReducer';
import TopBar from './components/TopBar';
import InfoDrawer from './components/InfoDrawer';
import WorldMap from './components/WorldMap';
import LetterView from './components/LetterView';
import type { ObjectAttachment } from './components/LetterView';
import { letterSpecs } from './data/letters';
import { figures } from './data/figures';

export default function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState, (initial) => ({
    ...initial,
    ...loadState(),
  }));
  const [aboutOpen, setAboutOpen] = useState(false);

  const chapter = chapters.find((c) => c.id === state.chapterId) ?? chapters[0];
  const chapterSlicesList = useMemo(() => chapterSlices(chapter.id), [chapter.id]);
  const slice = chapterSlicesList.find((s) => s.id === state.sliceId) ?? chapterSlicesList[0];
  const countryNames = useMemo(() => loadCountries().map((country) => country.name), []);
  const frame = useMemo(
    () => buildAttributionFrame(slice.year, polityRules, countryNames),
    [slice.year, countryNames, polityRules],
  );

  const selectedEvent = events.find((e) => e.id === state.selectedEventId) ?? null;
  const selectedPolity = polities.find((p) => p.id === state.selectedPolityId) ?? null;

  const highlightIds = useMemo(
    () => (selectedEvent ? selectedEvent.polityIds : state.selectedPolityId ? [state.selectedPolityId] : []),
    [selectedEvent, state.selectedPolityId],
  );
  const links = useMemo(() => selectedEvent?.links ?? [], [selectedEvent]);
  const flows = useMemo(() => selectedEvent?.flows ?? [], [selectedEvent]);

  useEffect(() => {
    saveState({ chapterId: state.chapterId, sliceId: state.sliceId, category: state.category, region: state.region });
  }, [state.chapterId, state.sliceId, state.category, state.region]);

  const letterObjects = useMemo(() => {
    const map: Record<string, ObjectAttachment> = {};
    for (const spec of letterSpecs) {
      const figure = figures.find((candidate) => candidate.id === spec.figureId);
      if (figure?.objectSrc && figure.objectLabel) {
        map[spec.id] = { src: figure.objectSrc, label: figure.objectLabel };
      }
    }
    return map;
  }, []);

  const handlePickIntent = useCallback((intentId: string) => {
    dispatch({ type: 'SELECT_LETTER_INTENT', intentId });
    const first = letterSpecs.find((spec) => spec.intentId === intentId);
    if (first) dispatch({ type: 'SET_LETTER', letterId: first.id });
  }, []);

  const handleFocusLetterEvent = useCallback((eventId: string | null) => {
    dispatch({ type: 'FOCUS_LETTER_EVENT', eventId });
    if (eventId) dispatch({ type: 'SELECT_EVENT', eventId });
    else dispatch({ type: 'CLOSE_DRAWER' });
  }, []);

  /**
   * Act 3: the letter has been read, so the map moves to the anchor year. A single
   * jump rather than a sweep — replaying 700 years of slices would take a minute
   * and nobody would watch it behind a letter.
   */
  const handleDescend = useCallback((eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) return;
    const targetChapter = chapters.find((c) => c.id === target.chapterId);
    if (!targetChapter) return;
    const candidates = chapterSlices(targetChapter.id);
    const targetSlice = candidates.filter((candidate) => candidate.year <= target.year).at(-1) ?? candidates[0];
    if (!targetSlice) return;
    dispatch({ type: 'SYNC_FRAME', chapterId: targetChapter.id, sliceId: targetSlice.id });
  }, []);

  /** The globe must face the anchor's hemisphere, not merely show the right year. */
  const focusLon = useMemo(() => {
    if (!state.letterOpen || !state.letterId) return null;
    const spec = letterSpecs.find((candidate) => candidate.id === state.letterId);
    const anchor = spec ? getEnrichedEvent(spec.eventId) : null;
    return anchor ? locationForPolities(anchor.polityIds, anchor.year) : null;
  }, [state.letterOpen, state.letterId]);

  return (
    <main className="app-shell">
      <TopBar
        year={slice.year}
        chapterTitle={`${chapter.title} · ${slice.label}`}
        search={state.search}
        filter={state.category}
        region={state.region}
        onSearch={(search) => dispatch({ type: 'SET_SEARCH', search })}
        onFilter={(category) => dispatch({ type: 'SET_CATEGORY', category: category as typeof state.category })}
        onRegion={(region) => dispatch({ type: 'SET_REGION', region: region as typeof state.region })}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenLetters={() => dispatch({ type: 'OPEN_LETTERS' })}
      />
      <section className="map-stage">
        <WorldMap
          frame={frame}
          highlightIds={highlightIds}
          links={links}
          flows={flows}
          resetKey={chapter.id}
          focusLon={focusLon}
          onSelectPolity={(polityId) => dispatch({ type: 'SELECT_POLITY', polityId })}
        />

        {(selectedEvent || state.selectedPolityId) && !state.letterOpen && (
          <div className="map-caption" aria-live="polite">
            <span className="caption-year">{slice.year}</span>
            <strong>{selectedEvent?.title ?? '已选择政权'}</strong>
          </div>
        )}

        <InfoDrawer
          open={state.drawerOpen}
          polity={selectedPolity}
          event={selectedEvent}
          onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        />

        {state.letterOpen && (
          <LetterView
            intentId={state.letterIntentId}
            specId={state.letterId}
            objects={letterObjects}
            focusedEventId={state.letterFocusedEventId}
            onPickIntent={handlePickIntent}
            onFocusEvent={handleFocusLetterEvent}
            onDescend={handleDescend}
            onClose={() => dispatch({ type: 'CLOSE_LETTERS' })}
          />
        )}

        {aboutOpen && (
          <div className="about-overlay" role="dialog" aria-label="说明">
            <div className="about-panel">
              <button type="button" className="drawer-close" onClick={() => setAboutOpen(false)}>×</button>
              <h2>数据与边界说明</h2>
              <p>地图使用现代世界底图按历史控制者着色，主要帝国边界以近似覆盖表达；争议地带采用中性描述，具体来源与精度在数据文件中标记。</p>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
