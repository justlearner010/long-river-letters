import type { EraSlice, WorldEvent, Chapter } from '../types';

interface TimeScrubberProps {
  slices: EraSlice[];
  activeSliceId: string;
  events: WorldEvent[];
  chapter: Chapter;
  activeEventId: string | null;
  playing: boolean;
  onSelectSlice: (sliceId: string) => void;
  onTogglePlay: () => void;
  onSelectEvent: (eventId: string) => void;
}

function formatYearRange(event: WorldEvent): string {
  if (event.startYear !== undefined && event.startYear !== event.year) {
    return `${event.startYear}–${event.endYear ?? event.year}`;
  }
  return String(event.year);
}

export default function TimeScrubber({
  slices: sliceList,
  activeSliceId,
  events,
  chapter,
  activeEventId,
  playing,
  onSelectSlice,
  onTogglePlay,
  onSelectEvent,
}: TimeScrubberProps) {
  const index = Math.max(0, sliceList.findIndex((slice) => slice.id === activeSliceId));
  const range = Math.max(1, chapter.endYear - chapter.startYear);

  const chapterEvents = events
    .filter((event) => event.chapterId === chapter.id)
    .sort((a, b) => a.year - b.year);

  const positionForYear = (year: number) => {
    const clamped = Math.max(chapter.startYear, Math.min(chapter.endYear, year));
    return ((clamped - chapter.startYear) / range) * 100;
  };

  return (
    <div className="time-scrubber">
      <button type="button" className="play-button" onClick={onTogglePlay} aria-label={playing ? '暂停' : '播放'}>
        {playing ? '暂停' : '播放'}
      </button>
      <div className="scrubber-track-wrap">
        <input
          type="range"
          min={0}
          max={Math.max(0, sliceList.length - 1)}
          value={index}
          aria-label="年代切片"
          onChange={(event) => onSelectSlice(sliceList[Number(event.target.value)]?.id ?? activeSliceId)}
        />
        <div className="scrubber-events">
          {chapterEvents.map((event) => {
            const start = event.startYear ?? event.year;
            const end = event.endYear ?? event.year;
            const left = positionForYear(start);
            const width = Math.max(0.8, positionForYear(end) - left);
            const isActive = event.id === activeEventId;
            return (
              <button
                key={event.id}
                type="button"
                className={`scrubber-event ${isActive ? 'active' : ''}`}
                style={{ left: `${left}%`, width: `${width}%` }}
                onClick={() => onSelectEvent(event.id)}
                title={`${formatYearRange(event)} ${event.title}`}
                aria-label={`${formatYearRange(event)} ${event.title}`}
              />
            );
          })}
        </div>
      </div>
      <span className="scrubber-year">{sliceList[index]?.year ?? ''}</span>
    </div>
  );
}
