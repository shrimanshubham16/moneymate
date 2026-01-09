/**
 * useEncryptedApiCalls Hook
 * 
 * Wraps all API functions with automatic encryption/decryption.
 * Uses the CryptoContext to get the encryption key.
 * 
 * Usage:
 *   const api = useEncryptedApiCalls();
 *   const dashboard = await api.fetchDashboard(token);  // Automatically decrypted
 *   await api.createIncome(token, data);  // Automatically encrypted
 */

import { useCrypto } from '../contexts/CryptoContext';
import * as baseApi from '../api';

export function useEncryptedApiCalls() {
  const { key } = useCrypto();
  
  return {
    // Dashboard
    fetchDashboard: (token: string, asOf?: string, view?: string, nocache?: boolean) => 
      baseApi.fetchDashboard(token, asOf, view, key || undefined, nocache),
    
    // Health
    fetchHealthDetails: (token: string, asOf?: string) => 
      baseApi.fetchHealthDetails(token, asOf, key || undefined),
    
    // Income
    fetchIncomes: (token: string) => 
      baseApi.fetchDashboard(token, undefined, undefined, key || undefined).then(r => r.data?.incomes || []),
    createIncome: (token: string, data: any) => 
      baseApi.createIncome(token, data, key || undefined),
    updateIncome: (token: string, id: string, data: any) => 
      baseApi.updateIncome(token, id, data, key || undefined),
    deleteIncome: (token: string, id: string) => 
      baseApi.deleteIncome(token, id),
    
    // Fixed Expenses
    createFixedExpense: (token: string, data: any) => 
      baseApi.createFixedExpense(token, data, key || undefined),
    updateFixedExpense: (token: string, id: string, data: any) => 
      baseApi.updateFixedExpense(token, id, data, key || undefined),
    deleteFixedExpense: (token: string, id: string) => 
      baseApi.deleteFixedExpense(token, id),
    
    // Variable Expense Plans
    createVariablePlan: (token: string, data: any) => 
      baseApi.createVariablePlan(token, data, key || undefined),
    updateVariableExpensePlan: (token: string, id: string, data: any) => 
      baseApi.updateVariableExpensePlan(token, id, data, key || undefined),
    deleteVariableExpensePlan: (token: string, id: string) => 
      baseApi.deleteVariableExpensePlan(token, id),
    
    // Variable Expense Actuals
    addVariableActual: (token: string, planId: string, data: any) => 
      baseApi.addVariableActual(token, planId, data, key || undefined),
    
    // Investments
    createInvestment: (token: string, data: any) => 
      baseApi.createInvestment(token, data, key || undefined),
    updateInvestment: (token: string, id: string, data: any) => 
      baseApi.updateInvestment(token, id, data, key || undefined),
    deleteInvestment: (token: string, id: string) => 
      baseApi.deleteInvestment(token, id),
    pauseInvestment: (token: string, id: string) => 
      baseApi.pauseInvestment(token, id),
    resumeInvestment: (token: string, id: string) => 
      baseApi.resumeInvestment(token, id),
    
    // Credit Cards
    fetchCreditCards: (token: string) => 
      baseApi.fetchCreditCards(token, key || undefined),
    createCreditCard: (token: string, data: any) => 
      baseApi.createCreditCard(token, data, key || undefined),
    updateCreditCard: (token: string, id: string, data: any) => 
      baseApi.updateCreditCard(token, id, data, key || undefined),
    deleteCreditCard: (token: string, id: string) => 
      baseApi.deleteCreditCard(token, id),
    updateCreditCardBill: (token: string, id: string, billAmount: number) => 
      baseApi.updateCreditCardBill(token, id, billAmount),
    resetCreditCardBilling: (token: string, id: string) => 
      baseApi.resetCreditCardBilling(token, id),
    payCreditCard: (token: string, id: string, amount: number) =>
      baseApi.payCreditCard(token, id, amount),
    getBillingAlerts: (token: string) =>
      baseApi.getBillingAlerts(token),
    getCreditCardUsage: (token: string, cardId: string) =>
      baseApi.getCreditCardUsage(token, cardId),
    
    // Loans
    fetchLoans: (token: string) => 
      baseApi.fetchLoans(token, key || undefined),
    
    // Payments
    markAsPaid: (token: string, entityType: string, id: string, amount?: number) => 
      baseApi.markAsPaid(token, entityType, id, amount),
    markAsUnpaid: (token: string, entityType: string, id: string) => 
      baseApi.markAsUnpaid(token, entityType, id),
    getPaymentStatus: (token: string, entityType: string, id: string) => 
      baseApi.getPaymentStatus(token, entityType, id),
    getPaymentsSummary: (token: string) => 
      baseApi.getPaymentsSummary(token),
    
    // User Preferences
    getUserPreferences: (token: string) => 
      baseApi.getUserPreferences(token),
    updateUserPreferences: (token: string, prefs: any) => 
      baseApi.updateUserPreferences(token, prefs),
    
    // Activities
    fetchActivity: (token: string, startDate?: string, endDate?: string) => 
      baseApi.fetchActivity(token, startDate, endDate, key || undefined),
    
    // Alerts
    fetchAlerts: (token: string) => 
      baseApi.fetchAlerts(token),
    
    // Export (with decryption)
    exportFinances: (token: string) =>
      baseApi.exportFinances(token, key || undefined),
    
    // Subcategories
    getUserSubcategories: (token: string) =>
      baseApi.getUserSubcategories(token),
    addUserSubcategory: (token: string, subcategory: string) =>
      baseApi.addUserSubcategory(token, subcategory),
    
    // Sharing
    fetchSharingRequests: (token: string) =>
      baseApi.fetchSharingRequests(token),
    fetchSharingMembers: (token: string) =>
      baseApi.fetchSharingMembers(token),
    sendInvite: (token: string, data: any) =>
      baseApi.sendInvite(token, data),
    approveRequest: (token: string, id: string) =>
      baseApi.approveRequest(token, id),
    rejectRequest: (token: string, id: string) =>
      baseApi.rejectRequest(token, id),
    
    // Theme
    fetchThemeState: (token: string) => 
      baseApi.fetchThemeState(token),
    updateThemeState: (token: string, theme: any) => 
      baseApi.updateThemeState(token, theme),
    
    // User Profile (new)
    getUserProfile: (token: string) => 
      baseApi.getUserProfile(token),
    updateUserEmail: (token: string, email: string) => 
      baseApi.updateUserEmail(token, email),
    updateUserPassword: (token: string, oldPassword: string, newPassword: string) => 
      baseApi.updateUserPassword(token, oldPassword, newPassword),
    
    // Expose encryption key status
    isEncryptionEnabled: key !== null,
  };
}

