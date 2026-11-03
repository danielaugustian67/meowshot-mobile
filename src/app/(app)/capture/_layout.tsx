import { Stack } from 'expo-router';

import { useT } from '@/lib/i18n';

export default function CaptureLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: t.capture.cameraTitle, headerShown: false }} />
      <Stack.Screen name="gallery" options={{ title: t.capture.galleryTitle }} />
      <Stack.Screen name="review" options={{ title: t.capture.reviewTitle }} />
      {/* The back swipe starts where a finger would drag the photo or a sticker. */}
      <Stack.Screen name="edit" options={{ title: t.capture.editTitle, gestureEnabled: false }} />
      <Stack.Screen name="pick-location" options={{ title: t.capture.pickLocationTitle, presentation: 'modal' }} />
      <Stack.Screen name="share" options={{ title: t.share.title }} />
      <Stack.Screen name="done" options={{ title: t.capture.doneTitle, headerBackVisible: false, headerLeft: () => null, gestureEnabled: false }} />
    </Stack>
  );
}
