import { Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';
import { supabase } from './supabase';
import { useAuthStore } from '../store/authStore';

export const PRO_ENTITLEMENT = 'homehuddle_pro';
const apiKey = Platform.select({ ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY, android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY });
const secureURL = (value?: string) => value?.startsWith('https://') ? value : undefined;
export const billingLinks = { terms: secureURL(process.env.EXPO_PUBLIC_TERMS_URL), privacy: secureURL(process.env.EXPO_PUBLIC_PRIVACY_URL) };
export const billingAvailable = Boolean(process.env.EXPO_PUBLIC_BILLING_ENABLED === 'true' && apiKey && billingLinks.terms && billingLinks.privacy && Platform.OS !== 'web');
export type BillingStatus = { active: boolean; expiresAt: string | null; isSponsor: boolean; hasSponsor: boolean };
let configuredUser: string | null = null;
let serial: Promise<unknown> = Promise.resolve();
type PurchasesSdk = typeof import('react-native-purchases').default;
async function loadPurchases(): Promise<PurchasesSdk> {
  return (await import('react-native-purchases')).default;
}
function assertAccount(userId: string) {
  if (useAuthStore.getState().user?.id !== userId) throw new Error('Your account changed. Reopen subscription settings.');
}
// SDK identity changes and purchase sheets cannot interleave across accounts.
function withBilling<T>(userId: string, action: (purchases: PurchasesSdk) => Promise<T>): Promise<T> {
  const work = serial.catch(() => undefined).then(async () => {
    if (!billingAvailable || !apiKey) throw new Error('Subscriptions are not enabled in this build. All free features remain available.');
    assertAccount(userId);
    const purchases = await loadPurchases();
    if (!configuredUser) { purchases.configure({ apiKey, appUserID: userId }); configuredUser = userId; }
    else if (configuredUser !== userId) { await purchases.logIn(userId); configuredUser = userId; }
    assertAccount(userId);
    return action(purchases);
  });
  serial = work;
  return work;
}
export async function getHouseholdBillingStatus(householdId: string): Promise<BillingStatus> {
  const { data, error } = await supabase.rpc('get_household_billing_status', { target_household: householdId });
  if (error) throw new Error(error.message);
  return data;
}
export function getBillingPackages(userId: string) {
  return withBilling(userId, async purchases => (await purchases.getOfferings()).current?.availablePackages.filter(item => Boolean(item.product.subscriptionPeriod)) ?? []);
}
export async function reconcileBilling(userId: string, householdId: string) {
  assertAccount(userId);
  const { error } = await supabase.functions.invoke('billing-reconcile', { body: {} });
  if (error) throw new Error('Unable to verify with the store. Wait 10 seconds and refresh status. If you just paid, do not purchase again.');
  assertAccount(userId);
  return getHouseholdBillingStatus(householdId);
}
async function claim(householdId: string) {
  const { error } = await supabase.rpc('claim_household_billing', { target_household: householdId });
  if (error) throw new Error(error.message);
}
export function purchaseHouseholdPlan(userId: string, householdId: string, offer: PurchasesPackage) {
  return withBilling(userId, async purchases => {
    await claim(householdId); assertAccount(userId);
    await purchases.purchasePackage(offer);
    return reconcileBilling(userId, householdId);
  });
}
export function restoreHouseholdPlan(userId: string, householdId: string) {
  return withBilling(userId, async purchases => {
    await claim(householdId); assertAccount(userId);
    await purchases.restorePurchases();
    return reconcileBilling(userId, householdId);
  });
}
