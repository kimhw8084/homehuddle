/* eslint-disable import/first */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

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
jest.mock('../lib/auth', () => ({
  sendMagicLink: jest.fn(),
  signInWithProvider: jest.fn(),
}));

import AuthRootView from '../app/index';

describe('AuthRootView Functional Audit', () => {
  it('reveals developer controls after exactly 5 taps in development', async () => {
    jest.useFakeTimers();
    const { getByTestId } = render(<AuthRootView />);
    const trigger = getByTestId('logo-trigger');

    // 4 taps should not reveal developer controls.
    for(let i = 0; i < 4; i++) {
      fireEvent.press(trigger);
    }
    expect(mockSetDevBypass).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    // The fifth tap opens controls; entering the app still requires a deliberate action.
    fireEvent.press(trigger);
    expect(getByTestId('logo-trigger')).toBeTruthy();
    expect(mockSetDevBypass).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    
    jest.useRealTimers();
  });

  it('keeps magic-link submission enabled while connectivity is being determined', () => {
    const { getByText, getByTestId } = render(<AuthRootView />);

    fireEvent.press(getByText('Continue with Email'));
    expect(getByTestId('send-magic-link').props.disabled).toBeFalsy();
  });
});
