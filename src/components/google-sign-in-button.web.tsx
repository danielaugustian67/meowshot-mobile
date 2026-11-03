import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { WEB_CLIENT_ID } from '@/lib/auth/google-client-id';
import { useSession } from '@/lib/auth/session';
import { useLanguage, useT } from '@/lib/i18n';

type Props = {
  /** Sent along so a new Google account can sign up when the server requires an invite. */
  inviteCode?: string;
  onStart: () => void;
  onError: (e: unknown) => void;
};

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; ux_mode: 'popup'; callback: (r: { credential: string }) => void }) => void;
      renderButton: (host: HTMLElement, options: Record<string, string | number>) => void;
    };
  };
};

const MAX_BUTTON_WIDTH = 400;
let script: Promise<GoogleIdentity> | null = null;

function loadGoogle() {
  script ??= new Promise((resolve, reject) => {
    const tag = document.createElement('script');
    tag.src = 'https://accounts.google.com/gsi/client';
    tag.async = true;
    tag.onload = () => resolve((window as unknown as { google: GoogleIdentity }).google);
    tag.onerror = () => {
      script = null;
      reject(new Error('Google sign-in did not load'));
    };
    document.head.append(tag);
  });
  return script;
}

/** "or" divider plus Google's own button, which browsers require; signs in with the session on success. */
export function GoogleSignInButton({ inviteCode, onStart, onError }: Props) {
  const { signIn } = useSession();
  const t = useT();
  const theme = useTheme();
  const scheme = useColorScheme();
  const language = useLanguage();
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const signedIn = useEffectEvent(async (idToken: string) => {
    onStart();
    setBusy(true);
    try {
      await signIn(await authApi.google({ id_token: idToken, invite_code: inviteCode || undefined }));
    } catch (e) {
      // The generic unauthorized text talks about passwords; here it means the server rejected the Google token.
      const rejected = e instanceof ApiError && e.code === 'unauthorized';
      onError(rejected ? new ApiError(e.status, 'google_rejected', e.message) : e);
      setBusy(false);
    }
  });

  useEffect(() => {
    let current = true;
    loadGoogle().then(
      (google) => {
        const element = host.current;
        if (!current || !element) return;
        google.accounts.id.initialize({
          client_id: WEB_CLIENT_ID,
          ux_mode: 'popup',
          callback: ({ credential }) => signedIn(credential),
        });
        element.replaceChildren();
        google.accounts.id.renderButton(element, {
          type: 'standard',
          theme: scheme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          shape: 'pill',
          locale: language,
          width: Math.min(element.offsetWidth, MAX_BUTTON_WIDTH),
        });
      },
      () => {
        if (current) setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [scheme, language]);

  // Without the script there is no button to offer, and email sign-in still works.
  if (failed) return null;

  return (
    <>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText type="small" themeColor="textSecondary">
          {t.auth.or}
        </ThemedText>
        <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
      </View>
      <View style={styles.slot}>
        {busy ? <ActivityIndicator /> : null}
        <div ref={host} style={{ width: '100%', display: busy ? 'none' : 'flex', justifyContent: 'center' }} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
  slot: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
