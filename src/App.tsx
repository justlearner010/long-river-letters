import { useCallback, useEffect, useMemo, useReducer, useState } from 'react';
import { chapters } from './data/chapters';
import { slices } from './data/slices';
import { polities } from './data/polities';
import { polityRules } from './data/polityRules';
import { enrichedEvents as events, getEnrichedEvent } from './lib/enrichEvents';
import { loadCountries } from './lib/world';
import { buildAttributionFrame } from './lib/attribution';
import { filterEvents } from './lib/filter';
import { locationForPolities } from './lib/eventLocation';
import { saveState, loadState } from './lib/storage';
import { appReducer, chapterSlices, initialAppState } from './state/appReducer';
import type { GlobalLink, WorldEvent } from './types';
import TopBar from './components/TopBar';
import ChapterRail from './components/ChapterRail';
import TimeScrubber from './components/TimeScrubber';
import EventCards from './components/EventCards';
import InfoDrawer from './components/InfoDrawer';
import PlaybackBar from './components/PlaybackBar';
import WorldMap from './components/WorldMap';
import { usePlaybackScheduler } from './hooks/usePlaybackScheduler';
import { getQuizPrompt } from './data/quizPrompts';
import CausalGraph from './components/CausalGraph';
import ViewToggle from './components/ViewToggle';
import QuizCard from './components/QuizCard';
import LetterView from './components/LetterView';
import type { ObjectAttachment } from './components/LetterView';
import { getLetterSpecsForIntent, letterSpecs } from './data/letters';
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
  const allEvents = useMemo(() => [...events].sort((a, b) => a.year - b.year), [events]);
  const playbackIndex = allEvents.findIndex((event) => event.id === state.playbackEventId);
  const playbackEvent = playbackIndex >= 0 ? allEvents[playbackIndex] : null;
  const frame = useMemo(
    () => buildAttributionFrame(slice.year, polityRules, countryNames),
    [slice.year, countryNames, polityRules],
  );
  const visibleEvents = useMemo(
    () => filterEvents(events, state.category, state.region, state.search).filter((e) => e.chapterId === chapter.id),
    [chapter.id, state.category, state.region, state.search],
  );
  const featuredEvents = useMemo(
    () =>
      events.filter(
        (event) => slice.featuredEventIds.includes(event.id) || (event.featured && event.chapterId === chapter.id),
      ).slice(0, 6),
    [slice, chapter],
  );
  const sliceFeaturedEvents = useMemo(
    () => slice.featuredEventIds.map(getEnrichedEvent).filter(Boolean) as WorldEvent[],
    [slice],
  );
  const selectedEvent = events.find((e) => e.id === state.selectedEventId) ?? null;
  const selectedPolity = polities.find((p) => p.id === state.selectedPolityId) ?? null;
  const quizPendingEvent = state.quizPendingEventId ? getEnrichedEvent(state.quizPendingEventId) : null;
  const activeEvent = state.selectedEventId
    ? selectedEvent
    : quizPendingEvent
      ? null
      : state.playbackMode === 'event' && state.playbackEventId
        ? playbackEvent
        : null;
  /**
   * Order matters: SET_PLAYBACK_EVENT closes the drawer, so it must run before
   * SELECT_EVENT or it immediately undoes the drawer the click just opened.
   */
  const handleSelectEvent = useCallback((eventId: string) => {
    dispatch({ type: 'SET_PLAYBACK_EVENT', eventId });
    dispatch({ type: 'SELECT_EVENT', eventId });
  }, []);

  useEffect(() => {
    saveState({ chapterId: state.chapterId, sliceId: state.sliceId, category: state.category, region: state.region });
  }, [state.chapterId, state.sliceId, state.category, state.region]);

  const advancePlayback = useCallback(() => {
    if (state.playbackMode === 'slice') {
      const currentIndex = chapterSlicesList.findIndex((s) => s.id === slice.id);
      const next = chapterSlicesList[currentIndex + 1];
      if (next) {
        dispatch({ type: 'SELECT_SLICE', sliceId: next.id });
      } else {
        dispatch({ type: 'TOGGLE_PLAY' });
      }
    } else {
      const nextIndex = playbackIndex + 1;
      if (nextIndex < allEvents.length) {
        const nextEvent = allEvents[nextIndex];
        if (state.quizEnabled && getQuizPrompt(nextEvent.id)) {
          dispatch({ type: 'SET_QUIZ_PENDING', eventId: nextEvent.id });
          return;
        }
        dispatch({ type: 'SET_PLAYBACK_EVENT', eventId: nextEvent.id });
      } else {
        dispatch({ type: 'TOGGLE_PLAY' });
      }
    }
  }, [state.playbackMode, state.quizEnabled, chapterSlicesList, slice.id, playbackIndex, allEvents]);

  const handleQuizAnswer = useCallback((correct: boolean) => {
    dispatch({ type: 'RECORD_QUIZ_ANSWER', correct });
  }, []);

  const handleQuizContinue = useCallback(() => {
    const pendingId = state.quizPendingEventId;
    dispatch({ type: 'SET_QUIZ_PENDING', eventId: null });
    if (pendingId) {
      dispatch({ type: 'SET_PLAYBACK_EVENT', eventId: pendingId });
    }
  }, [state.quizPendingEventId]);

  usePlaybackScheduler({
    playing: state.playing,
    speed: state.playbackSpeed,
    mode: state.playbackMode,
    resetKey: state.playbackMode === 'event' ? state.playbackEventId ?? slice.id : slice.id,
    onTick: advancePlayback,
  });

  useEffect(() => {
    if (!state.playbackEventId) return;
    const targetEvent = events.find((event) => event.id === state.playbackEventId);
    if (!targetEvent) return;
    const targetChapter = chapters.find((c) => c.id === targetEvent.chapterId) ?? chapter;
    const candidates = chapterSlices(targetChapter.id);
    const targetSlice = candidates.filter((candidate) => candidate.year <= targetEvent.year).at(-1) ?? candidates[0];
    if (targetSlice && (targetSlice.id !== state.sliceId || targetChapter.id !== state.chapterId)) {
      dispatch({ type: 'SYNC_FRAME', chapterId: targetChapter.id, sliceId: targetSlice.id });
    }
  }, [state.playbackMode, state.playbackEventId, state.chapterId, state.sliceId, chapter, events]);

  const playbackHighlightIds = useMemo(
    () => Array.from(new Set(sliceFeaturedEvents.flatMap((event) => event.polityIds))),
    [sliceFeaturedEvents],
  );
  const playbackLinks = useMemo(
    () => sliceFeaturedEvents.flatMap((event) => event.links ?? []) as GlobalLink[],
    [sliceFeaturedEvents],
  );
  const highlightIds = useMemo(
    () =>
      activeEvent
        ? activeEvent.polityIds
        : state.playing && state.playbackMode === 'slice'
          ? playbackHighlightIds
          : state.selectedPolityId
            ? [state.selectedPolityId]
            : [],
    [activeEvent, state.playing, state.playbackMode, playbackHighlightIds, state.selectedPolityId],
  );
  const links = useMemo(
    () => (activeEvent ? (activeEvent.links ?? []) : state.playing && state.playbackMode === 'slice' ? playbackLinks : []),
    [activeEvent, state.playing, state.playbackMode, playbackLinks],
  );
  const flows = useMemo(() => activeEvent?.flows ?? [], [activeEvent]);
  const captionTitle = activeEvent?.title
    ?? (state.playing && state.playbackMode === 'slice'
      ? sliceFeaturedEvents.map((event) => event.title).join(' / ')
      : '');
  const currentEventIdForCausal = state.selectedEventId ?? state.playbackEventId;

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
    if (eventId) handleSelectEvent(eventId);
  }, [handleSelectEvent]);

  /**
   * Act 3: the letter has been read, so the map plays backward to the anchor year.
   * This is a deliberate single jump rather than a sweep — replaying 700 years of
   * slices would take a minute and nobody would watch it behind a letter.
   */
  /**
   * The globe must face the anchor's hemisphere, not just show the right year.
   * Derived from the anchor event's polities rather than stored per event.
   */
  const focusLon = useMemo(() => {
    if (!state.letterOpen || !state.letterId) return null;
    const spec = letterSpecs.find((candidate) => candidate.id === state.letterId);
    const anchor = spec ? getEnrichedEvent(spec.eventId) : null;
    return anchor ? locationForPolities(anchor.polityIds, anchor.year) : null;
  }, [state.letterOpen, state.letterId]);

  const handleDescend = useCallback((eventId: string) => {
    const target = events.find((event) => event.id === eventId);
    if (!target) return;
    const targetChapter = chapters.find((c) => c.id === target.chapterId);
    if (!targetChapter) return;
    const candidates = chapterSlices(targetChapter.id);
    const targetSlice = candidates.filter((candidate) => candidate.year <= target.year).at(-1) ?? candidates[0];
    if (!targetSlice) return;
    dispatch({ type: 'SELECT_CHAPTER', chapterId: targetChapter.id });
    dispatch({ type: 'SELECT_SLICE', sliceId: targetSlice.id });
    dispatch({ type: 'FOCUS_LETTER_EVENT', eventId: null });
  }, []);

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
        {state.viewMode === 'map' ? (
          <WorldMap
            frame={frame}
            highlightIds={highlightIds}
            links={links}
            flows={flows}
            resetKey={chapter.id}
            focusLon={focusLon}
            onSelectPolity={(polityId) => dispatch({ type: 'SELECT_POLITY', polityId })}
          />
        ) : (
          <CausalGraph
            events={allEvents}
            currentEventId={currentEventIdForCausal}
            onSelectEvent={handleSelectEvent}
          />
        )}
        {!state.letterOpen && (activeEvent || (state.playing && state.playbackMode === 'slice')) && (
          <div className="map-caption" aria-live="polite">
            <span className="caption-year">{slice.year}</span>
            <strong>{captionTitle}</strong>
          </div>
        )}
        {!state.letterOpen && (
          <div className="view-toggle-wrap">
            <ViewToggle
              mode={state.viewMode}
              onChange={(mode) => dispatch({ type: 'SET_VIEW_MODE', mode })}
            />
          </div>
        )}
        {!state.letterOpen && quizPendingEvent && getQuizPrompt(quizPendingEvent.id) && (
          <QuizCard
            prompt={getQuizPrompt(quizPendingEvent.id)!}
            onAnswer={handleQuizAnswer}
            onSkip={handleQuizContinue}
          />
        )}
        {!state.letterOpen && (
          <ChapterRail
            chapters={chapters}
            activeChapterId={chapter.id}
            activeSliceId={slice.id}
            activeEventId={activeEvent?.id ?? null}
            slicesByChapter={chapterSlices}
            events={visibleEvents}
            onSelectChapter={(chapterId) => dispatch({ type: 'SELECT_CHAPTER', chapterId })}
            onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
            onSelectEvent={handleSelectEvent}
          />
        )}
        {!state.letterOpen && (
          <PlaybackBar
            mode={state.playbackMode}
            playing={state.playing}
            currentEvent={playbackEvent}
            label={`${chapter.title} · ${slice.label}`}
            index={state.playbackMode === 'event' ? Math.max(0, playbackIndex) : chapterSlicesList.findIndex((s) => s.id === slice.id)}
            total={state.playbackMode === 'event' ? allEvents.length : chapterSlicesList.length}
            onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAY' })}
            onPrev={() => {
              if (state.playbackMode === 'event') {
                const index = Math.max(0, playbackIndex - 1);
                dispatch({ type: 'SET_PLAYBACK_EVENT', eventId: allEvents[index]?.id ?? null });
              } else {
                const index = Math.max(0, chapterSlicesList.findIndex((s) => s.id === slice.id) - 1);
                dispatch({ type: 'SELECT_SLICE', sliceId: chapterSlicesList[index]?.id ?? slice.id });
              }
            }}
            onNext={() => {
              if (state.playbackMode === 'event') {
                const index = Math.min(allEvents.length - 1, playbackIndex + 1);
                dispatch({ type: 'SET_PLAYBACK_EVENT', eventId: allEvents[index]?.id ?? null });
              } else {
                const index = Math.min(chapterSlicesList.length - 1, chapterSlicesList.findIndex((s) => s.id === slice.id) + 1);
                dispatch({ type: 'SELECT_SLICE', sliceId: chapterSlicesList[index]?.id ?? slice.id });
              }
            }}
            onModeChange={(mode) => {
              dispatch({ type: 'SET_PLAYBACK_MODE', mode });
              if (mode === 'event' && allEvents.length > 0) {
                dispatch({ type: 'SET_PLAYBACK_EVENT', eventId: state.playbackEventId ?? allEvents[0].id });
              }
            }}
            speed={state.playbackSpeed}
            onSpeedChange={(speed) => dispatch({ type: 'SET_PLAYBACK_SPEED', speed })}
            quizEnabled={state.quizEnabled}
            quizScore={state.quizScore}
            quizAnswered={state.quizAnswered}
            onToggleQuiz={() => dispatch({ type: 'TOGGLE_QUIZ' })}
          />
        )}
        {!state.letterOpen && (
          <TimeScrubber
            slices={chapterSlicesList}
            activeSliceId={slice.id}
            events={visibleEvents}
            chapter={chapter}
            activeEventId={activeEvent?.id ?? null}
            playing={state.playing}
            onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
            onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAY' })}
            onSelectEvent={handleSelectEvent}
          />
        )}
        {!state.letterOpen && (
          <EventCards
            events={visibleEvents}
            onSelectEvent={handleSelectEvent}
          />
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
