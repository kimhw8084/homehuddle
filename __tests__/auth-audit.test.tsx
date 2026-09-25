import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';
import AuthRootView from '../app/index';

const mockReplace = jest.fn();
const mockSetDevBypass = jest.fn();
const mockSetColorScheme = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

jest.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    setDevBypass: mockSetDevBypass,
  }),
}));

jest.mock('nativewind', () => ({
  useColorScheme: () => ({
    colorScheme: 'light',
    setColorScheme: mockSetColorScheme,
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('expo-sensors', () => ({
  Gyroscope: {
    isAvailableAsync: jest.fn().mockResolvedValue(false),
    setUpdateInterval: jest.fn(),
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

describe('AuthRootView Functional Audit', () => {
  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('opens Developer Control after two taps and requires an explicit bypass action', () => {
    jest.useFakeTimers();
    const { getByTestId, getByText, queryByText } = render(<AuthRootView />);
    const trigger = getByTestId('logo-trigger');

    expect(Haptics.notificationAsync).toHaveBeenCalledWith(Haptics.NotificationFeedbackType.Success);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();

    fireEvent.press(trigger);
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(queryByText('Developer Control')).toBeNull();
    expect(mockSetDevBypass).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(trigger);
    expect(getByText('Developer Control')).toBeTruthy();
    expect(mockSetDevBypass).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(getByText('TOGGLE'));
    expect(getByText('Currently: Dark')).toBeTruthy();
    fireEvent.press(getByText('TOGGLE'));
    expect(getByText('Currently: Light')).toBeTruthy();
    expect(mockSetColorScheme).toHaveBeenNthCalledWith(1, 'dark');
    expect(mockSetColorScheme).toHaveBeenNthCalledWith(2, 'light');
    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Medium);

    fireEvent.press(getByTestId('developer-control-close'));
    expect(queryByText('Developer Control')).toBeNull();
    expect(mockSetDevBypass).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    fireEvent.press(trigger);
    expect(queryByText('Developer Control')).toBeNull();
    fireEvent.press(trigger);
    fireEvent.press(getByText('Mission Control'));
    expect(mockSetDevBypass).toHaveBeenNthCalledWith(1, true);
    expect(mockReplace).toHaveBeenNthCalledWith(1, '/(app)');

    fireEvent.press(trigger);
    fireEvent.press(trigger);
    fireEvent.press(getByText('Instant Bypass Login'));
    expect(mockSetDevBypass).toHaveBeenNthCalledWith(2, true);
    expect(mockReplace).toHaveBeenNthCalledWith(2, '/(app)');
  });
});
