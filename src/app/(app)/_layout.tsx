import { NativeTabs } from 'expo-router/native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

// Android allows at most five native tabs.
export default function AppTabs() {
  const theme = useTheme();
  const t = useT();
  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundElement}
      labelStyle={{ selected: { color: theme.tint } }}
      iconColor={{ selected: theme.tint }}>
      <NativeTabs.Trigger name="(feed)">
        <NativeTabs.Trigger.Label>{t.tabs.feed}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="capture">
        <NativeTabs.Trigger.Label>{t.tabs.capture}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'camera', selected: 'camera.fill' }} md="photo_camera" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="cats">
        <NativeTabs.Trigger.Label>{t.tabs.cats}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="pawprint.fill" md="pets" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>{t.tabs.profile}</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
