import { useEffect, useMemo, useReducer, useState } from 'react';
import { chapters } from './data/chapters';
import { slices } from './data/slices';
import { events } from './data/events';
import { polities } from './data/polities';
import { polityRules } from './data/polityRules';
import { loadCountries } from './lib/world';
import { buildAttributionFrame } from './lib/attribution';
import { filterEvents } from './lib/filter';
import { saveState, loadState } from './lib/storage';
import { appReducer, chapterSlices, initialAppState } from './state/appReducer';
import TopBar from './components/TopBar';
import ChapterRail from './components/ChapterRail';
import TimeScrubber from './components/TimeScrubber';
import EventCards from './components/EventCards';
import InfoDrawer from './components/InfoDrawer';
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
  const selectedEvent = events.find((e) => e.id === state.selectedEventId) ?? null;
  const selectedPolity = polities.find((p) => p.id === state.selectedPolityId) ?? null;

  useEffect(() => {
    saveState({ chapterId: state.chapterId, sliceId: state.sliceId, category: state.category, region: state.region });
  }, [state.chapterId, state.sliceId, state.category, state.region]);

  useEffect(() => {
    if (!state.playing) return;
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
  }, [state.playing, chapterSlicesList, slice.id]);

  const highlightIds =
    state.selectedEventId
      ? (selectedEvent?.polityIds ?? [])
      : state.selectedPolityId
        ? [state.selectedPolityId]
        : [];

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
          onSelectPolity={(polityId) => dispatch({ type: 'SELECT_POLITY', polityId })}
        />
        <ChapterRail
          chapters={chapters}
          activeChapterId={chapter.id}
          activeSliceId={slice.id}
          slicesByChapter={chapterSlices}
          onSelectChapter={(chapterId) => dispatch({ type: 'SELECT_CHAPTER', chapterId })}
          onSelectSlice={(sliceId) => dispatch({ type: 'SELECT_SLICE', sliceId })}
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
          onSelectEvent={(eventId) => dispatch({ type: 'SELECT_EVENT', eventId })}
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
