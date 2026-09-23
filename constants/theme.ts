import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#fff';

export const Colors = {
  light: {
    text: '#18243B',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    primary: '#4F46E5',
    bg: '#F6F7FB',
    card: '#FFFFFF',
    subtext: '#526078',
    primarySoft: '#EAE8FF',
    onPrimary: '#FFFFFF',
    onPrimarySoft: '#3730A3',
    inputBorder: '#8190A6',
    dangerText: '#9F1239',
    dangerSurface: '#FFF1F2',
    successText: '#166534',
    successSurface: '#ECFDF3',
    red: '#EF4444',
    blue: '#3B82F6',
    green: '#10B981',
    orange: '#F97316',
    border: '#E2E6EF',
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    primary: '#6552DB',
    bg: '#101522',
    card: '#1B2435',
    subtext: '#B7C3D9',
    primarySoft: '#302E59',
    onPrimary: '#FFFFFF',
    onPrimarySoft: '#E1DEFF',
    inputBorder: '#74829C',
    dangerText: '#FDA4AF',
    dangerSurface: '#3F202C',
    successText: '#86EFAC',
    successSurface: '#12372E',
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
