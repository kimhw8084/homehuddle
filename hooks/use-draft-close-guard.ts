import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';

/** Original bottom sheets share one dismissal rule for backdrop, swipe and back. */
export function useDraftCloseGuard(draft: unknown, busy: boolean, onClose: () => void) {
  const [baseline] = useState(() => JSON.stringify(draft));
  const dirty = JSON.stringify(draft) !== baseline;
  const requestClose = useCallback(() => {
    if (busy) return;
    if (!dirty) { onClose(); return; }
    Alert.alert('Discard changes?', 'Your unsaved details will be lost.', [
      { text: 'Keep editing', style: 'cancel' },
      { text: 'Discard', style: 'destructive', onPress: onClose },
    ]);
  }, [busy, dirty, onClose]);
  const closeRef = useRef(requestClose);
  useEffect(() => { closeRef.current = requestClose; }, [requestClose]);
  return { requestClose, closeRef };
}
