import { Stack } from 'expo-router';

export default function FeedLayout() {
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: 'Feed' }} />
    </Stack>
  );
}
