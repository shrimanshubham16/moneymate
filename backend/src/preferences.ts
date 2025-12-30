// User preferences for billing cycle and payment tracking

import * as db from "./supabase-db";
import type { UserPreferences } from "./supabase-db";

export type { UserPreferences };

export async function getUserPreferences(userId: string): Promise<UserPreferences> {
  return await db.getUserPreferences(userId);
}

export async function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'userId'>>
): Promise<UserPreferences> {
  return await db.updateUserPreferences(userId, updates);
}

export function clearPreferences(): void {
  // No-op: Preferences are stored in Supabase, no need to clear
}

// Helper to get billing period for a specific date based on user's month start day
export function getBillingPeriod(date: Date, monthStartDay: number): { start: Date; end: Date } {
  const currentDay = date.getDate();
  
  let startDate: Date;
  let endDate: Date;
  
  if (currentDay >= monthStartDay) {
    // We're in the current period
    startDate = new Date(date.getFullYear(), date.getMonth(), monthStartDay);
    endDate = new Date(date.getFullYear(), date.getMonth() + 1, monthStartDay - 1);
  } else {
    // We're still in the previous period
    startDate = new Date(date.getFullYear(), date.getMonth() - 1, monthStartDay);
    endDate = new Date(date.getFullYear(), date.getMonth(), monthStartDay - 1);
  }
  
  return { start: startDate, end: endDate };
}

// Helper to get the current billing period based on user's month start day
export function getCurrentBillingPeriod(monthStartDay: number): { start: Date; end: Date } {
  return getBillingPeriod(new Date(), monthStartDay);
}

// Get billing period ID (YYYY-MM format, but adjusted for user's cycle)
export function getBillingPeriodId(monthStartDay: number, date?: Date): string {
  const targetDate = date || new Date();
  const currentDay = targetDate.getDate();
  
  let year = targetDate.getFullYear();
  let month = targetDate.getMonth() + 1; // 1-based
  
  if (currentDay < monthStartDay && monthStartDay > 1) {
    // We're in the previous period
    month -= 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
  }
  
  return `${year}-${String(month).padStart(2, '0')}`;
}

