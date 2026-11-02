import { useFocusEffect } from 'expo-router';
import { createContext, use, useCallback } from 'react';

/** Set by the tab layout, so a screen deep in a tab can hide the tab bar while it is shown. */
export const TabBarContext = createContext<{ setTabBarHidden: (hidden: boolean) => void }>({
  setTabBarHidden: () => {},
});

/** Hides the tab bar while the calling screen is focused, e.g. to pin a text box to the bottom edge. */
export function useHideTabBar() {
  const { setTabBarHidden } = use(TabBarContext);
  useFocusEffect(
    useCallback(() => {
      setTabBarHidden(true);
      return () => setTabBarHidden(false);
    }, [setTabBarHidden]),
  );
}
