import { useEffect, useState } from 'react';
import type { WorldEvent } from '../types';
import type { Letter, LetterIntent } from '../data/letters';
import { getLetterIntent, getLetterSpec, getLetterSpecsForIntent, letterIntents } from '../data/letters';
import type { Figure } from '../data/figures';
import { getFigure } from '../data/figures';
import { getEnrichedEvent } from '../lib/enrichEvents';
import ConcernPicker from './ConcernPicker';
import ObjectViewer from './ObjectViewer';

const KIND_LABEL: Record<Figure['kind'], string> = {
  historical: '史有其人',
  archetypal: '时代亲历者（据史料重构）',
};

export interface ObjectAttachment {
  src: string;
  label: string;
}

interface LetterViewProps {
  intentId: string | null;
  specId: string | null;
  objects: Record<string, ObjectAttachment>;
  focusedEventId: string | null;
  onPickIntent: (intentId: string) => void;
  onFocusEvent: (eventId: string | null) => void;
  /** Fired once the letter has finished revealing, so the map can play backward. */
  onDescend: (eventId: string) => void;
  onClose: () => void;
}

export function formatYear(year: number): string {
  return year < 0 ? `公元前 ${-year}` : `公元 ${year}`;
}

/**
 * Generated prose is committed as JSON but may legitimately not exist yet.
 * A missing glob is resolved eagerly at build time, so the loader is written
 * defensively: absent file means "no prose", never a build or render failure.
 */
const proseModules = import.meta.glob('../data/letters.generated.json', { eager: true }) as Record<
  string,
  { default?: Record<string, Partial<Letter>> }
>;

const proseCache: Record<string, Partial<Letter>> = (() => {
  for (const mod of Object.values(proseModules)) {
    const data = mod.default ?? (mod as unknown as Record<string, Partial<Letter>>);
    if (data && typeof data === 'object') return data;
  }
  return {};
})();

function useGeneratedProse(): Record<string, Partial<Letter>> {
  return proseCache;
}

export default function LetterView({
  intentId,
  specId,
  objects,
  focusedEventId,
  onPickIntent,
  onFocusEvent,
  onDescend,
  onClose,
}: LetterViewProps) {
  const prose = useGeneratedProse();
  const [settled, setSettled] = useState(false);

  // The letter reveals over ~3s; only then does the map move, so the reader is
  // looking at the letter rather than an animation behind it.
  const anchorId = specId ? getLetterSpec(specId)?.eventId ?? null : null;
  useEffect(() => {
    if (!anchorId) {
      setSettled(false);
      return;
    }
    const timer = window.setTimeout(() => setSettled(true), 3000);
    return () => window.clearTimeout(timer);
  }, [anchorId]);

  useEffect(() => {
    if (settled && anchorId) onDescend(anchorId);
  }, [settled, anchorId, onDescend]);

  if (!intentId) {
    return <ConcernPicker intents={availableIntents()} onPick={onPickIntent} onClose={onClose} />;
  }

  const intent = getLetterIntent(intentId);
  const spec = specId ? getLetterSpec(specId) : null;
  const figure = spec ? getFigure(spec.figureId) : null;
  const anchorEvent = spec ? getEnrichedEvent(spec.eventId) : null;
  const firstSpec = getLetterSpecsForIntent(intentId)[0] ?? null;

  if (!intent) {
    return null;
  }

  // No concrete letter picked yet: show the intent's guiding question and let the reader choose.
  if (!spec || !figure || !anchorEvent) {
    const candidates = getLetterSpecsForIntent(intentId)
      .map((candidate) => ({ candidate, figure: getFigure(candidate.figureId) }))
      .filter((entry) => entry.figure !== null);
    return (
      <div className="letter-overlay" role="dialog" aria-label="来信">
        <header className="letter-head">
          <span className="letter-where">
            <strong>{intent.label}</strong>　·　{intent.prompt}
          </span>
          <div className="letter-head-actions">
            <button type="button" className="letter-action" onClick={onClose}>
              返回地图
            </button>
          </div>
        </header>
        <article className="letter-paper">
          <div className="letter-body">
            {candidates.map(({ candidate, figure: candidateFigure }) => {
              const event = getEnrichedEvent(candidate.eventId);
              return (
                <p key={candidate.id} style={{ animationDelay: '0.4s' }}>
                  <strong>{candidateFigure?.eraLabel}</strong>
                  {event ? `　${formatYear(event.year)} 年` : ''}
                  <br />
                  {candidateFigure?.bio}
                </p>
              );
            })}
          </div>
        </article>
        <aside className="letter-aside" />
      </div>
    );
  }

  const letter = prose[spec.id];
  const causalPath = spec.causalPath
    .map((id) => getEnrichedEvent(id))
    .filter((event): event is WorldEvent => event !== null);
  const attachment = objects[spec.id] ?? (firstSpec ? objects[firstSpec.id] : undefined);

  return (
    <div className={`letter-overlay${settled ? ' settled' : ''}`} role="dialog" aria-label="来信">
      <header className="letter-head">
        <span className="letter-where">
          <strong>{figure.eraLabel}</strong>　·　{formatYear(anchorEvent.year)} 年
        </span>
        <div className="letter-head-actions">
          <button type="button" className="letter-action" onClick={onClose}>
            返回地图
          </button>
        </div>
      </header>

      <article className="letter-paper">
        <p className="letter-figure">
          {figure.name}
          {figure.nameEn ? `　${figure.nameEn}` : ''}
          <span className="letter-kind">{KIND_LABEL[figure.kind]}</span>
        </p>

        {letter?.salutation ? (
          <>
            <p className="letter-salutation">{letter.salutation}</p>
            <div className="letter-body">
              {(letter.body ?? []).map((paragraph, index) => (
                <p key={index} style={{ animationDelay: `${1.1 + index * 0.28}s` }}>
                  {paragraph}
                </p>
              ))}
            </div>
            <p className="letter-closing">{letter.closing ?? figure.name}</p>
          </>
        ) : (
          <div className="letter-body">
            <p style={{ animationDelay: '1.1s' }}>{figure.bio}</p>
            <p style={{ animationDelay: '1.4s', color: 'var(--ink-soft)', fontSize: '14px' }}>
              这封信尚未生成。运行 <code>npm run generate:letters</code> 后即可展开全文。
            </p>
          </div>
        )}

        <section className="letter-source">
          <h4>本信基于以下已记录史实</h4>
          <ul>
            <li>
              {formatYear(anchorEvent.year)} · {anchorEvent.title}
            </li>
            {anchorEvent.cause && <li>起因：{anchorEvent.cause}</li>}
            {figure.grounding.map((source) => (
              <li key={source}>{source}</li>
            ))}
          </ul>
        </section>
      </article>

      <aside className="letter-aside">
        {attachment ? (
          <>
            <div className="letter-object">
              <ObjectViewer src={attachment.src} alt={attachment.label} />
            </div>
            <p className="letter-object-caption">{attachment.label}</p>
          </>
        ) : (
          <p className="letter-object-caption">{figure.bio}</p>
        )}
      </aside>

      {causalPath.length > 1 && (
        <nav className="letter-causal" aria-label="从那一刻到今天">
          <span className="letter-causal-label">从那一刻到今天</span>
          {causalPath.map((event, index) => (
            <span key={event.id} style={{ display: 'contents' }}>
              {index > 0 && <span className="letter-arrow">→</span>}
              <button
                type="button"
                className={`letter-hop ${focusedEventId === event.id ? 'active' : ''}`}
                onClick={() => onFocusEvent(focusedEventId === event.id ? null : event.id)}
                title={event.title}
              >
                <span className="letter-hop-year">
                  {event.year < 0 ? `前${-event.year}` : event.year}
                </span>
                {event.title}
              </button>
            </span>
          ))}
        </nav>
      )}
    </div>
  );
}

function availableIntents(): LetterIntent[] {
  return letterIntents.filter((intent) => getLetterSpecsForIntent(intent.id).length > 0);
}
