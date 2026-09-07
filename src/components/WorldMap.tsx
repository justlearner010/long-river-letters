import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { loadCountries } from '../lib/world';
import { createPathGenerator } from '../lib/mapRenderer';
import type { AttributionFrame } from '../types';

interface WorldMapProps {
  frame: AttributionFrame;
  highlightIds: string[];
  onSelectPolity: (polityId: string, countryName: string) => void;
}

export default function WorldMap({ frame, highlightIds, onSelectPolity }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/.test(navigator.userAgent);
  const countries = useMemo(() => loadCountries(), []);
  const { path } = useMemo(() => createPathGenerator(size.width, size.height), [size]);

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
  }, []);

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
  }, [frame.year]);

  return (
    <div ref={containerRef} className="map-canvas">
      <svg ref={svgRef} data-testid="world-map" role="img" aria-label={`${frame.year} 年世界领土归属`}>
        <g className="map-zoom">
          <path className="ocean-sphere" d={path({ type: 'Sphere' } as never) ?? ''} />
          {countries.map((country, index) => {
            const owner = frame.ownership[country.name] ?? null;
            const isHighlight = highlightIds.includes(owner ?? '');
            return (
              <path
                key={`${country.id}-${index}`}
                className={`country ${owner ? 'owned' : 'unowned'} ${isHighlight ? 'highlight' : ''}`}
                d={path(country.geometry as never) ?? ''}
                data-country={country.name}
                data-owner={owner ?? ''}
                onClick={() => owner && onSelectPolity(owner, country.name)}
              >
                <title>{`${country.name}${owner ? ` · ${owner}` : ' · 无明确归属'}`}</title>
              </path>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
