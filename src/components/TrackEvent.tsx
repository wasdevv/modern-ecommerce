'use client';

import { useEffect } from 'react';
import { track, type TrackItem } from '@/lib/tracking';

// Fires one event when the page mounts (e.g. view_item on a product page).
export default function TrackEvent({ event, items, value }: { event: string; items: TrackItem[]; value?: number }) {
  useEffect(() => {
    track(event, { items, value });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event]);
  return null;
}
