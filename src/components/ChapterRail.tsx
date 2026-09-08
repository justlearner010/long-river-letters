import type { Chapter, EraSlice, WorldEvent } from '../types';

interface ChapterRailProps {
  chapters: Chapter[];
  activeChapterId: string;
  activeSliceId: string;
  activeEventId: string | null;
  slicesByChapter: (chapterId: string) => EraSlice[];
  events: WorldEvent[];
  onSelectChapter: (chapterId: string) => void;
  onSelectSlice: (sliceId: string) => void;
  onSelectEvent: (eventId: string) => void;
}

export default function ChapterRail({
  chapters,
  activeChapterId,
  activeSliceId,
  activeEventId,
  slicesByChapter,
  events,
  onSelectChapter,
  onSelectSlice,
  onSelectEvent,
}: ChapterRailProps) {
  return (
    <nav className="chapter-rail" aria-label="历史章节">
      {chapters.map((chapter) => {
        const active = chapter.id === activeChapterId;
        return (
          <div key={chapter.id} className={`chapter-item ${active ? 'active' : ''}`}>
            <button
              type="button"
              className="chapter-button"
              onClick={() => onSelectChapter(chapter.id)}
              aria-expanded={active}
            >
              <span className="chapter-year">{chapter.startYear}</span>
              <span className="chapter-name">{chapter.title}</span>
            </button>
            {active && (
              <>
                <div className="slice-list">
                  {slicesByChapter(chapter.id).map((slice) => (
                    <button
                      type="button"
                      key={slice.id}
                      className={`slice-button ${slice.id === activeSliceId ? 'active' : ''}`}
                      onClick={() => onSelectSlice(slice.id)}
                    >
                      {slice.label}
                    </button>
                  ))}
                </div>
                <div className="sidebar-events">
                  <span className="sidebar-events-title">本章事件</span>
                  {events.map((event) => (
                    <button
                      type="button"
                      key={event.id}
                      className={`sidebar-event ${event.id === activeEventId ? 'active' : ''}`}
                      onClick={() => onSelectEvent(event.id)}
                    >
                      <span className="sidebar-event-year">{event.year}</span>
                      <span className="sidebar-event-title">{event.title}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        );
      })}
    </nav>
  );
}
