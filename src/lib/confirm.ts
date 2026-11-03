import { Alert, Platform } from 'react-native';

/** Asks before something that can't be undone. */
export function confirmDestructive({
  title,
  body,
  action,
  cancel,
  onConfirm,
}: {
  title: string;
  body: string;
  action: string;
  cancel: string;
  onConfirm: () => void;
}) {
  if (Platform.OS === 'web') {
    // Alert does nothing on web.
    if (window.confirm(`${title}\n\n${body}`)) onConfirm();
    return;
  }
  Alert.alert(title, body, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
