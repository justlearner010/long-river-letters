import type { WorldEvent } from '../types';

const categoryLabel: Record<WorldEvent['category'], string> = {
  war: '战争',
  treaty: '条约/体系',
  revolution: '革命/政变',
  colonization: '殖民/去殖民化',
  economy: '经济/科技',
  tech: '经济/科技',
  culture: '文化/思想',
  organization: '国际组织',
};

interface EventCardsProps {
  events: WorldEvent[];
  onSelectEvent: (eventId: string) => void;
}

export default function EventCards({ events, onSelectEvent }: EventCardsProps) {
  if (events.length === 0) {
    return <p className="empty-events">没有符合筛选的事件</p>;
  }
  return (
    <div className="event-cards" aria-label="本时代事件">
      {events.slice(0, 6).map((event) => (
        <button type="button" key={event.id} className="event-card" onClick={() => onSelectEvent(event.id)}>
          <span className="event-year">{event.year}</span>
          <span className="event-body">
            <strong>{event.title}</strong>
            <span className="event-category">{categoryLabel[event.category]}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
