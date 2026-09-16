import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#4F46E5',
    bg: '#FAFAFA',
    card: '#FFFFFF',
    subtext: '#64748B',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F97316',
    border: '#F1F5F9',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#6366F1',
    bg: '#000000',
    card: '#18181B',
    subtext: '#94A3B8',
    red: '#F43F5E',
    blue: '#60A5FA',
    green: '#34D399',
    orange: '#FB923C',
    border: '#27272A',
  },
};

export const GOLDEN_RADIUS = 20;
export const GOLDEN_SHADOW = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.04,
  shadowRadius: 8,
  elevation: 2,
};
export const SPRING_CONFIG = { damping: 25, stiffness: 200, mass: 0.5 };

export const Fonts = Platform.select({
  ios: {
    rounded: 'ui-rounded',
    sans: 'system-ui',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    rounded: 'normal',
    mono: 'monospace',
  },
});
