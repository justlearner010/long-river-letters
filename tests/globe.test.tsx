import { Profiler } from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { geoCentroid, geoInterpolate } from 'd3-geo';
import WorldMap from '../src/components/WorldMap';
import MapCountry from '../src/components/MapCountry';
import { buildGreatCirclePath, buildLinkSlots } from '../src/components/MapLinkLayer';
import { applyRotation, createPathGenerator, GLOBE_TILT, isVisible } from '../src/lib/mapRenderer';
import { loadCountries } from '../src/lib/world';
import type { GlobalLink } from '../src/types';

const countries = loadCountries();
const centroids = new Map(
  countries.map((country) => [country.name, geoCentroid(country.geometry as never) as [number, number]]),
);

/** Independent near-side test by 3D dot product, used to check `isVisible` and the arc clipper. */
function horizonDot(projection: ReturnType<typeof createPathGenerator>['projection'], point: [number, number]) {
  const unit = ([lon, lat]: [number, number]) => {
    const lambda = (lon * Math.PI) / 180;
    const phi = (lat * Math.PI) / 180;
    return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
  };
  const [rotationLon, rotationLat] = projection.rotate();
  const center = unit([-rotationLon, -rotationLat]);
  const v = unit(point);
  return v[0] * center[0] + v[1] * center[1] + v[2] * center[2];
}

describe('globe projection', () => {
  it('guards against a degenerate container size (jsdom reports clientWidth 0)', () => {
    const { projection, radius, path } = createPathGenerator(0, 0);
    expect(radius).toBeGreaterThan(0);
    expect(projection.scale()).toBeGreaterThan(0);
    expect(path({ type: 'Sphere' } as never)).toMatch(/^M/);
  });

  it('centres the globe in the canvas with a uniform margin', () => {
    for (const [width, height] of [[900, 560], [1440, 700], [390, 420], [800, 900]] as const) {
      const { projection } = createPathGenerator(width, height);
      const [x, y] = projection.translate();
      const radius = projection.scale();
      expect(x).toBeCloseTo(width / 2, 6);
      expect(y).toBeCloseTo(height / 2, 6);
      expect(radius).toBeLessThanOrEqual(Math.min(width, height) / 2);
    }
  });

  it('never lets a country cross the limb at any rotation', () => {
    const { projection, path } = createPathGenerator(900, 560);
    const radius = projection.scale();
    let worstOverflow = 0;
    for (let lon = 0; lon < 360; lon += 30) {
      for (let lat = -60; lat <= 60; lat += 30) {
        projection.rotate([-lon, -lat]);
        const [cx, cy] = projection.translate();
        for (const country of countries) {
          const d = path(country.geometry as never);
          if (!d) continue;
          expect(d).not.toMatch(/NaN|undefined/);
          for (const match of d.matchAll(/[ML](-?[\d.]+),(-?[\d.]+)/g)) {
            const overflow = Math.hypot(Number(match[1]) - cx, Number(match[2]) - cy) - radius;
            if (overflow > worstOverflow) worstOverflow = overflow;
          }
        }
      }
    }
    expect(worstOverflow).toBeLessThan(0.5);
  });

  it('tracks the configured tilt', () => {
    const { projection } = createPathGenerator(900, 560);
    applyRotation(projection, 105);
    const [lon, lat] = projection.rotate();
    expect(lon).toBeCloseTo(-105, 10);
    expect(lat).toBeCloseTo(-GLOBE_TILT, 10);
  });
});

describe('great-circle links', () => {
  const { projection } = createPathGenerator(900, 560);
  const radius = projection.scale();
  const [cx, cy] = projection.translate();

  it('clips away a link whose endpoints are both past the horizon', () => {
    // The antipode of the initial view: definitely the far side.
    const from: [number, number] = [-75 - 4, -18];
    const to: [number, number] = [-75 + 4, -18];
    expect(isVisible(projection, from)).toBe(false);
    expect(isVisible(projection, to)).toBe(false);
    expect(buildGreatCirclePath(from, to, projection)).toBeNull();
  });

  it('emits no vertex from behind the horizon and lands endpoints on the limb', () => {
    let compared = 0;
    let drawn = 0;
    let worstLimbGap = 0;

    for (const a of countries.slice(0, 40)) {
      for (const b of countries.slice(0, 40)) {
        if (a === b) continue;
        const from = centroids.get(a.name)!;
        const to = centroids.get(b.name)!;
        const actual = buildGreatCirclePath(from, to, projection);

        // Rebuild the expected path from scratch, using the independent 3D predicate instead of
        // `isVisible`. Comparing whole strings avoids the limbal ambiguity of matching vertices
        // back to samples, where several samples project onto almost the same pixel.
        const step = geoInterpolate(from, to);
        const runs: string[][] = [];
        let run: string[] = [];
        for (let s = 0; s <= 64; s += 1) {
          const sample = step(s / 64) as [number, number];
          if (horizonDot(projection, sample) < 0) {
            if (run.length > 1) runs.push(run);
            run = [];
            continue;
          }
          const projected = projection(sample)!;
          run.push(`${Math.round(projected[0] * 10) / 10},${Math.round(projected[1] * 10) / 10}`);
        }
        if (run.length > 1) runs.push(run);
        const expected = runs.length === 0 ? null : runs.map((points) => `M${points.join('L')}`).join('');

        expect(actual).toBe(expected);
        compared += 1;
        if (!actual) continue;
        drawn += 1;

        // A partially visible arc should stop essentially on the sphere edge.
        if (isVisible(projection, from) !== isVisible(projection, to)) {
          const vertices = [...actual.matchAll(/([\d.-]+),([\d.-]+)/g)].map((m) => [Number(m[1]), Number(m[2])]);
          const gap = Math.min(...vertices.map(([x, y]) => Math.abs(Math.hypot(x - cx, y - cy) - radius)));
          worstLimbGap = Math.max(worstLimbGap, gap);
        }
      }
    }

    expect(compared).toBe(40 * 39);
    expect(drawn).toBeGreaterThan(100);
    expect(worstLimbGap).toBeLessThan(2);
  });

  it('keeps one stable node per link so rotation can restore it', () => {
    const links: GlobalLink[] = [
      { from: 'China', to: 'India' },
      { from: 'China', to: 'Brazil' },
      { from: 'Nowhere', to: 'China' },
    ] as GlobalLink[];
    const slots = buildLinkSlots(links, countries, projection);
    expect(slots).toHaveLength(links.length);
    expect(slots.map((slot) => slot.key)).toEqual([
      'China-India-0',
      'China-Brazil-1',
      'Nowhere-China-2',
    ]);
    expect(slots[2].d).toBeNull();
  });
});

/** The rotation loop only starts in a browser-like environment, so stub just enough of one. */
function stubBrowser(userAgent = 'Mozilla/5.0 (Test)') {
  Object.defineProperty(navigator, 'userAgent', { value: userAgent, configurable: true });
  // d3-zoom's defaultExtent reads `svg.width.baseVal`, unimplemented in jsdom.
  for (const [prop, value] of [['width', 900], ['height', 560]] as const) {
    Object.defineProperty(SVGSVGElement.prototype, prop, {
      get: () => ({ baseVal: { value } }),
      configurable: true,
    });
  }
}

function renderGlobe() {
  let commits = 0;
  const utils = render(
    <Profiler id="map" onRender={() => { commits += 1; }}>
      <WorldMap
        frame={{ year: 1300, ownership: {} }}
        highlightIds={[]}
        links={[{ from: 'China', to: 'India' }] as GlobalLink[]}
        flows={[]}
        resetKey="c1"
        onSelectPolity={() => undefined}
      />
    </Profiler>,
  );
  return { ...utils, getCommits: () => commits };
}

describe('globe rotation', () => {
  const originalAgent = navigator.userAgent;
  afterEach(() => {
    cleanup();
    Object.defineProperty(navigator, 'userAgent', { value: originalAgent, configurable: true });
    delete (window as { matchMedia?: unknown }).matchMedia;
  });

  it('renders every country as a node, with far-side ones hidden rather than missing', () => {
    stubBrowser();
    const { container } = renderGlobe();
    const nodes = container.querySelectorAll('path.map-country');
    expect(nodes).toHaveLength(countries.length);
    const hidden = [...nodes].filter((node) => (node as SVGPathElement).style.visibility === 'hidden');
    expect(hidden.length).toBeGreaterThan(0);
    // Only the near-side countries have geometry.
    expect([...nodes].filter((n) => (n.getAttribute('d') ?? '').length > 0)).toHaveLength(
      countries.length - hidden.length,
    );
    expect(container.querySelector('path.globe-graticule')?.getAttribute('d')?.length).toBeGreaterThan(1000);
    expect(container.querySelector('circle.globe-atmosphere')).toBeInTheDocument();
    expect(container.querySelector('circle.globe-shading')).toBeInTheDocument();
  });

  it('rewrites geometry in the DOM without re-rendering the countries', async () => {
    stubBrowser();
    const { container, getCommits } = renderGlobe();
    const nodes = [...container.querySelectorAll<SVGPathElement>('path.map-country')];
    const before = nodes.map((node) => node.getAttribute('d'));
    const commitsOnMount = getCommits();

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(nodes.filter((node, index) => node.getAttribute('d') !== before[index]).length).toBeGreaterThan(0);
    // Same nodes reused, and React never re-committed: that is what keeps MapCountry's memo hot.
    expect([...container.querySelectorAll('path.map-country')]).toEqual(nodes);
    expect(getCommits()).toBe(commitsOnMount);
  });

  it('keeps driving links after React swaps them for a different event', async () => {
    stubBrowser();
    const { container, rerender } = render(
      <WorldMap
        frame={{ year: 1300, ownership: {} }}
        highlightIds={[]}
        links={[{ from: 'China', to: 'India' }] as GlobalLink[]}
        flows={[]}
        resetKey="c1"
        onSelectPolity={() => undefined}
      />,
    );
    // Changing the event changes the link list, which changes `key` and so replaces the node.
    rerender(
      <WorldMap
        frame={{ year: 1300, ownership: {} }}
        highlightIds={[]}
        links={[{ from: 'Egypt', to: 'Turkey' }] as GlobalLink[]}
        flows={[]}
        resetKey="c1"
        onSelectPolity={() => undefined}
      />,
    );
    const link = container.querySelector<SVGPathElement>('path.global-link')!;
    const d0 = link.getAttribute('d');

    await new Promise((resolve) => setTimeout(resolve, 250));

    expect(link.getAttribute('d')).not.toBe(d0);
    expect(link.getAttribute('d') ?? '').toMatch(/^M[\d.]+,[\d.]+L/);
  });

  it('does not animate at all under prefers-reduced-motion', async () => {
    stubBrowser();
    window.matchMedia = ((query: string) => ({
      matches: query.includes('prefers-reduced-motion'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      onchange: null,
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;

    const rafSpy = vi.spyOn(window, 'requestAnimationFrame');
    const { container, getCommits } = renderGlobe();
    const first = container.querySelector<SVGPathElement>('path.map-country');
    const d0 = first?.getAttribute('d');
    const commitsOnMount = getCommits();

    await new Promise((resolve) => setTimeout(resolve, 150));

    expect(rafSpy).not.toHaveBeenCalled();
    expect(first?.getAttribute('d')).toBe(d0);
    expect(getCommits()).toBe(commitsOnMount);
    rafSpy.mockRestore();
  });

  it('renders an off-globe country as a hidden, non-interactive node', () => {
    const base = {
      countryId: '1',
      countryName: 'T',
      owner: 'P',
      fill: '#fff',
      isHighlighted: false,
      isDimmed: false,
      onSelect: vi.fn(),
    };
    const { container, rerender } = render(
      <svg>
        <MapCountry {...base} path="M0,0L1,1" />
      </svg>,
    );
    const onGlobe = container.querySelector<SVGPathElement>('path.map-country')!;
    expect(onGlobe.getAttribute('d')).toBe('M0,0L1,1');
    expect(onGlobe.style.visibility).toBe('');

    rerender(
      <svg>
        <MapCountry {...base} path={null} />
      </svg>,
    );
    const offGlobe = container.querySelector<SVGPathElement>('path.map-country')!;
    expect(offGlobe.getAttribute('d')).toBe('');
    expect(offGlobe.style.visibility).toBe('hidden');
    expect(offGlobe.style.pointerEvents).toBe('none');
    offGlobe.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(base.onSelect).not.toHaveBeenCalled();
  });
});
