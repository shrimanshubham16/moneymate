// User preferences for billing cycle and payment tracking

import { getStore, scheduleSave } from "./store";

export type UserPreferences = {
  userId: string;
  monthStartDay: number; // 1-28, day of month when billing cycle starts
  currency: string;
  timezone: string;
  useProrated?: boolean; // Whether to use prorated variable expenses (default: false)
};

// Initialize preferences from store on module load
function getPreferencesFromStore(): UserPreferences[] {
  const store = getStore();
  return store.preferences || [];
}

let preferences: UserPreferences[] = getPreferencesFromStore();

export function getUserPreferences(userId: string): UserPreferences {
  // Reload from store in case it was updated elsewhere
  preferences = getPreferencesFromStore();
  
  let pref = preferences.find(p => p.userId === userId);
  if (!pref) {
    // Create default preferences
    pref = {
      userId,
      monthStartDay: 1, // Default: 1st of month
      currency: "INR",
      timezone: "Asia/Kolkata",
      useProrated: false // Disabled by default - simpler calculation
    };
    preferences.push(pref);
    
    // Persist new default preferences to store and disk
    const store = getStore();
    store.preferences = preferences;
    scheduleSave();
  }
  return pref;
}

export function updateUserPreferences(
  userId: string,
  updates: Partial<Omit<UserPreferences, 'userId'>>
): UserPreferences {
  let pref = preferences.find(p => p.userId === userId);
  
  if (!pref) {
    pref = {
      userId,
      monthStartDay: updates.monthStartDay ?? 1,
      currency: updates.currency ?? "INR",
      timezone: updates.timezone ?? "Asia/Kolkata",
      useProrated: updates.useProrated ?? false
    };
    preferences.push(pref);
  } else {
    if (updates.monthStartDay !== undefined) pref.monthStartDay = updates.monthStartDay;
    if (updates.currency !== undefined) pref.currency = updates.currency;
    if (updates.timezone !== undefined) pref.timezone = updates.timezone;
    if (updates.useProrated !== undefined) pref.useProrated = updates.useProrated;
  }
  
  // Persist preferences to store and disk
  const store = getStore();
  store.preferences = preferences;
  scheduleSave();
  
  return pref;
}

export function clearPreferences(): void {
  preferences = [];
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

