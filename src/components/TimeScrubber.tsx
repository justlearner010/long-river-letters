import type { EraSlice } from '../types';

interface TimeScrubberProps {
  slices: EraSlice[];
  activeSliceId: string;
  playing: boolean;
  onSelectSlice: (sliceId: string) => void;
  onTogglePlay: () => void;
}

export default function TimeScrubber({ slices: sliceList, activeSliceId, playing, onSelectSlice, onTogglePlay }: TimeScrubberProps) {
  const index = Math.max(0, sliceList.findIndex((slice) => slice.id === activeSliceId));
  return (
    <div className="time-scrubber">
      <button type="button" className="play-button" onClick={onTogglePlay} aria-label={playing ? '暂停' : '播放'}>
        {playing ? '暂停' : '播放'}
      </button>
      <input
        type="range"
        min={0}
        max={Math.max(0, sliceList.length - 1)}
        value={index}
        aria-label="年代切片"
        onChange={(event) => onSelectSlice(sliceList[Number(event.target.value)]?.id ?? activeSliceId)}
      />
      <span className="scrubber-year">{sliceList[index]?.year ?? ''}</span>
    </div>
  );
}
