import { Stack } from 'expo-router';

export default function CatsLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Kucingku' }} />
    </Stack>
  );
}
