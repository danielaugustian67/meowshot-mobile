import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useState } from 'react';
import type { ColorValue } from 'react-native';

import { badgeText, useUnreadCount } from '@/features/notifications/queries';
import { TabBarContext } from '@/hooks/use-hide-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

function tabIcon(web: NonNullable<Exclude<SymbolViewProps['name'], string>['web']>) {
  return function TabIcon({ color }: { color: ColorValue }) {
    return <SymbolView name={{ web }} size={24} tintColor={color} />;
  };
}

const HomeIcon = tabIcon('home');
const CaptureIcon = tabIcon('photo_camera');
const CatsIcon = tabIcon('pets');
const ProfileIcon = tabIcon('account_circle');

// Native tabs sit along the top on web, where they cover each screen's header.
export default function AppTabs() {
  const theme = useTheme();
  const t = useT();
  const [tabBarHidden, setTabBarHidden] = useState(false);
  const unread = useUnreadCount();
  return (
    <TabBarContext value={{ setTabBarHidden }}>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: theme.tint,
          tabBarInactiveTintColor: theme.textSecondary,
          tabBarStyle: tabBarHidden
            ? { display: 'none' }
            : { backgroundColor: theme.background, borderTopColor: theme.border },
        }}>
        <Tabs.Screen
          name="(feed)"
          options={{
            title: t.tabs.feed,
            tabBarIcon: HomeIcon,
            tabBarBadge: unread ? badgeText(unread) : undefined,
            tabBarBadgeStyle: { backgroundColor: theme.tint, color: theme.onTint },
          }}
        />
        <Tabs.Screen name="capture" options={{ title: t.tabs.capture, tabBarIcon: CaptureIcon }} />
        <Tabs.Screen name="cats" options={{ title: t.tabs.cats, tabBarIcon: CatsIcon }} />
        <Tabs.Screen name="profile" options={{ title: t.tabs.profile, tabBarIcon: ProfileIcon }} />
      </Tabs>
    </TabBarContext>
  );
}
