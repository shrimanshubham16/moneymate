import "./SkeletonLoader.css";

interface SkeletonLoaderProps {
  type: "card" | "text" | "circle" | "widget" | "list";
  count?: number;
}

export function SkeletonLoader({ type, count = 1 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (type) {
    case "widget":
      return (
        <div className="skeleton-widgets-grid">
          {items.map((i) => (
            <div key={i} className="skeleton-widget">
              <div className="skeleton-widget-header">
                <div className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} />
                <div className="skeleton-widget-info">
                  <div className="skeleton skeleton-text" style={{ width: 120, height: 16 }} />
                  <div className="skeleton skeleton-text" style={{ width: 80, height: 24 }} />
                </div>
              </div>
              <div className="skeleton skeleton-text" style={{ width: '100%', height: 12, marginTop: 16 }} />
            </div>
          ))}
        </div>
      );

    case "card":
      return (
        <div className="skeleton-cards">
          {items.map((i) => (
            <div key={i} className="skeleton-card">
              <div className="skeleton skeleton-text" style={{ width: '60%', height: 20 }} />
              <div className="skeleton skeleton-text" style={{ width: '100%', height: 16, marginTop: 12 }} />
              <div className="skeleton skeleton-text" style={{ width: '80%', height: 16 }} />
            </div>
          ))}
        </div>
      );

    case "list":
      return (
        <div className="skeleton-list">
          {items.map((i) => (
            <div key={i} className="skeleton-list-item">
              <div className="skeleton skeleton-circle" style={{ width: 40, height: 40 }} />
              <div className="skeleton-list-content">
                <div className="skeleton skeleton-text" style={{ width: 150, height: 16 }} />
                <div className="skeleton skeleton-text" style={{ width: 100, height: 14, marginTop: 4 }} />
              </div>
              <div className="skeleton skeleton-text" style={{ width: 80, height: 18 }} />
            </div>
          ))}
        </div>
      );

    case "text":
      return (
        <div>
          {items.map((i) => (
            <div key={i} className="skeleton skeleton-text" style={{ marginBottom: 8 }} />
          ))}
        </div>
      );

    case "circle":
      return (
        <div style={{ display: 'flex', gap: 12 }}>
          {items.map((i) => (
            <div key={i} className="skeleton skeleton-circle" style={{ width: 48, height: 48 }} />
          ))}
        </div>
      );

    default:
      return null;
  }
}

