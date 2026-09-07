import type { Chapter, EraSlice } from '../types';

interface ChapterRailProps {
  chapters: Chapter[];
  activeChapterId: string;
  activeSliceId: string;
  slicesByChapter: (chapterId: string) => EraSlice[];
  onSelectChapter: (chapterId: string) => void;
  onSelectSlice: (sliceId: string) => void;
}

export default function ChapterRail({
  chapters,
  activeChapterId,
  activeSliceId,
  slicesByChapter,
  onSelectChapter,
  onSelectSlice,
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
            )}
          </div>
        );
      })}
    </nav>
  );
}
