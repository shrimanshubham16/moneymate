/**
 * Shared View Hook - Centralized sharing state management
 * 
 * This hook provides:
 * - Current user ID extraction from token
 * - Selected view state (me, merged, or specific userId)
 * - Helper functions for owner attribution and edit permissions
 * - Handles E2E encryption gracefully (shows [Private] for unreadable shared data)
 */

import { useMemo, useState, useEffect } from 'react';
import { useEncryptedApiCalls } from './useEncryptedApiCalls';

// Helper to extract user ID from JWT token
function getUserIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.sub || payload.user_id || null;
  } catch {
    return null;
  }
}

interface SharedMember {
  userId: string;
  username: string;
  email?: string;
  role?: string;
}

interface UseSharedViewResult {
  currentUserId: string | null;
  selectedView: string;
  isSharedView: boolean;
  sharingMembers: SharedMember[];
  getOwnerName: (itemUserId: string) => string;
  isOwnItem: (itemUserId: string) => boolean;
  canEdit: (itemUserId: string) => boolean;
  formatSharedField: (value: any, isOwn: boolean) => string;
  getViewParam: () => string | undefined;
  loadSharingMembers: () => Promise<void>;
}

export function useSharedView(token: string): UseSharedViewResult {
  const api = useEncryptedApiCalls();
  const [sharingMembers, setSharingMembers] = useState<SharedMember[]>([]);

  // Get current user ID
  const currentUserId = useMemo(() => getUserIdFromToken(token), [token]);
  
  // Get selected view from localStorage
  const selectedView = localStorage.getItem('finflow_selected_view') || 'me';
  const isSharedView = selectedView !== 'me';

  // Load sharing members on mount if in shared view
  useEffect(() => {
    if (isSharedView && token) {
      loadSharingMembers();
    }
  }, [isSharedView, token]);

  const loadSharingMembers = async () => {
    try {
      const res = await api.fetchSharingMembers(token);
      setSharingMembers(res.data?.members || []);
    } catch (e) {
      console.error("Failed to load sharing members:", e);
    }
  };

  // Get owner name for display
  const getOwnerName = (itemUserId: string): string => {
    if (!itemUserId) return "Unknown";
    if (itemUserId === currentUserId) return "You";
    const member = sharingMembers.find((m) => m.userId === itemUserId);
    return member?.username || "Shared User";
  };

  // Check if current user owns this item
  const isOwnItem = (itemUserId: string): boolean => {
    return itemUserId === currentUserId;
  };

  // Check if user can edit this item
  const canEdit = (itemUserId: string): boolean => {
    return isOwnItem(itemUserId);
  };

  // Format a field value - shows [Private] for encrypted/error fields from shared users
  const formatSharedField = (value: any, isOwn: boolean): string => {
    if (isOwn) {
      // Own data - show as-is (should be decrypted)
      if (value === '[decrypt error]' || value === '[encrypted]') {
        return value; // Show error for debugging own data issues
      }
      return String(value ?? '');
    } else {
      // Shared user data - show [Private] for encrypted/error fields
      if (value === '[decrypt error]' || value === '[encrypted]' || value === null || value === undefined) {
        return '[Private]';
      }
      // If it looks like encrypted gibberish, also hide it
      if (typeof value === 'string' && value.includes('=') && value.length > 20) {
        return '[Private]';
      }
      return String(value);
    }
  };

  // Get view parameter for API calls
  const getViewParam = (): string | undefined => {
    if (selectedView === 'me') return undefined;
    return selectedView;
  };

  return {
    currentUserId,
    selectedView,
    isSharedView,
    sharingMembers,
    getOwnerName,
    isOwnItem,
    canEdit,
    formatSharedField,
    getViewParam,
    loadSharingMembers
  };
}

