import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { geoCentroid } from 'd3-geo';
import { loadCountries } from '../lib/world';
import { createPathGenerator } from '../lib/mapRenderer';
import type { AttributionFrame, GlobalLink } from '../types';

interface WorldMapProps {
  frame: AttributionFrame;
  highlightIds: string[];
  links: GlobalLink[];
  onSelectPolity: (polityId: string, countryName: string) => void;
}

export default function WorldMap({ frame, highlightIds, links, onSelectPolity }: WorldMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const isJsdom = typeof navigator !== 'undefined' && /jsdom/.test(navigator.userAgent);
  const countries = useMemo(() => loadCountries(), []);
  const { path, projection } = useMemo(() => createPathGenerator(size.width, size.height), [size]);

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
          {links.map((link, index) => {
            const from = countries.find((country) => country.name === link.from);
            const to = countries.find((country) => country.name === link.to);
            if (!from || !to) return null;
            const p1 = projection(geoCentroid(from.geometry as never));
            const p2 = projection(geoCentroid(to.geometry as never));
            if (!p1 || !p2) return null;
            const midX = (p1[0] + p2[0]) / 2;
            const midY = (p1[1] + p2[1]) / 2;
            const distance = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
            const arcHeight = Math.min(70, distance * 0.35);
            const controlY = midY - arcHeight;
            const arc = `M${p1[0]},${p1[1]} Q${midX},${controlY} ${p2[0]},${p2[1]}`;
            return <path key={`global-link-${index}`} className="global-link" d={arc} />;
          })}
        </g>
      </svg>
    </div>
  );
}
