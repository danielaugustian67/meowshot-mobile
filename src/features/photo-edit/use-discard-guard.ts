import { usePreventRemove } from 'expo-router';
import { useState } from 'react';

import { Alert } from '@/lib/alert';
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
