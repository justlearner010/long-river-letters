import { useEffect } from 'react';
import type { Polity, WorldEvent } from '../types';

interface InfoDrawerProps {
  open: boolean;
  polity: Polity | null;
  event: WorldEvent | null;
  onClose: () => void;
}

export default function InfoDrawer({ open, polity, event, onClose }: InfoDrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (keyEvent: KeyboardEvent) => {
      if (keyEvent.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  const title = event?.title ?? polity?.nameZh ?? '';
  const summary = event?.summary ?? polity?.summary ?? '';
  return (
    <aside className="info-drawer" role="dialog" aria-label="详情">
      <button type="button" className="drawer-close" onClick={onClose} aria-label="关闭">×</button>
      <h2 tabIndex={0}>{title}</h2>
      {polity?.nameEn && (
        <p className="drawer-sub">
          {polity.nameEn} · {polity.type}
          {polity.startYear !== undefined && ` · ${polity.startYear}–${polity.endYear ?? '今'}`}
        </p>
      )}
      {event && (
        <p className="drawer-sub">
          {event.year} · {event.regions.join(' / ')}
          {event.startYear !== undefined && ` · 持续 ${event.startYear}–${event.endYear ?? event.year}`}
        </p>
      )}
      <p className="drawer-summary">{summary}</p>
      {event?.cause && (
        <section className="drawer-section">
          <h3>前因</h3>
          <p>{event.cause}</p>
        </section>
      )}
      {event?.effect && (
        <section className="drawer-section">
          <h3>后果与影响</h3>
          <p>{event.effect}</p>
        </section>
      )}
      {event?.globalImpact && (
        <section className="drawer-section">
          <h3>全球格局</h3>
          <p>{event.globalImpact}</p>
        </section>
      )}
      {event?.territoryChange && (
        <section className="drawer-section">
          <h3>领土变化</h3>
          <p>{event.territoryChange}</p>
        </section>
      )}
      {event?.regimeChange && (
        <section className="drawer-section">
          <h3>政权变化</h3>
          <p>{event.regimeChange}</p>
        </section>
      )}
    </aside>
  );
}
