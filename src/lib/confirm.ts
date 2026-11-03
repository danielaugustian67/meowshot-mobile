import { Alert } from '@/lib/alert';

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
  Alert.alert(title, body, [
    { text: cancel, style: 'cancel' },
    { text: action, style: 'destructive', onPress: onConfirm },
  ]);
}
