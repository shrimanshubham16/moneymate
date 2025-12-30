import * as db from "./pg-db";
import { tierFor } from "./logic";

type Alert = { id: string; type: string; severity: "info" | "warn" | "critical"; message: string; period: string };

// User-scoped alerts: userId -> Alert[]
const userAlerts = new Map<string, Alert[]>();

export function listAlerts(userId: string): Alert[] {
  return userAlerts.get(userId) || [];
}

export function addOverspendAlert(userId: string, planName: string, overAmount: number, tier: string, period: string) {
  const severity: Alert["severity"] = tier === "red" || overAmount > 0.2 ? "critical" : "warn";
  const alerts = userAlerts.get(userId) || [];
  alerts.push({
    id: `al-${userId}-${alerts.length + 1}`,
    type: "overspend",
    severity,
    message: `Overspend on ${planName}`,
    period
  });
  userAlerts.set(userId, alerts);
}

export async function recordOverspend(userId: string, planName: string, projected: number, planned: number, period: string) {
  if (projected <= planned) return;
  const overPct = (projected - planned) / planned;
  const constraint = await db.getConstraintScore(userId);
  addOverspendAlert(userId, planName, overPct, constraint.tier, period);
  const nextScore = constraint.score + 5;
  await db.updateConstraintScore(userId, { ...constraint, score: nextScore, tier: tierFor(nextScore), recentOverspends: (constraint.recentOverspends || 0) + 1 });
}

export function clearAlerts(userId: string) {
  userAlerts.delete(userId);
}

