import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

// Mocks
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
  }),
}));

const mockSetDevBypass = jest.fn();
jest.mock('../store/authStore', () => ({
  useAuthStore: () => ({
    setDevBypass: mockSetDevBypass,
  }),
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Success: 'success' },
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(),
}));

import AuthRootView from '../app/index';

describe('AuthRootView Functional Audit', () => {
  it('triggers dev bypass after exactly 5 taps on the logo container', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<AuthRootView />);
    const trigger = getByTestId('logo-trigger');

    // 4 taps shouldn't trigger anything but light haptics
    for(let i = 0; i < 4; i++) {
      fireEvent.press(trigger);
    }
    expect(mockSetDevBypass).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    // 5th tap triggers bypass
    fireEvent.press(trigger);
    expect(mockSetDevBypass).toHaveBeenCalledWith(true);
    expect(mockReplace).toHaveBeenCalledWith('/(app)');
    
    jest.useRealTimers();
  });
});
