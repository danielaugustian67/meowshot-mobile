import { usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { useT } from '@/lib/i18n';

/** Asks before leaving an editor with unsaved changes. Call the returned function to leave without asking. */
export function useDiscardGuard(changed: boolean) {
  const t = useT();
  const [leaving, setLeaving] = useState(false);
  const allowLeaving = usePreventRemove(changed && !leaving, ({ repeat }) => {
    const leave = () => {
      setLeaving(true);
      repeat();
    };
    if (Platform.OS === 'web') {
      // Alert does nothing on web, which would leave no way out of this screen.
      if (window.confirm(t.capture.editDiscardTitle)) leave();
      return;
    }
    Alert.alert(t.capture.editDiscardTitle, t.capture.editDiscardBody, [
      { text: t.capture.editKeep, style: 'cancel' },
      { text: t.capture.editDiscard, style: 'destructive', onPress: leave },
    ]);
  });
  return () => {
    setLeaving(true);
    allowLeaving();
  };
}
