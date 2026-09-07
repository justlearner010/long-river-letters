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
      {polity?.nameEn && <p className="drawer-sub">{polity.nameEn} · {polity.type}</p>}
      {event && <p className="drawer-sub">{event.year} · {event.regions.join(' / ')}</p>}
      <p className="drawer-summary">{summary}</p>
    </aside>
  );
}
