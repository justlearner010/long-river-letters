interface TopBarProps {
  year: number;
  chapterTitle: string;
  /** Only rendered inside the letter flow, where getting back to the map matters. */
  onBackToMap?: () => void;
  onOpenAbout: () => void;
}

/**
 * Deliberately minimal. The app opens on the letter, not the map, so this bar is
 * chrome for the second half of the experience -- it carries no filters or search,
 * because those frame the whole thing as a database rather than as a letter.
 */
export default function TopBar({ year, chapterTitle, onBackToMap, onOpenAbout }: TopBarProps) {
  return (
    <header className="topbar">
      <div className="brand-block">
        <h1>长河来信</h1>
        <span className="chapter-title">{chapterTitle}</span>
      </div>
      <div className="topbar-actions">
        {onBackToMap && (
          <button type="button" className="letters-button" onClick={onBackToMap}>
            再写一封
          </button>
        )}
        <button type="button" className="about-button" onClick={onOpenAbout}>说明</button>
        <span className="year-badge">{year}</span>
      </div>
    </header>
  );
}
