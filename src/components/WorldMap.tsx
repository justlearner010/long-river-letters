import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { geoGraticule } from 'd3-geo';
import { loadCountries } from '../lib/world';
import { applyRotation, createPathGenerator, INITIAL_CENTER_LON } from '../lib/mapRenderer';
import type { AttributionFrame, GlobalLink } from '../types';
import MapCountry from './MapCountry';
import MapLinkLayer, { buildLinkSlots } from './MapLinkLayer';
import { polities } from '../data/polities';

interface WorldMapProps {
  frame: AttributionFrame;
  highlightIds: string[];
  links: GlobalLink[];
  flows: GlobalLink[];
  resetKey: string;
  onSelectPolity: (polityId: string, countryName: string) => void;
}

/** One full turn of the globe, in ms. Deliberately calm. */
const REVOLUTION_MS = 30_000;

/**
 * Repaint cap. Re-projecting 177 countries costs ~12ms on this machine, so at 60Hz there is
 * little headroom on slower hardware. At 30s per revolution one repaint moves the surface
 * ~1px, so 30Hz is visually indistinguishable from 60Hz while halving the projection work.
 * The rotation still advances by the *true* elapsed delta, so the speed stays exact.
 */
const PAINT_INTERVAL_MS = 1000 / 30;

const GRATICULE = geoGraticule().step([20, 20]);

type SvgPath = SVGPathElement;

function setPath(node: SvgPath | null, d: string | null) {
  if (node) node.setAttribute('d', d ?? '');
}

export default function WorldMap({ frame, highlightIds, links, flows, resetKey, onSelectPolity }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/.test(navigator.userAgent);
  const countries = useMemo(() => loadCountries(), []);

  /** Centre longitude, in degrees. Mutated by the rAF loop; never triggers a React render. */
  const rotationRef = useRef(INITIAL_CENTER_LON);

  // Keep the latest data reachable from the (long-lived) animation loop without re-creating it.
  const dataRef = useRef({ countries, links, flows });
  dataRef.current = { countries, links, flows };

  // Read the query lazily so the first paint already knows: otherwise the rotation effect
  // would start one frame before reduced-motion is detected and immediately cancel.
  const [reducedMotion, setReducedMotion] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(query.matches);
    const onChange = () => setReducedMotion(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const globe = useMemo(() => {
    const next = createPathGenerator(size.width, size.height);
    // Re-apply the in-flight rotation so a container resize does not snap the globe back to 0.
    applyRotation(next.projection, rotationRef.current);
    return next;
  }, [size.width, size.height]);

  const { projection, path, radius } = globe;
  const [centerX, centerY] = projection.translate();

  const spherePath = useMemo(() => path({ type: 'Sphere' } as never) ?? '', [path]);
  const graticulePath = useMemo(() => path(GRATICULE() as never) ?? '', [path]);

  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const polity of polities) {
      map.set(polity.id, polity.color);
    }
    return map;
  }, []);

  const highlightSet = useMemo(() => new Set(highlightIds), [highlightIds]);
  const hasHighlight = highlightIds.length > 0;

  /**
   * Baseline country geometry, computed once per projection so `MapCountry`'s memo stays hot.
   * Rotation never re-renders this tree: `MapCountry` memoizes on the path string, and the
   * rAF loop below rewrites the `d` attributes in place instead.
   */
  const countryPaths = useMemo(
    () => countries.map((country) => path(country.geometry as never) ?? ''),
    [countries, path],
  );

  const handleSelect = useCallback(
    (polityId: string, countryName: string) => onSelectPolity(polityId, countryName),
    [onSelectPolity],
  );

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const update = () => setSize({ width: container.clientWidth, height: container.clientHeight });
    update();
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(update);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (isJsdom) return;
    const svg = svgRef.current;
    if (!svg) return;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        select(svg).select('g.map-zoom').attr('transform', event.transform.toString());
      });
    select(svg).call(zoomBehavior).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, [isJsdom]);

  useEffect(() => {
    if (isJsdom) return;
    const svg = svgRef.current;
    if (!svg) return;
    const resetBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 8])
      .on('zoom', (event) => {
        select(svg).select('g.map-zoom').attr('transform', event.transform.toString());
      });
    select(svg).call(resetBehavior.transform, zoomIdentity);
  }, [resetKey, isJsdom]);

  /**
   * Globe rotation. Re-projects the graticule, every country and every link, and writes the
   * resulting `d` attributes straight to the DOM. React is deliberately bypassed here: a
   * re-render per frame would invalidate all 177 `MapCountry` memo entries, whereas mutating
   * the projection in place keeps the memo tree completely untouched. A full repaint measures
   * ~8-14ms here, so the loop also repaints at `PAINT_INTERVAL_MS` rather than every frame.
   */
  const paintRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (isJsdom) return;
    const svg = svgRef.current;
    if (!svg) return;

    const graticuleNode = svg.querySelector<SvgPath>('path.globe-graticule');
    const countryNodes = Array.from(svg.querySelectorAll<SvgPath>('path.map-country'));

    const paint = () => {
      const data = dataRef.current;
      setPath(graticuleNode, path(GRATICULE() as never));
      // Nodes come back in document order, which is the same order as `countries` — and some
      // world-atlas features carry no id, so position is the only reliable key.
      countryNodes.forEach((node, index) => {
        const country = data.countries[index];
        // React renders the baseline rotation, so a country can be hidden here and become
        // visible later purely from rotation: toggle visibility, don't rely on the initial value.
        const geometry = country ? path(country.geometry as never) : null;
        node.style.visibility = geometry ? '' : 'hidden';
        node.style.pointerEvents = geometry ? '' : 'none';
        setPath(node, geometry);
      });
      // Link nodes are re-queried every paint: changing the selected event swaps link keys, so
      // React replaces those nodes and any captured list would go stale.
      for (const dataset of ['links', 'flows'] as const) {
        // One slot per link, in data order: far-side links keep an empty node so they can
        // reappear as the globe turns without a React render.
        const slots = buildLinkSlots(data[dataset], data.countries, projection);
        svg.querySelectorAll<SvgPath>(`path[data-dataset="${dataset}"]`).forEach((node, index) => {
          setPath(node, slots[index]?.d ?? null);
        });
      }
    };

    paintRef.current = paint;

    if (reducedMotion || typeof requestAnimationFrame === 'undefined') return;

    let frame = 0;
    let previous = 0;
    let sinceLastPaint = PAINT_INTERVAL_MS;
    let cancelled = false;

    const step = (timestamp: number) => {
      if (cancelled) return;
      const delta = previous === 0 ? 0 : timestamp - previous;
      previous = timestamp;
      // Timestamp delta (not frame count) keeps the speed identical across refresh rates.
      rotationRef.current = (rotationRef.current + (360 * delta) / REVOLUTION_MS) % 360;
      sinceLastPaint += delta;
      if (sinceLastPaint >= PAINT_INTERVAL_MS) {
        sinceLastPaint = 0;
        applyRotation(projection, rotationRef.current);
        paint();
      }
      frame = requestAnimationFrame(step);
    };

    frame = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [path, projection, radius, reducedMotion, isJsdom, size.width, size.height]);

  /**
   * React renders the *baseline* (rotation-agnostic) geometry. Re-apply the live rotation
   * right after every commit so a re-rendered country never flashes at the wrong angle for
   * a frame. `MapCountry`'s memo stays intact: this only overwrites `d` attributes.
   */
  useEffect(() => {
    paintRef.current();
  });

  return (
    <div ref={containerRef} className="map-canvas">
      <svg ref={svgRef} data-testid="world-map" role="img" aria-label={`${frame.year} 年世界领土归属`}>
        <defs>
          {/* Warm highlight -> warm shadow. Never black: the palette stays aged-paper. */}
          <radialGradient id="globe-shading" cx="34%" cy="27%" r="80%">
            <stop offset="0%" className="globe-shade-highlight" stopOpacity="0.5" />
            <stop offset="46%" className="globe-shade-highlight" stopOpacity="0.05" />
            <stop offset="74%" className="globe-shade-shadow" stopOpacity="0.07" />
            <stop offset="100%" className="globe-shade-shadow" stopOpacity="0.4" />
          </radialGradient>
          <filter id="globe-halo" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        <g className="map-zoom">
          {/* Atmosphere: blurred warm bloom just outside the limb, drawn under the sphere. */}
          <circle
            className="globe-atmosphere"
            cx={centerX}
            cy={centerY}
            r={radius * 1.04}
            filter="url(#globe-halo)"
          />
          <path className="ocean-sphere" d={spherePath} />
          <path className="globe-graticule" d={graticulePath} />
          {countries.map((country, index) => {
            const owner = frame.ownership[country.name] ?? null;
            const isHighlighted = highlightSet.has(owner ?? '');
            const isDimmed = hasHighlight && !isHighlighted;
            return (
              <MapCountry
                key={country.name}
                countryId={country.id}
                countryName={country.name}
                owner={owner}
                path={countryPaths[index] ?? ''}
                fill={owner ? (colorMap.get(owner) ?? '#b6a27a') : '#cfc2a4'}
                isHighlighted={isHighlighted}
                isDimmed={isDimmed}
                onSelect={handleSelect}
              />
            );
          })}
          <MapLinkLayer links={links} flows={flows} countries={countries} projection={projection} />
          <circle className="globe-limb" cx={centerX} cy={centerY} r={radius} />
          <circle className="globe-shading" cx={centerX} cy={centerY} r={radius} fill="url(#globe-shading)" />
        </g>
      </svg>
    </div>
  );
}
