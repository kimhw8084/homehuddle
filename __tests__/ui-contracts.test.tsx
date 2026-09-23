import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet, Text } from 'react-native';
import { Action, Editor, Field } from '../components/ui/PlanningUI';
import { Colors } from '../constants/theme';

jest.mock('../hooks/use-accessibility-preferences', () => ({ useAccessibilityPreferences: () => ({ reduceMotion: true }) }));

describe('native UI contracts', () => {
  it('exposes checked state and a non-color selection cue', () => {
    const screen = render(<Action label="Alex" selected secondary onPress={jest.fn()} />);
    const choice = screen.getByRole('radio', { name: 'Alex' });
    expect(choice.props.accessibilityState.checked).toBe(true);
    expect(screen.getByText('✓ Alex')).toBeTruthy();
    expect(StyleSheet.flatten(choice.props.style).minHeight).toBeGreaterThanOrEqual(48);
  });
  it('keeps the action label present and prevents input while pending', () => {
    const press = jest.fn();
    const screen = render(<Action label="Save dinner" busy onPress={press} />);
    fireEvent.press(screen.getByText('Save dinner'));
    expect(press).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Save dinner' }).props.accessibilityState.busy).toBe(true);
  });
  it('associates correction and requiredness with a native field', () => {
    const screen = render(<Field label="Quantity" required error="Use a positive number." value="0" />);
    expect(screen.getByLabelText('Quantity').props.accessibilityHint).toBe('Required. Use a positive number.');
    expect(screen.getByRole('alert')).toBeTruthy();
  });
  it('requires an explicit discard and permits returning to a dirty editor', () => {
    const close = jest.fn();
    const screen = render(<Editor title="Edit dinner" busy={false} dirty onClose={close}><Text>Unsaved dinner</Text></Editor>);
    fireEvent.press(screen.getByText('Cancel edit'));
    expect(close).not.toHaveBeenCalled();
    fireEvent.press(screen.getByText('Keep editing'));
    expect(screen.getByText('Unsaved dinner')).toBeTruthy();
    fireEvent.press(screen.getByText('Cancel edit'));
    fireEvent.press(screen.getByText('Discard changes'));
    expect(close).toHaveBeenCalledTimes(1);
  });
  it('has readable semantic text and action colors in both themes', () => {
    function luminance(hex: string) {
      const channels = [1, 3, 5].map(start => parseInt(hex.slice(start, start + 2), 16) / 255)
        .map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
      return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
    }
    for (const colors of Object.values(Colors)) {
      for (const [foreground, background] of [[colors.text, colors.bg], [colors.subtext, colors.card], [colors.onPrimary, colors.primary], [colors.onPrimarySoft, colors.primarySoft], [colors.dangerText, colors.card]]) {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => a - b);
        expect((values[1] + 0.05) / (values[0] + 0.05)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });
});
