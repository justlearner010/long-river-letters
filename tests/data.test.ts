import { describe, it, expect } from 'vitest';
import { validateWorldData } from '../src/lib/validate';
import { chapters } from '../src/data/chapters';
import { slices } from '../src/data/slices';
import { events } from '../src/data/events';
import { polities } from '../src/data/polities';
import { polityRules } from '../src/data/polityRules';
import { ownerForYear } from '../src/lib/attribution';
import { eventDetails } from '../src/data/eventDetails';

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

  it('attributes China to the right polity in key years', () => {
    expect(ownerForYear(polityRules, 1360, 'China')).toBe('yuan');
    expect(ownerForYear(polityRules, 1600, 'China')).toBe('ming');
    expect(ownerForYear(polityRules, 1900, 'China')).toBe('qing');
    expect(ownerForYear(polityRules, 1990, 'China')).toBe('china-prc');
  });
});
