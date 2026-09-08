import { describe, it, expect } from 'vitest';
import { validateWorldData } from '../src/lib/validate';
import { chapters } from '../src/data/chapters';
import { slices } from '../src/data/slices';
import { events } from '../src/data/events';
import { polities } from '../src/data/polities';
import { polityRules } from '../src/data/polityRules';
import { ownerForYear } from '../src/lib/attribution';
import { eventDetails } from '../src/data/eventDetails';
import { enrichedEvents } from '../src/lib/enrichEvents';

describe('world data validation', () => {
  it('reports no structural errors', () => {
    const errors = validateWorldData(chapters, slices, events);
    expect(errors).toEqual([]);
  });

  it('every event polity reference exists', () => {
    const polityIds = new Set(polities.map((p) => p.id));
    const missing = events.flatMap((e) => e.polityIds.filter((id) => !polityIds.has(id)));
    expect(missing).toEqual([]);
  });

  it('polity rules use only registered polities', () => {
    const ids = new Set(polities.map((p) => p.id));
    const bad = polityRules.filter((r) => !ids.has(r.polityId));
    expect(bad.map((r) => r.polityId)).toEqual([]);
  });

  it('every event has cause and effect details', () => {
    const missing = events.filter((event) => {
      const detail = eventDetails[event.id];
      return !detail || !detail.cause || !detail.effect;
    });
    expect(missing.map((event) => event.id)).toEqual([]);
  });

  it('every event has at least one country association', () => {
    const missing = enrichedEvents.filter((event) => event.polityIds.length === 0);
    expect(missing.map((event) => event.id)).toEqual([]);
  });

  it('major events carry a duration range', () => {
    const multiYear = ['e102', 'e131', 'e170', 'e188', 'e197'];
    const missing = multiYear.filter((id) => {
      const event = enrichedEvents.find((item) => item.id === id);
      return !event || event.startYear === undefined;
    });
    expect(missing).toEqual([]);
  });

  it('every event polity can be highlighted on the map', () => {
    const ruled = new Set(polityRules.map((rule) => rule.polityId));
    const missing = enrichedEvents.flatMap((event) =>
      event.polityIds.filter((polityId) => !ruled.has(polityId)).map((polityId) => `${event.id}: ${polityId}`),
    );
    expect(missing).toEqual([]);
  });

  it('event duration ranges stay inside their chapter', () => {
    const bad = enrichedEvents
      .filter((event) => event.startYear !== undefined)
      .filter((event) => {
        const chapter = chapters.find((item) => item.id === event.chapterId);
        if (!chapter) return true;
        return event.startYear! < chapter.startYear || event.endYear! > chapter.endYear;
      })
      .map((event) => `${event.id}: ${event.startYear}–${event.endYear}`);
    expect(bad).toEqual([]);
  });

  it('attributes China to the right polity in key years', () => {
    expect(ownerForYear(polityRules, 1360, 'China')).toBe('yuan');
    expect(ownerForYear(polityRules, 1600, 'China')).toBe('ming');
    expect(ownerForYear(polityRules, 1900, 'China')).toBe('qing');
    expect(ownerForYear(polityRules, 1990, 'China')).toBe('china-prc');
  });
});
