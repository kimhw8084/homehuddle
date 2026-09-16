import { Platform } from 'react-native';
import Purchases, { CustomerInfo } from 'react-native-purchases';

export const PRO_ENTITLEMENT = 'homehuddle_pro';

const apiKey = Platform.select({
  ios: process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY,
  android: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY,
});

export function configureBilling(appUserId: string) {
  if (!apiKey) return false;
  Purchases.configure({ apiKey, appUserID: appUserId });
  return true;
}

export function hasProEntitlement(customerInfo: CustomerInfo) {
  return Boolean(customerInfo.entitlements.active[PRO_ENTITLEMENT]);
}

export async function getBillingState() {
  if (!apiKey) return { configured: false, isPro: false, expiresAt: null as string | null };
  const customerInfo = await Purchases.getCustomerInfo();
  const entitlement = customerInfo.entitlements.active[PRO_ENTITLEMENT];
  return {
    configured: true,
    isPro: Boolean(entitlement),
    expiresAt: entitlement?.expirationDate ?? null,
  };
}

export async function restorePurchases() {
  const customerInfo = await Purchases.restorePurchases();
  return hasProEntitlement(customerInfo);
}
