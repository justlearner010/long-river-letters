import { events } from '../data/events';
import { eventDetails } from '../data/eventDetails';
import { eventDurations } from '../data/eventDurations';
import type { WorldEvent } from '../types';

export const enrichedEvents: WorldEvent[] = events.map((event) => ({
  ...event,
  ...eventDetails[event.id],
  ...eventDurations[event.id],
}));

export function getEnrichedEvent(eventId: string): WorldEvent | null {
  return enrichedEvents.find((event) => event.id === eventId) ?? null;
}
