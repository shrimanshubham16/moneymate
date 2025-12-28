import { addVariableActual, getConstraint, getStore, setConstraint } from "./store";
import { tierFor } from "./logic";

type Alert = { id: string; type: string; severity: "info" | "warn" | "critical"; message: string; period: string };

const alerts: Alert[] = [];

export function listAlerts() {
  return alerts;
}

export function addOverspendAlert(planName: string, overAmount: number, tier: string, period: string) {
  const severity: Alert["severity"] = tier === "red" || overAmount > 0.2 ? "critical" : "warn";
  alerts.push({
    id: `al-${alerts.length + 1}`,
    type: "overspend",
    severity,
    message: `Overspend on ${planName}`,
    period
  });
}

export function recordOverspend(planName: string, projected: number, planned: number, period: string) {
  if (projected <= planned) return;
  const overPct = (projected - planned) / planned;
  addOverspendAlert(planName, overPct, getConstraint().tier, period);
  const constraint = getConstraint();
  const nextScore = constraint.score + 5;
  setConstraint({ ...constraint, score: nextScore, tier: tierFor(nextScore), recentOverspends: constraint.recentOverspends + 1 });
}

export function clearAlerts() {
  alerts.splice(0, alerts.length);
}

