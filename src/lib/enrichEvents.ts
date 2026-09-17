import { events } from '../data/events';
import { eventDetails } from '../data/eventDetails';
import { eventDurations } from '../data/eventDurations';
import { causalLinks, buildCausalIndex } from '../data/causalLinks';
import type { WorldEvent } from '../types';

const { upstream, downstream } = buildCausalIndex(events, causalLinks);

export const enrichedEvents: WorldEvent[] = events.map((event) => {
  const base = {
    ...event,
    ...eventDetails[event.id],
    ...eventDurations[event.id],
  };
  return {
    ...base,
    upstream: upstream.get(event.id) ?? [],
    downstream: downstream.get(event.id) ?? [],
  };
});

export function getEnrichedEvent(eventId: string): WorldEvent | null {
  return enrichedEvents.find((event) => event.id === eventId) ?? null;
}
