import { memo, useCallback } from 'react';
import type { Geometry } from 'geojson';

interface MapCountryProps {
  countryId: string;
  countryName: string;
  owner: string | null;
  path: string | null;
  fill: string;
  isHighlighted: boolean;
  isDimmed: boolean;
  onSelect: (polityId: string, countryName: string) => void;
}

function MapCountry({
  countryId,
  countryName,
  owner,
  path,
  fill,
  isHighlighted,
  isDimmed,
  onSelect,
}: MapCountryProps) {
  // Countries past the horizon still render a node (with an empty `d`), because the rotation
  // loop in WorldMap writes geometry directly to these nodes and only the nodes present at
  // mount time can ever be brought back into view.
  const visible = Boolean(path);

  const handleClick = useCallback(() => {
    // A node is also click-through by style, but guard here too so an off-globe country can
    // never be selected through a synthetic or programmatic click.
    if (owner && visible) onSelect(owner, countryName);
  }, [owner, countryName, onSelect, visible]);

  return (
    <path
      d={path ?? ''}
      className={`map-country ${owner ? 'owned' : 'unowned'} ${isHighlighted ? 'highlight' : ''} ${isDimmed ? 'dimmed' : ''}`}
      style={{ fill, visibility: visible ? undefined : 'hidden', pointerEvents: visible ? undefined : 'none' }}
      data-country={countryName}
      data-owner={owner ?? ''}
      onClick={handleClick}
    >
      <title>{`${countryName}${owner ? ` · ${owner}` : ' · 无明确归属'}`}</title>
    </path>
  );
}

export default memo(MapCountry, (prev, next) => {
  return (
    prev.path === next.path &&
    prev.fill === next.fill &&
    prev.isHighlighted === next.isHighlighted &&
    prev.isDimmed === next.isDimmed &&
    prev.owner === next.owner &&
    prev.countryName === next.countryName &&
    prev.countryId === next.countryId
  );
});
