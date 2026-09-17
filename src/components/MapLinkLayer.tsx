import { memo, useMemo } from 'react';
import { geoCentroid, geoInterpolate } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';
import type { BaseCountry } from '../lib/world';
import { isVisible } from '../lib/mapRenderer';
import type { GlobalLink } from '../types';

interface MapLinkLayerProps {
  links: GlobalLink[];
  flows: GlobalLink[];
  countries: BaseCountry[];
  projection: GeoProjection;
}

/** Sampling resolution for great-circle links. 64 segments is visually smooth at globe scale. */
const ARC_SAMPLES = 64;

export interface LinkGeometry {
  key: string;
  d: string | null;
}

const centroidCache = new WeakMap<BaseCountry[], Map<string, [number, number]>>();

function centroidIndex(countries: BaseCountry[]): Map<string, [number, number]> {
  let index = centroidCache.get(countries);
  if (!index) {
    index = new Map();
    for (const country of countries) {
      const centroid = geoCentroid(country.geometry as never) as [number, number];
      if (Number.isFinite(centroid[0]) && Number.isFinite(centroid[1])) {
        index.set(country.name, centroid);
      }
    }
    centroidCache.set(countries, index);
  }
  return index;
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Great-circle link between two lon/lat points, horizon-clipped to the visible hemisphere.
 *
 * A screen-space Bezier is wrong on a globe: measured against R, the old `Q` curves dipped
 * between 4px and 214px *inside* the sphere for every real link pair (Egypt -> Turkey, only
 * 13 degrees apart, cut 99px into the interior). Sampling the true great circle and dropping
 * samples past the horizon keeps every stroke outside the globe body; a fully far-side pair
 * emits nothing at all rather than a fabricated line through the sphere.
 */
export function buildGreatCirclePath(
  from: [number, number],
  to: [number, number],
  projection: GeoProjection,
): string | null {
  const interpolate = geoInterpolate(from, to);
  const runs: string[][] = [];
  let run: string[] = [];

  for (let i = 0; i <= ARC_SAMPLES; i += 1) {
    const sample = interpolate(i / ARC_SAMPLES) as [number, number];
    const projected = isVisible(projection, sample) ? projection(sample) : null;
    if (projected && Number.isFinite(projected[0]) && Number.isFinite(projected[1])) {
      run.push(`${round(projected[0])},${round(projected[1])}`);
      continue;
    }
    if (run.length > 1) runs.push(run);
    run = [];
  }
  if (run.length > 1) runs.push(run);
  if (runs.length === 0) return null;

  return runs.map((points) => `M${points.join('L')}`).join('');
}

/**
 * Single source of truth for link geometry, shared by the React render and the rotation
 * rAF tick in WorldMap (which rewrites `d` attributes directly to avoid re-rendering).
 */
export function buildLinkPaths(
  items: GlobalLink[],
  countries: BaseCountry[],
  projection: GeoProjection,
): LinkGeometry[] {
  const centroids = centroidIndex(countries);
  return items.map((link, index) => {
    const from = centroids.get(link.from);
    const to = centroids.get(link.to);
    return {
      key: `${link.from}-${link.to}-${index}`,
      d: from && to ? buildGreatCirclePath(from, to, projection) : null,
    };
  });
}

/**
 * One stable slot per link, in the same order as `items`. A slot is empty when the endpoints
 * are currently past the horizon, but the node still exists so the rotation loop can bring it
 * back without a React render.
 */
export function buildLinkSlots(
  items: GlobalLink[],
  countries: BaseCountry[],
  projection: GeoProjection,
): LinkGeometry[] {
  return buildLinkPaths(items, countries, projection);
}

function MapLinkLayer({ links, flows, countries, projection }: MapLinkLayerProps) {
  const linkPaths = useMemo(() => buildLinkSlots(links, countries, projection), [links, countries, projection]);

  const flowPaths = useMemo(() => buildLinkSlots(flows, countries, projection), [flows, countries, projection]);

  return (
    <g className="map-link-layer">
      {linkPaths.map((item) => (
        <path key={item.key} data-dataset="links" className="global-link" d={item.d ?? ''} />
      ))}
      {flowPaths.map((item) => (
        <path key={item.key} data-dataset="flows" className="migration-flow" d={item.d ?? ''} />
      ))}
    </g>
  );
}

export default memo(MapLinkLayer, (prev, next) => {
  return (
    prev.links === next.links &&
    prev.flows === next.flows &&
    prev.countries === next.countries &&
    prev.projection === next.projection
  );
});
