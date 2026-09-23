import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Start conservatively until platform preferences have been read. */
export function useAccessibilityPreferences() {
  const [reduceMotion, setReduceMotion] = useState(true);
  useEffect(() => {
    let active = true;
    Promise.resolve(AccessibilityInfo.isReduceMotionEnabled()).then(value => {
      if (active) setReduceMotion(Boolean(value));
    }).catch(() => { /* Retain the safe, no-animation fallback. */ });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => { active = false; subscription?.remove(); };
  }, []);
  return { reduceMotion };
}
