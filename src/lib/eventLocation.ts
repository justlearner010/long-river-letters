import { geoCentroid } from 'd3-geo';
import { loadCountries } from './world';
import { polityRules } from '../data/polityRules';

/**
 * Event records carry only coarse `regions` and `polityIds`, no coordinates.
 * Rather than add a field to 126 events, derive the centroid from the polities
 * involved: look up which countries each polity rules, then average the ones
 * whose centroid falls inside the event's year.
 */
const centroids = new Map<string, [number, number]>();

function countryCentroid(name: string): [number, number] | null {
  if (centroids.has(name)) return centroids.get(name)!;
  const country = loadCountries().find((candidate) => candidate.name === name);
  if (!country) return null;
  const [lon, lat] = geoCentroid(country.geometry as never);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  const value: [number, number] = [lon, lat];
  centroids.set(name, value);
  return value;
}

export function locationForPolities(polityIds: string[], year: number): number | null {
  const names = polityRules
    .filter(
      (rule) =>
        polityIds.includes(rule.polityId) && year >= rule.from && year <= rule.to,
    )
    .flatMap((rule) => rule.countryNames);
  if (names.length === 0) return null;

  const points = Array.from(new Set(names))
    .map(countryCentroid)
    .filter((point): point is [number, number] => point !== null);
  if (points.length === 0) return null;

  // Circular mean: averaging degrees directly breaks across the antimeridian.
  let x = 0;
  let y = 0;
  for (const [lon] of points) {
    x += Math.cos((lon * Math.PI) / 180);
    y += Math.sin((lon * Math.PI) / 180);
  }
  return (Math.atan2(y, x) * 180) / Math.PI;
}
