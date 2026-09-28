export type AuthRouteTarget = '/login' | '/onboarding' | '/(app)/(tabs)';

interface AuthRouteState {
  isInitialized: boolean;
  isAuthorized: boolean;
  onboardingDone: boolean;
  segments: readonly string[];
}

export function getAuthRedirect({
  isInitialized,
  isAuthorized,
  onboardingDone,
  segments,
}: AuthRouteState): AuthRouteTarget | null {
  if (!isInitialized) return null;

  const firstSegment = segments[0];
  const inAppGroup = firstSegment === '(app)';
  const inOnboarding = firstSegment === 'onboarding';
  const onAuthRoute = segments.length === 0 || firstSegment === 'index' || firstSegment === 'login';

  if (!isAuthorized) return inAppGroup ? '/login' : null;

  if (!onboardingDone) return inOnboarding ? null : '/onboarding';

  if (inOnboarding || onAuthRoute) return '/(app)/(tabs)';

  return null;
}
