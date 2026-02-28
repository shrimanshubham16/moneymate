import { useState, useEffect } from 'react';
import './OfflineIndicator.css';

export function OfflineIndicator() {
  const [online, setOnline] = useState(navigator.onLine);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  
  useEffect(() => {
    const goOnline = () => { setOnline(true); setLastSynced(new Date()); };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    setLastSynced(new Date());
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  
  if (online) return null;
  
  const timeAgo = lastSynced ? Math.round((Date.now() - lastSynced.getTime()) / 60000) : 0;
  return (
    <div className="offline-indicator">
      <span className="offline-dot" />
      You're offline {timeAgo > 0 ? `• Last synced ${timeAgo}m ago` : ''}
    </div>
  );
}
