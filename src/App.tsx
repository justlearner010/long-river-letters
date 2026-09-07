import { useEffect, useMemo, useReducer, useState } from 'react';
import { chapters } from './data/chapters';
import { slices } from './data/slices';
import { polities } from './data/polities';
import { polityRules } from './data/polityRules';
import { enrichedEvents as events, getEnrichedEvent } from './lib/enrichEvents';
import { loadCountries } from './lib/world';
import { buildAttributionFrame } from './lib/attribution';
import { filterEvents } from './lib/filter';
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
  const activeEvent = state.selectedEventId
    ? selectedEvent
    : state.playbackMode === 'event' && state.playbackEventId
      ? playbackEvent
      : null;

  useEffect(() => {
    saveState({ chapterId: state.chapterId, sliceId: state.sliceId, category: state.category, region: state.region });
  }, [state.chapterId, state.sliceId, state.category, state.region]);

  useEffect(() => {
    if (!state.playing) return;
    if (state.playbackMode === 'slice') {
      const timer = window.setInterval(() => {
        const currentIndex = chapterSlicesList.findIndex((s) => s.id === slice.id);
        const next = chapterSlicesList[currentIndex + 1];
        if (next) {
          dispatch({ type: 'SELECT_SLICE', sliceId: next.id });
        } else {
          dispatch({ type: 'TOGGLE_PLAY' });
        }
      }, 3000);
      return () => window.clearInterval(timer);
    }
    const timer = window.setInterval(() => {
      const nextIndex = playbackIndex + 1;
      if (nextIndex < allEvents.length) {
        dispatch({ type: 'SET_PLAYBACK_EVENT', eventId: allEvents[nextIndex].id });
      } else {
        dispatch({ type: 'TOGGLE_PLAY' });
      }
    }, 2500);
    return () => window.clearInterval(timer);
  }, [state.playing, state.playbackMode, chapterSlicesList, slice.id, playbackIndex, allEvents]);

  useEffect(() => {
    if (state.playbackMode !== 'event' || !state.playbackEventId) return;
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
  const highlightIds = activeEvent
    ? activeEvent.polityIds
    : state.playing && state.playbackMode === 'slice'
      ? playbackHighlightIds
      : state.selectedPolityId
        ? [state.selectedPolityId]
        : [];
  const links = activeEvent
    ? (activeEvent.links ?? [])
    : state.playing && state.playbackMode === 'slice'
      ? playbackLinks
      : [];
  const captionTitle = activeEvent?.title
    ?? (state.playing && state.playbackMode === 'slice'
      ? sliceFeaturedEvents.map((event) => event.title).join(' / ')
      : '');

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
      />
      <section className="map-stage">
        <WorldMap
          frame={frame}
          highlightIds={highlightIds}
          links={links}
          onSelectPolity={(polityId) => dispatch({ type: 'SELECT_POLITY', polityId })}
        />
        {(activeEvent || (state.playing && state.playbackMode === 'slice')) && (
          <div className="map-caption" aria-live="polite">
            <span className="caption-year">{slice.year}</span>
            <strong>{captionTitle}</strong>
          </div>
        )}
        <ChapterRail
          chapters={chapters}
          activeChapterId={chapter.id}
          activeSliceId={slice.id}
          slicesByChapter={chapterSlices}
          onSelectChapter={(chapterId) => dispatch({ type: 'SELECT_CHAPTER', chapterId })}
          onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
        />
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
        />
        <TimeScrubber
          slices={chapterSlicesList}
          activeSliceId={slice.id}
          playing={state.playing}
          onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
          onTogglePlay={() => dispatch({ type: 'TOGGLE_PLAY' })}
        />
        <EventCards
          events={state.search || state.category !== 'all' || state.region !== 'all' ? visibleEvents : featuredEvents}
          onSelectEvent={(eventId) => {
            dispatch({ type: 'SELECT_EVENT', eventId });
            dispatch({ type: 'SET_PLAYBACK_EVENT', eventId });
          }}
        />
        <InfoDrawer
          open={state.drawerOpen}
          polity={selectedPolity}
          event={selectedEvent}
          onClose={() => dispatch({ type: 'CLOSE_DRAWER' })}
        />
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
