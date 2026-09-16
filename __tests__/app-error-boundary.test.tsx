import React from 'react';
import { Text } from 'react-native';
import { fireEvent, render } from '@testing-library/react-native';
import { AppErrorBoundary } from '../components/AppErrorBoundary';

let shouldThrow = true;

function ThrowingScreen() {
  if (shouldThrow) throw new Error('render failure');
  return <Text>Recovered screen</Text>;
}

describe('AppErrorBoundary', () => {
  const consoleError = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  beforeEach(() => {
    shouldThrow = true;
    consoleError.mockClear();
  });

  afterAll(() => consoleError.mockRestore());

  it('contains a render failure and remounts the screen on retry', () => {
    const screen = render(
      <AppErrorBoundary>
        <ThrowingScreen />
      </AppErrorBoundary>
    );

    expect(screen.getByText('HomeHuddle needs to restart this screen')).toBeTruthy();

    shouldThrow = false;
    fireEvent.press(screen.getByRole('button', { name: 'Try again' }));

    expect(screen.getByText('Recovered screen')).toBeTruthy();
  });
});
