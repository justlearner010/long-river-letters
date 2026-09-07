import world from 'world-atlas/countries-110m.json';
import { feature } from 'topojson-client';
import type { FeatureCollection, Geometry } from 'geojson';

export interface BaseCountry {
  id: string;
  name: string;
  geometry: Geometry;
}

export function loadCountries(): BaseCountry[] {
  const topology = world as unknown as { objects: { countries: unknown } };
  const fc = feature(
    topology as unknown as Parameters<typeof feature>[0],
    topology.objects.countries as Parameters<typeof feature>[1],
  ) as unknown as FeatureCollection;
  return fc.features.map((featureItem) => ({
    id: String(featureItem.id),
    name: String((featureItem.properties as Record<string, unknown> | null)?.name ?? featureItem.id),
    geometry: featureItem.geometry as Geometry,
  }));
}
