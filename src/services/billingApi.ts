/**
 * Billing API Service
 * 
 * Handles all billing-related API calls including:
 * - Token purchases
 * - Invoice management
 * - Usage tracking
 * - Stripe integration
 */

import { ENV } from '@/config/env';

const API_URL = ENV.API_URL || '';

function getAuthToken(): string | null {
  return localStorage.getItem('auth_token');
}

// ===== Types =====

export interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  currency: string;
  description?: string;
  popular?: boolean;
}

export interface TokenStats {
  balance: number;
  total_purchased: number;
  total_used: number;
  plan_tokens: number;
  plan_renewal_date?: string;
}

export interface TokenTransaction {
  id: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
  event_name?: string;
}

export interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: string;
  created_at: string;
  paid_at?: string;
  pdf_url?: string;
}

export interface PaymentMethod {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  exp_month?: number;
  exp_year?: number;
  is_default: boolean;
}

export interface CurrentPlan {
  id: string;
  name: string;
  price: number;
  tokens_per_month: number;
  features: string[];
  renewal_date?: string;
  status: string;
}

export interface UsageByType {
  type: string;
  tokens_used: number;
  transaction_count: number;
}

// ===== Token APIs =====

export async function getTokenStats(): Promise<TokenStats> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/tokens/stats`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch token stats');
  return response.json();
}

export async function getTokenTransactions(limit: number = 20): Promise<TokenTransaction[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/tokens/transactions?limit=${limit}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

export async function getTokenPackages(): Promise<TokenPackage[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/tokens/packages`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch packages');
  return response.json();
}

export async function purchaseTokens(packageId: string): Promise<{ checkout_url: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/checkout`, {
    method: 'POST',
    headers: { 
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ package_id: packageId, type: 'tokens' })
  });
  
  if (!response.ok) throw new Error('Failed to create checkout');
  return response.json();
}

// ===== Billing APIs =====

export async function getInvoices(): Promise<Invoice[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/invoices`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch invoices');
  return response.json();
}

export async function getPaymentMethods(): Promise<PaymentMethod[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/payment-methods`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch payment methods');
  return response.json();
}

export async function getCurrentPlan(): Promise<CurrentPlan> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/current-plan`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch current plan');
  return response.json();
}

export async function createCustomerPortalSession(): Promise<{ url: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/customer-portal`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to create portal session');
  return response.json();
}

export async function addPaymentMethod(): Promise<{ client_secret: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/setup-intent`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to create setup intent');
  return response.json();
}

export async function deletePaymentMethod(paymentMethodId: string): Promise<void> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/payment-methods/${paymentMethodId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to delete payment method');
}

// ===== Analytics APIs =====

export async function getUsageByType(days: number = 30): Promise<UsageByType[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/analytics/tokens/usage?days=${days}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to fetch usage data');
  return response.json();
}

export async function getUsageByEvent(days: number = 30): Promise<any[]> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/tokens/usage-by-event?days=${days}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) return [];
  return response.json();
}

// ===== Stripe Connect (for Masters plan) =====

export async function getStripeConnectStatus(): Promise<{ connected: boolean; account_id?: string; dashboard_url?: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/stripe-connect/status`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) return { connected: false };
  return response.json();
}

export async function createStripeConnectOnboarding(): Promise<{ url: string }> {
  const token = getAuthToken();
  const response = await fetch(`${API_URL}/api/billing/stripe-connect/onboarding`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) throw new Error('Failed to create onboarding link');
  return response.json();
}

