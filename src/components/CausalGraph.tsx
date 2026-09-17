import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import type { WorldEvent } from '../types';
import type { CausalLink } from '../data/causalLinks';
import { chapters } from '../data/chapters';

interface CausalGraphProps {
  events: WorldEvent[];
  currentEventId: string | null;
  onSelectEvent: (eventId: string) => void;
}

interface GraphNode {
  event: WorldEvent;
  x: number;
  y: number;
  chapterIndex: number;
}

const PADDING_X = 70;
const PADDING_Y = 70;
const COLUMN_WIDTH = 180;
const NODE_RADIUS = 7;

function isLinked(event: WorldEvent): boolean {
  return (event.upstream?.length ?? 0) > 0 || (event.downstream?.length ?? 0) > 0;
}

function buildNodes(events: WorldEvent[], width: number, height: number) {
  const linkedEvents = events.filter(isLinked);
  const chapterMap = new Map(chapters.map((c, i) => [c.id, i]));
  const eventsByChapter = new Map<string, WorldEvent[]>();

  for (const event of linkedEvents) {
    const list = eventsByChapter.get(event.chapterId) ?? [];
    list.push(event);
    eventsByChapter.set(event.chapterId, list);
  }

  for (const list of eventsByChapter.values()) {
    list.sort((a, b) => a.year - b.year);
  }

  const columnCount = Math.max(1, eventsByChapter.size);
  const neededWidth = PADDING_X * 2 + (columnCount - 1) * COLUMN_WIDTH;
  const contentWidth = Math.max(width, neededWidth);
  const usableHeight = Math.max(160, height - PADDING_Y * 2);

  const nodes: GraphNode[] = [];
  const chapterColumns = Array.from(eventsByChapter.entries()).sort(
    ([a], [b]) => (chapterMap.get(a) ?? 0) - (chapterMap.get(b) ?? 0),
  );

  chapterColumns.forEach(([chapterId, list], columnIndex) => {
    const x = PADDING_X + (columnIndex / Math.max(1, columnCount - 1)) * (contentWidth - PADDING_X * 2);
    const stepY = list.length > 1 ? usableHeight / (list.length - 1) : usableHeight / 2;
    list.forEach((event, index) => {
      const y = PADDING_Y + (list.length === 1 ? usableHeight / 2 : index * stepY);
      nodes.push({ event, x, y, chapterIndex: columnIndex });
    });
  });

  return { nodes, contentWidth, chapterColumns };
}

function abbreviateTitle(title: string, maxLen = 10): string {
  if (title.length <= maxLen) return title;
  return `${title.slice(0, maxLen)}…`;
}

export default function CausalGraph({ events, currentEventId, onSelectEvent }: CausalGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ width: 900, height: 560 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const matchedIds = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set<string>();
    return new Set(
      events
        .filter((event) =>
          event.title.toLowerCase().includes(q) ||
          String(event.year).includes(q) ||
          event.summary.toLowerCase().includes(q),
        )
        .map((event) => event.id),
    );
  }, [search, events]);

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

  const { nodes, contentWidth, chapterColumns } = useMemo(
    () => buildNodes(events, size.width, size.height),
    [events, size],
  );
  const nodeMap = useMemo(() => new Map(nodes.map((n) => [n.event.id, n])), [nodes]);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const zoomBehavior = zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on('zoom', (event) => {
        select(svg).select('g.causal-zoom').attr('transform', event.transform.toString());
      });
    select(svg).call(zoomBehavior).on('dblclick.zoom', null);
    return () => {
      select(svg).on('.zoom', null);
    };
  }, []);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    select(svg).call(
      zoom<SVGSVGElement, unknown>().transform,
      zoomIdentity.translate(Math.min(0, size.width - contentWidth), 0),
    );
  }, [contentWidth, size.width]);

  const current = currentEventId ? nodeMap.get(currentEventId) ?? null : null;
  const relatedIds = useMemo(() => {
    if (!currentEventId) return new Set<string>();
    const event = events.find((e) => e.id === currentEventId);
    if (!event) return new Set<string>();
    const ids = new Set<string>();
    for (const link of event.upstream ?? []) ids.add(link.fromEventId);
    for (const link of event.downstream ?? []) ids.add(link.toEventId);
    return ids;
  }, [currentEventId, events]);

  const allLinks = useMemo(() => {
    const list: { link: CausalLink; from: GraphNode; to: GraphNode; id: string }[] = [];
    for (const node of nodes) {
      for (const link of node.event.downstream ?? []) {
        const target = nodeMap.get(link.toEventId);
        if (!target) continue;
        list.push({ link, from: node, to: target, id: `${link.fromEventId}->${link.toEventId}` });
      }
    }
    return list;
  }, [nodes, nodeMap]);

  const activeLinkIds = useMemo(() => {
    if (!currentEventId) return new Set<string>();
    return new Set(
      allLinks
        .filter((l) => l.link.fromEventId === currentEventId || l.link.toEventId === currentEventId)
        .map((l) => l.id),
    );
  }, [currentEventId, allLinks]);

  const hoveredNode = hoveredId ? nodeMap.get(hoveredId) ?? null : null;
  const tooltipEvent = hoveredNode?.event ?? current?.event ?? null;

  const focusOnEvent = (eventId: string) => {
    const node = nodeMap.get(eventId);
    const svg = svgRef.current;
    if (!node || !svg) return;
    onSelectEvent(eventId);
    const scale = 1.4;
    const tx = size.width / 2 - node.x * scale;
    const ty = size.height / 2 - node.y * scale;
    select(svg).call(
      zoom<SVGSVGElement, unknown>().transform,
      zoomIdentity.translate(tx, ty).scale(scale),
    );
  };

  const handleKeyDown = (event: React.KeyboardEvent, eventId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      focusOnEvent(eventId);
    }
  };

  return (
    <div ref={containerRef} className="causal-graph">
      <svg ref={svgRef} data-testid="causal-graph" role="img" aria-label="历史事件因果链">
        <defs>
          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--ink-soft)" opacity="0.7" />
          </marker>
          <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
            <polygon points="0 0, 10 3.5, 0 7" fill="var(--accent)" />
          </marker>
        </defs>
        <g className="causal-zoom">
          <g className="causal-chapters">
            {chapterColumns.map(([chapterId, list], index) => {
              const chapter = chapters.find((c) => c.id === chapterId);
              if (!chapter || list.length === 0) return null;
              const node = nodeMap.get(list[0].id);
              if (!node) return null;
              return (
                <text
                  key={chapterId}
                  x={node.x}
                  y={28}
                  className="causal-chapter-label"
                  textAnchor="middle"
                >
                  {chapter.title}
                </text>
              );
            })}
          </g>
          <g className="causal-links">
            {allLinks.map((item) => {
              const isActive = activeLinkIds.has(item.id);
              const dx = item.to.x - item.from.x;
              const controlX = item.from.x + dx * 0.5;
              const controlY = item.from.y + (item.to.y - item.from.y) * 0.2;
              const d = `M${item.from.x},${item.from.y} C${controlX},${controlY} ${controlX},${item.to.y} ${item.to.x},${item.to.y}`;
              return (
                <path
                  key={item.id}
                  className={`causal-link ${isActive ? 'active' : ''}`}
                  d={d}
                  markerEnd={isActive ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                />
              );
            })}
          </g>
          <g className="causal-nodes">
            {nodes.map((node) => {
              const isCurrent = node.event.id === currentEventId;
              const isRelated = relatedIds.has(node.event.id);
              const isHovered = node.event.id === hoveredId;
              return (
                <g
                 key={node.event.id}
                  className={`causal-node ${isCurrent ? 'current' : ''} ${isRelated ? 'related' : ''} ${isHovered ? 'hovered' : ''} ${matchedIds.has(node.event.id) ? 'matched' : ''}`}
                  transform={`translate(${node.x}, ${node.y})`}
                  onClick={() => focusOnEvent(node.event.id)}
                  onMouseEnter={() => setHoveredId(node.event.id)}
                  onMouseLeave={() => setHoveredId((id) => (id === node.event.id ? null : id))}
                  onKeyDown={(e) => handleKeyDown(e, node.event.id)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${node.event.year} ${node.event.title}`}
                >
                  <circle r={NODE_RADIUS} />
                  <text x={NODE_RADIUS + 8} y={4} className="causal-node-year">
                    {node.event.year}
                  </text>
                  <text x={NODE_RADIUS + 8} y={18} className="causal-node-title">
                    {abbreviateTitle(node.event.title)}
                  </text>
                </g>
              );
            })}
          </g>
        </g>
      </svg>
      {tooltipEvent && (
        <div className="causal-tooltip">
          <span className="causal-tooltip-year">{tooltipEvent.year}</span>
          <strong>{tooltipEvent.title}</strong>
          <p>{tooltipEvent.summary}</p>
        </div>
      )}
      <div className="causal-search">
        <input
          type="text"
          placeholder="搜索事件或年份…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label="搜索因果链事件"
        />
        {search.trim() && matchedIds.size > 0 && (
          <div className="causal-search-results">
            {events
              .filter((event) => matchedIds.has(event.id))
              .slice(0, 8)
              .map((event) => (
                <button
                  key={event.id}
                  type="button"
                  className="causal-search-result"
                  onClick={() => {
                    focusOnEvent(event.id);
                    setSearch('');
                  }}
                >
                  <span className="result-year">{event.year}</span>
                  <span className="result-title">{event.title}</span>
                </button>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
