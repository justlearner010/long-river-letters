import type { WorldEvent } from '../types';

interface PlaybackBarProps {
  mode: 'slice' | 'event';
  playing: boolean;
  currentEvent: WorldEvent | null;
  label: string;
  index: number;
  total: number;
  speed: number;
  quizEnabled: boolean;
  quizScore: number;
  quizAnswered: number;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onModeChange: (mode: 'slice' | 'event') => void;
  onSpeedChange: (speed: number) => void;
  onToggleQuiz: () => void;
}

export default function PlaybackBar({
  mode,
  playing,
  currentEvent,
  label,
  index,
  total,
  speed,
  quizEnabled,
  quizScore,
  quizAnswered,
  onTogglePlay,
  onPrev,
  onNext,
  onModeChange,
  onSpeedChange,
  onToggleQuiz,
}: PlaybackBarProps) {
  const yearRange = currentEvent?.startYear
    ? `${currentEvent.startYear}–${currentEvent.endYear ?? currentEvent.year}`
    : '';
  return (
    <div className="playback-bar" role="group" aria-label="播放控制">
      <div className="mode-toggle" role="group" aria-label="播放方式">
        <button
          type="button"
          className={`mode-chip ${mode === 'slice' ? 'active' : ''}`}
          onClick={() => onModeChange('slice')}
        >
          切片播放
        </button>
        <button
          type="button"
          className={`mode-chip ${mode === 'event' ? 'active' : ''}`}
          onClick={() => onModeChange('event')}
        >
          事件播放
        </button>
      </div>
      <div className="speed-toggle" role="group" aria-label="播放速度">
        {[0.5, 1, 2, 4].map((s) => (
          <button
            key={s}
            type="button"
            className={`speed-chip ${speed === s ? 'active' : ''}`}
            onClick={() => onSpeedChange(s)}
            aria-label={`${s}x`}
          >
            {s}x
          </button>
        ))}
      </div>
      <button type="button" className="step-button" onClick={onPrev} aria-label="上一个">‹</button>
      <button type="button" className="play-button" onClick={onTogglePlay} aria-label={playing ? '暂停' : '播放'}>
        {playing ? '暂停' : '播放'}
      </button>
      <button type="button" className="step-button" onClick={onNext} aria-label="下一个">›</button>
      <div className="playback-info">
        <strong>{currentEvent?.title ?? label}</strong>
        {yearRange && <span className="playback-year">{yearRange}</span>}
      </div>
      <div className="playback-progress">
        <span>{index + 1}</span>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${total ? ((index + 1) / total) * 100 : 0}%` }} />
        </div>
        <span>{total}</span>
      </div>
      <button
        type="button"
        className={`quiz-toggle ${quizEnabled ? 'active' : ''}`}
        onClick={onToggleQuiz}
        aria-label={quizEnabled ? '关闭测验模式' : '开启测验模式'}
        title={quizEnabled ? '关闭测验模式' : '开启测验模式'}
      >
        测验
      </button>
      {quizEnabled && quizAnswered > 0 && (
        <span className="quiz-score" aria-live="polite">
          {quizScore}/{quizAnswered}
        </span>
      )}
    </div>
  );
}
