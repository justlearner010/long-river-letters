import { geoOrthographic, geoPath } from 'd3-geo';
import type { GeoProjection } from 'd3-geo';

/**
 * Orthographic (globe) projection setup.
 *
 * Notes verified against d3-geo@3.1.1 + world-atlas countries-110m (177 countries):
 * - `geoOrthographic()` already defaults to `clipAngle(90.000001)`, so far-side geometry is
 *   culled by `path()` rather than folded over the front hemisphere. We set `.clipAngle(90)`
 *   explicitly as a documented, zero-cost guard against a future ordering regression.
 * - `projection([lon, lat])` performs **no** visibility test. Callers that draw anything
 *   between two coordinates (see MapLinkLayer) must use `isVisible()` below.
 * - `fitExtent` with a degenerate box (jsdom reports `clientWidth === 0`) yields a negative
 *   scale, i.e. a negative-radius sphere. `createPathGenerator` guards against that.
 */

/** Breathing room (px) between the globe limb and the SVG edge, for the atmosphere halo. */
export const GLOBE_PADDING = 26;

/** Fixed tilt so the poles read as a globe rather than a flat disc. Negative = tilt toward viewer. */
export const GLOBE_TILT = 18;

/** Initial centre longitude: China, so the history-relevant hemisphere is face-on. */
export const INITIAL_CENTER_LON = 105;

/** Fallback viewport used when the container reports a degenerate size (jsdom, pre-layout). */
export const FALLBACK_SIZE = { width: 900, height: 560 };

/** Angular half-width of the visible hemisphere, in radians. */
const HORIZON = Math.PI / 2;

const SPHERE = { type: 'Sphere' } as never;

export interface GlobeProjection {
  projection: GeoProjection;
  path: ReturnType<typeof geoPath>;
  /** Globe radius in px (equal to the projection scale for orthographic). */
  radius: number;
}

/** Rotate a projection to a given centre longitude, preserving the configured tilt. */
export function applyRotation(projection: GeoProjection, centerLon: number): void {
  projection.rotate([-centerLon, -GLOBE_TILT]);
}

/** Current centre longitude of a rotated projection, normalised to [0, 360). */
export function currentCenterLon(projection: GeoProjection): number {
  const lon = -projection.rotate()[0];
  return ((lon % 360) + 360) % 360;
}

/**
 * True when a coordinate lies on the near (visible) hemisphere of the current rotation.
 * `projection([lon, lat])` alone is not enough: a far-side point can still land inside the
 * projected disc (e.g. the USA centroid at rotation 0 projects to 264px from centre with R=268).
 */
export function isVisible(projection: GeoProjection, point: [number, number]): boolean {
  const [rotationLon, rotationLat] = projection.rotate();
  const centerLon = -rotationLon;
  const centerLat = -rotationLat;
  const deltaLon = ((point[0] - centerLon) * Math.PI) / 180;
  const phi1 = (point[1] * Math.PI) / 180;
  const phi2 = (centerLat * Math.PI) / 180;
  const cosAngle = Math.sin(phi1) * Math.sin(phi2) + Math.cos(phi1) * Math.cos(phi2) * Math.cos(deltaLon);
  return Math.acos(Math.max(-1, Math.min(1, cosAngle))) <= HORIZON + 1e-9;
}

export function createPathGenerator(width: number, height: number): GlobeProjection {
  const safeWidth = Number.isFinite(width) && width > GLOBE_PADDING * 2 + 1 ? width : FALLBACK_SIZE.width;
  const safeHeight = Number.isFinite(height) && height > GLOBE_PADDING * 2 + 1 ? height : FALLBACK_SIZE.height;

  const projection = geoOrthographic()
    .clipAngle(90)
    .fitExtent(
      [
        [GLOBE_PADDING, GLOBE_PADDING],
        [safeWidth - GLOBE_PADDING, safeHeight - GLOBE_PADDING],
      ],
      SPHERE,
    );

  applyRotation(projection, INITIAL_CENTER_LON);

  const path = geoPath(projection);
  const radius = Number.isFinite(projection.scale()) && projection.scale() > 0 ? projection.scale() : 1;
  return { projection, path, radius };
}
