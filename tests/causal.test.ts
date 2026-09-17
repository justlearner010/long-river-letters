import { describe, it, expect } from 'vitest';
import { causalLinks, buildCausalIndex } from '../src/data/causalLinks';
import { events } from '../src/data/events';
import { enrichedEvents } from '../src/lib/enrichEvents';

describe('causal chain data', () => {
  it('every causal link points to real events', () => {
    const eventIds = new Set(events.map((e) => e.id));
    const bad = causalLinks.filter(
      (link) => !eventIds.has(link.fromEventId) || !eventIds.has(link.toEventId),
    );
    expect(bad).toEqual([]);
  });

  it('causal graph has no cycles', () => {
    const { downstream } = buildCausalIndex(events, causalLinks);
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function visit(id: string): boolean {
      if (recursionStack.has(id)) return true;
      if (visited.has(id)) return false;
      visited.add(id);
      recursionStack.add(id);
      for (const link of downstream.get(id) ?? []) {
        if (visit(link.toEventId)) return true;
      }
      recursionStack.delete(id);
      return false;
    }

    for (const event of events) {
      if (visit(event.id)) {
        throw new Error(`Cycle detected involving ${event.id}`);
      }
    }
  });

  it('enriches events with upstream and downstream arrays', () => {
    const linked = enrichedEvents.filter((e) => (e.upstream?.length ?? 0) > 0 || (e.downstream?.length ?? 0) > 0);
    expect(linked.length).toBeGreaterThanOrEqual(15);
  });
});

