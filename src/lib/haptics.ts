import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

// Android goes through its own haptics engine, which feels closer to iOS than the plain vibrator the
// cross-platform calls use there. A phone that can't or won't do it just stays still, so failures are ignored.
function play(ios: () => Promise<void>, android: Haptics.AndroidHaptics) {
  if (Platform.OS === 'web') return;
  (Platform.OS === 'android' ? Haptics.performAndroidHapticsAsync(android) : ios()).catch(() => {});
}

/** A reaction picked or removed. */
export function hapticTap() {
  play(() => Haptics.selectionAsync(), Haptics.AndroidHaptics.Clock_Tick);
}

/** The camera's shutter. iOS mutes haptics while the camera is running, so this one is felt on Android only. */
export function hapticShutter() {
  play(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium), Haptics.AndroidHaptics.Virtual_Key);
}

/** Something that took a confirmation went through. */
export function hapticSuccess() {
  play(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success), Haptics.AndroidHaptics.Confirm);
}
