import { Stack } from 'expo-router';

export default function CaptureLayout() {
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: 'Kamera', headerShown: false }} />
      <Stack.Screen name="gallery" options={{ title: 'Galeri' }} />
      <Stack.Screen name="review" options={{ title: 'Simpan kucing' }} />
      <Stack.Screen name="pick-location" options={{ title: 'Pilih lokasi', presentation: 'modal' }} />
      <Stack.Screen name="done" options={{ title: 'Tersimpan', headerBackVisible: false, headerLeft: () => null, gestureEnabled: false }} />
    </Stack>
  );
}
