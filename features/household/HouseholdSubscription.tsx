import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import type { PurchasesPackage } from 'react-native-purchases';
import { Action, Panel, ScreenHeading, SyncStatus, usePlanningStyles } from '../../components/ui/PlanningUI';
import { billingAvailable, billingLinks, getBillingPackages, getHouseholdBillingStatus, purchaseHouseholdPlan, reconcileBilling, restoreHouseholdPlan } from '../../lib/billing';
import { currentHouseholdContextKey, useHouseholdContext } from '../../hooks/use-household-context';
import { useSharedData } from '../planning/use-shared-data';

const tables = ['household_entitlements'];
export default function HouseholdSubscription() {
  const s = usePlanningStyles();
  const context = useHouseholdContext();
  const router = useRouter();
  const adult = context.role === 'owner' || context.role === 'parent';
  const load = useCallback((id: string) => getHouseholdBillingStatus(id), []);
  const shared = useSharedData(tables, load);
  const [offers, setOffers] = useState<PurchasesPackage[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  useEffect(() => {
    let active = true;
    if (adult && context.userId && billingAvailable) getBillingPackages(context.userId).then(result => {
      if (active && context.key === currentHouseholdContextKey()) setOffers(result);
    }).catch(() => { if (active) setError('Store plans could not be loaded. Try reopening this screen.'); });
    return () => { active = false; };
  }, [adult, context.key, context.userId]);
  async function run(action: () => Promise<{ active: boolean }>) {
    if (lock.current || !adult) return;
    const scope = context.key;
    lock.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const status = await action();
      if (scope !== currentHouseholdContextKey()) return;
      setNotice(status.active ? 'Household Plus is verified and active.' : 'No active subscription was verified. Your free plan remains available.');
      shared.refresh();
    } catch (reason) {
      if (scope !== currentHouseholdContextKey()) return;
      if (typeof reason === 'object' && reason !== null && 'userCancelled' in reason && reason.userCancelled) setNotice('Purchase cancelled. Your plan has not changed.');
      else setError(reason instanceof Error ? reason.message : 'Unable to complete this request. Please try again.');
    } finally { lock.current = false; if (scope === currentHouseholdContextKey()) setBusy(false); }
  }
  const canManage = adult && !!context.userId && !!context.householdId;
  const open = (url: string) => { void Linking.openURL(url).catch(() => setError('Unable to open this link. Please try from your browser or store settings.')); };
  const period = (value: string | null) => ({ P1M: 'per month', P1Y: 'per year', P1W: 'per week', P3M: 'every 3 months', P6M: 'every 6 months' }[value ?? ''] ?? `billing period ${value}`);
  return <SafeAreaView style={s.page}><ScrollView contentContainerStyle={s.content}>
    <Action label="Back to household" secondary disabled={busy} onPress={() => router.back()} />
    <ScreenHeading title="Your household plan" subtitle="Free essentials. Optional upgrades that save planning time." />
    <SyncStatus {...shared} onRefresh={shared.refresh} />
    {!!error && <Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    {!!notice && <Text accessibilityLiveRegion="polite" style={s.text}>{notice}</Text>}
    <Panel><Text style={s.heading}>{shared.data ? shared.data.active ? 'Household Plus · Active' : 'HomeHuddle Free' : 'Checking your plan…'}</Text>
      <Text style={s.text}>Chores, daily and weekly routines, shopping, dinner planning, rewards, and data export remain available on Free.</Text>
      {shared.data?.expiresAt && <Text style={s.muted}>Verified access until {new Date(shared.data.expiresAt).toLocaleDateString()}.</Text>}
    </Panel>
    {adult && <Panel><Text style={s.heading}>Household Plus</Text><Text style={s.text}>Custom routine intervals and automatic rotating assignments. One adult’s subscription covers the household.</Text>
      {!billingAvailable && <Text style={s.muted}>Subscriptions are not enabled in this build. No purchase is available and you will not be charged.</Text>}
      {billingAvailable && !offers.length && <Text style={s.muted}>No store plans are currently available.</Text>}
      {billingAvailable && shared.data?.hasSponsor && !shared.data.isSponsor && <Text style={s.muted}>Another adult sponsors this household. They manage the subscription from their account.</Text>}
      {billingAvailable && !shared.data?.active && (!shared.data?.hasSponsor || shared.data.isSponsor) && offers.map(offer => <Panel key={offer.identifier}>
        <Text style={s.heading}>{offer.product.title}</Text><Text style={s.text}>{offer.product.priceString} {period(offer.product.subscriptionPeriod)}</Text>
        <Action label={`Continue with ${offer.product.priceString} ${period(offer.product.subscriptionPeriod)}`} busy={busy} disabled={!canManage || !shared.data} onPress={() => { void run(() => purchaseHouseholdPlan(context.userId!, context.householdId!, offer)); }} />
      </Panel>)}
      <Text style={s.muted}>Subscriptions renew automatically unless cancelled through your store. The store confirms price, billing period, any trial, and renewal terms before you pay. Deleting HomeHuddle does not cancel a subscription.</Text>
      {billingAvailable && <Action label="Restore purchases" secondary busy={busy} disabled={!canManage} onPress={() => { void run(() => restoreHouseholdPlan(context.userId!, context.householdId!)); }} />}
      {billingAvailable && <Action label="Refresh subscription status" secondary busy={busy} disabled={!canManage} onPress={() => { void run(() => reconcileBilling(context.userId!, context.householdId!)); }} />}
      {Platform.OS !== 'web' && <Action label="Manage store subscriptions" secondary disabled={busy} onPress={() => open(Platform.OS === 'ios' ? 'https://apps.apple.com/account/subscriptions' : 'https://play.google.com/store/account/subscriptions')} />}
      {billingLinks.terms && <Action label="Subscription terms" secondary onPress={() => open(billingLinks.terms!)} />}
      {billingLinks.privacy && <Action label="Privacy policy" secondary onPress={() => open(billingLinks.privacy!)} />}
    </Panel>}
  </ScrollView></SafeAreaView>;
}
