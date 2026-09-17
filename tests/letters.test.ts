import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, expect } from 'vitest';
import { events } from '../src/data/events';
import { causalLinks } from '../src/data/causalLinks';
import { figures } from '../src/data/figures';
import { letterIntents, letterSpecs, type Letter } from '../src/data/letters';
import { MODEL_MANIFEST } from '../src/data/model-manifest';
import { enrichedEvents } from '../src/lib/enrichEvents';
import { buildFactPack } from '../scripts/generate-letters';

const GENERATED_PATH = resolve(dirname(fileURLToPath(import.meta.url)), '../src/data/letters.generated.json');
const hasGenerated = existsSync(GENERATED_PATH);
const generated: Letter[] = hasGenerated
  ? (JSON.parse(readFileSync(GENERATED_PATH, 'utf8')) as Letter[])
  : [];

const eventIds = new Set(events.map((event) => event.id));
const figureIds = new Set(figures.map((figure) => figure.id));
const intentIds = new Set(letterIntents.map((intent) => intent.id));

function isAdjacent(fromEventId: string, toEventId: string): boolean {
  if (causalLinks.some((link) => link.fromEventId === fromEventId && link.toEventId === toEventId)) {
    return true;
  }
  const from = enrichedEvents.find((event) => event.id === fromEventId);
  const to = enrichedEvents.find((event) => event.id === toEventId);
  return Boolean(
    from?.downstream?.some((link) => link.toEventId === toEventId) ||
      to?.upstream?.some((link) => link.fromEventId === fromEventId),
  );
}

describe('letter figures', () => {
  it('every figure anchors on a real event', () => {
    const bad = figures.filter((figure) => !eventIds.has(figure.anchorEventId));
    expect(bad).toEqual([]);
  });

  it('every archetypal figure names the sources it is reconstructed from', () => {
    const bad = figures.filter(
      (figure) => figure.kind === 'archetypal' && figure.grounding.filter((source) => source.trim()).length === 0,
    );
    expect(bad).toEqual([]);
  });

  it('no figure id is duplicated', () => {
    expect(new Set(figures.map((figure) => figure.id)).size).toBe(figures.length);
  });

  it('every figure period-object points at a model in the manifest', () => {
    const manifestFiles = new Set(MODEL_MANIFEST.map((entry) => entry.file));
    const bad = figures
      .filter((figure) => figure.objectSrc)
      .filter((figure) => {
        const file = figure.objectSrc!.replace('/models/', '');
        return !manifestFiles.has(file) || !figure.objectLabel?.trim();
      })
      .map((figure) => figure.id);
    expect(bad).toEqual([]);
  });
});

describe('letter intents', () => {
  it('defines the four anxieties', () => {
    expect(letterIntents.map((intent) => intent.label)).toEqual(['战争', '瘟疫', '贸易封锁', '技术冲击']);
  });

  it('every intent anchor is a real event', () => {
    const bad = letterIntents.flatMap((intent) =>
      intent.anchorEventIds.filter((eventId) => !eventIds.has(eventId)).map((eventId) => `${intent.id}: ${eventId}`),
    );
    expect(bad).toEqual([]);
  });

  it('every intent has at least one anchor event', () => {
    const bad = letterIntents.filter((intent) => intent.anchorEventIds.length === 0);
    expect(bad).toEqual([]);
  });

  it('every letter spec resolves to a real intent, figure matching its anchor, and real causal path', () => {
    const bad: string[] = [];
    for (const spec of letterSpecs) {
      if (!intentIds.has(spec.intentId)) bad.push(`${spec.id}: intentId ${spec.intentId}`);
      const figure = figures.find((item) => item.id === spec.figureId);
      if (!figure) {
        bad.push(`${spec.id}: figureId ${spec.figureId}`);
        continue;
      }
      if (!eventIds.has(spec.eventId)) bad.push(`${spec.id}: eventId ${spec.eventId}`);
      if (figure.anchorEventId !== spec.eventId) {
        bad.push(`${spec.id}: figure ${figure.id} anchored on ${figure.anchorEventId}, not ${spec.eventId}`);
      }
      if (!spec.causalPath.includes(spec.eventId)) {
        bad.push(`${spec.id}: causalPath does not start from its own event`);
      }
      for (const eventId of spec.causalPath) {
        if (!eventIds.has(eventId)) bad.push(`${spec.id}: causalPath ${eventId}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('every intent has at least two letters', () => {
    const thin = letterIntents
      .map((intent) => ({ id: intent.id, count: letterSpecs.filter((spec) => spec.intentId === intent.id).length }))
      .filter((entry) => entry.count < 2);
    expect(thin).toEqual([]);
  });

  it('every letter gets a non-empty fact pack carrying its anchor event', () => {
    const bad: string[] = [];
    for (const spec of letterSpecs) {
      const factPack = buildFactPack(spec);
      const anchor = enrichedEvents.find((event) => event.id === spec.eventId);
      if (!factPack || !anchor) {
        bad.push(`${spec.id}: 事实包为空`);
        continue;
      }
      if (!factPack.includes(anchor.title) || !factPack.includes(anchor.summary)) {
        bad.push(`${spec.id}: 事实包缺少锚点事件正文`);
      }
    }
    expect(bad).toEqual([]);
  });
});

describe('generated letters', () => {
  if (!hasGenerated) {
    it.skip('src/data/letters.generated.json not present — run `npm run generate:letters` to produce it', () => {});
    return;
  }

  it('every letter resolves to real figures, events and intents', () => {
    const bad: string[] = [];
    for (const letter of generated) {
      if (!figureIds.has(letter.figureId)) bad.push(`${letter.id}: figureId ${letter.figureId}`);
      if (!eventIds.has(letter.eventId)) bad.push(`${letter.id}: eventId ${letter.eventId}`);
      if (!intentIds.has(letter.intentId)) bad.push(`${letter.id}: intentId ${letter.intentId}`);
      if (!letter.body.length) bad.push(`${letter.id}: empty body`);
    }
    expect(bad).toEqual([]);
  });

  it('every adjacent pair in a causal path is connected in the causal graph', () => {
    const bad: string[] = [];
    for (const letter of generated) {
      for (const eventId of letter.causalPath) {
        if (!eventIds.has(eventId)) bad.push(`${letter.id}: causalPath ${eventId}`);
      }
      for (let index = 1; index < letter.causalPath.length; index += 1) {
        const from = letter.causalPath[index - 1];
        const to = letter.causalPath[index];
        if (!isAdjacent(from, to)) bad.push(`${letter.id}: ${from} → ${to} is not causally linked`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('covers every letter spec', () => {
    const generatedIds = new Set(generated.map((letter) => letter.id));
    const missing = letterSpecs.filter((spec) => !generatedIds.has(spec.id)).map((spec) => spec.id);
    expect(missing).toEqual([]);
  });

  it('each intent has at least two generated letters', () => {
    const thin = letterIntents
      .map((intent) => ({
        id: intent.id,
        count: generated.filter((letter) => letter.intentId === intent.id).length,
      }))
      .filter((entry) => entry.count < 2);
    expect(thin).toEqual([]);
  });
});
