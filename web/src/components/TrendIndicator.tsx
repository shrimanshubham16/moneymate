import "./TrendIndicator.css";

interface TrendIndicatorProps {
  value: number;
  comparison?: number;
  format?: "currency" | "percentage" | "number";
  size?: "small" | "medium" | "large";
}

export function TrendIndicator({ 
  value, 
  comparison, 
  format = "currency",
  size = "medium"
}: TrendIndicatorProps) {
  if (comparison === undefined) {
    return <span className={`trend-value ${size}`}>{formatValue(value, format)}</span>;
  }

  const change = value - comparison;
  const percentChange = comparison !== 0 ? (change / Math.abs(comparison)) * 100 : 0;
  const isPositive = change > 0;
  const isNeutral = Math.abs(percentChange) < 1;

  const trendClass = isNeutral ? "neutral" : isPositive ? "up" : "down";
  const arrow = isNeutral ? "→" : isPositive ? "↑" : "↓";

  return (
    <div className={`trend-indicator ${size}`}>
      <span className="trend-value">{formatValue(value, format)}</span>
      <span className={`trend-change ${trendClass}`}>
        <span className="trend-arrow">{arrow}</span>
        {Math.abs(percentChange).toFixed(1)}%
      </span>
    </div>
  );
}

function formatValue(value: number, format: "currency" | "percentage" | "number"): string {
  switch (format) {
    case "currency":
      return `₹${value.toLocaleString("en-IN")}`;
    case "percentage":
      return `${value.toFixed(1)}%`;
    case "number":
      return value.toLocaleString("en-IN");
    default:
      return String(value);
  }
}

