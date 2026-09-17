import type { ViewMode } from '../state/appReducer';

interface ViewToggleProps {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export default function ViewToggle({ mode, onChange }: ViewToggleProps) {
  return (
    <div className="view-toggle" role="group" aria-label="视图切换">
      <button
        type="button"
        className={`view-chip ${mode === 'map' ? 'active' : ''}`}
        onClick={() => onChange('map')}
        aria-label="地图视图"
      >
        地图
      </button>
      <button
        type="button"
        className={`view-chip ${mode === 'causal' ? 'active' : ''}`}
        onClick={() => onChange('causal')}
        aria-label="因果链视图"
      >
        因果链
      </button>
    </div>
  );
}
