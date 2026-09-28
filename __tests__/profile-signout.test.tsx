import React from 'react';
import { Alert, Platform } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import ProfileScreen from '../app/(app)/profile';
import { useAuthStore } from '../store/authStore';

const mockSignOut = jest.fn();
let mockAuthState: { session: { id: string } | null; isDevBypass: boolean };

jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: jest.fn(),
    push: jest.fn(),
  }),
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: jest.fn(),
}));

jest.mock('../store/huddleStore', () => ({
  useHuddleStore: (selector: (state: Record<string, unknown>) => unknown) =>
    selector({
      currentUser: 'Alex',
      familyMembers: [{ name: 'Alex', role: 'Parent', avatar: '🧑' }],
      vacationMode: { active: false },
    }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Success: 'success' },
}));

describe('Profile sign out confirmation', () => {
  let originalPlatformOS: string;

  beforeEach(() => {
    originalPlatformOS = Platform.OS;
    jest.clearAllMocks();
    mockAuthState = { session: { id: 'synthetic-session' }, isDevBypass: true };
    mockSignOut.mockImplementation(() => {
      mockAuthState = { session: null, isDevBypass: false };
    });
    (useAuthStore as unknown as jest.Mock).mockImplementation((
      selector: (state: typeof mockAuthState & { signOut: jest.Mock }) => unknown
    ) =>
      selector({ ...mockAuthState, signOut: mockSignOut })
    );
  });

  afterEach(() => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: originalPlatformOS });
    jest.restoreAllMocks();
  });

  it('opens a web confirmation and lets Cancel close it without changing auth', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const authBeforeCancel = { ...mockAuthState };
    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('profile-sign-out'));
    expect(getByTestId('profile-signout-modal')).toBeTruthy();
    expect(getByTestId('profile-signout-cancel').props.accessibilityLabel).toBe('Cancel');
    expect(getByTestId('profile-signout-confirm').props.accessibilityLabel).toBe('Confirm Sign Out');

    fireEvent.press(getByTestId('profile-signout-cancel'));

    expect(queryByTestId('profile-signout-modal')).toBeNull();
    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockAuthState).toEqual(authBeforeCancel);
  });

  it('calls signOut once after explicit web confirmation', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'web' });
    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('profile-sign-out'));
    fireEvent.press(getByTestId('profile-signout-confirm'));

    expect(queryByTestId('profile-signout-modal')).toBeNull();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockAuthState).toEqual({ session: null, isDevBypass: false });
    expect(Haptics.notificationAsync).not.toHaveBeenCalled();
  });

  it('keeps the native Alert Cancel and destructive Sign Out actions', () => {
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    const { getByTestId, queryByTestId } = render(<ProfileScreen />);

    fireEvent.press(getByTestId('profile-sign-out'));

    expect(queryByTestId('profile-signout-modal')).toBeNull();
    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out of HomeHuddle?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel', style: 'cancel' }),
        expect.objectContaining({ text: 'Sign Out', style: 'destructive', onPress: expect.any(Function) }),
      ])
    );

    const actions = alertSpy.mock.calls[0][2];
    actions?.[1]?.onPress?.();
    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(mockAuthState).toEqual({ session: null, isDevBypass: false });
    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
  });
});
