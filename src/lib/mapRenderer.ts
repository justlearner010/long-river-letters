import { geoNaturalEarth1, geoPath } from 'd3-geo';

export function createPathGenerator(width: number, height: number) {
  const projection = geoNaturalEarth1().fitExtent(
    [[12, 12], [width - 12, height - 12]],
    { type: 'Sphere' } as never,
  );
  const path = geoPath(projection);
  return { projection, path };
}
