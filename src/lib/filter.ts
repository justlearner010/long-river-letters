import type { Region, WorldEvent } from '../types';
import type { CategoryFilter } from '../state/appReducer';

export function filterEvents(
  events: WorldEvent[],
  category: CategoryFilter,
  region: Region | 'all',
  search: string,
): WorldEvent[] {
  const query = search.trim().toLowerCase();
  return events.filter((event) => {
    if (category !== 'all' && event.category !== category) return false;
    if (region !== 'all' && !event.regions.includes(region)) return false;
    if (!query) return true;
    return [event.title, event.summary, event.id].join(' ').toLowerCase().includes(query);
  });
}
