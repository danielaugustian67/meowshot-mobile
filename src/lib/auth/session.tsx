import { useQuery } from '@tanstack/react-query';
import { createContext, use, useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react';

import { setSessionEndedHandler, tokensFrom } from '@/lib/api/client';
import { authApi, meApi } from '@/lib/api/endpoints';
import { getTokens, loadTokens, saveTokens } from '@/lib/api/tokens';
import type { TokenResponse } from '@/lib/api/types';
import { queryClient, queryKeys } from '@/lib/query';

type Status = 'loading' | 'signedIn' | 'signedOut';

type SessionValue = {
  status: Status;
  /** Store the tokens from login, register or Google and enter the app. */
  signIn: (res: TokenResponse) => Promise<void>;
  signOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession() {
  const value = use(SessionContext);
  if (!value) throw new Error('useSession must be used inside <SessionProvider>');
  return value;
}

/** The signed-in user. Only use inside the signed-in part of the app. */
export function useMe() {
  return useQuery({ queryKey: queryKeys.me, queryFn: meApi.get });
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [status, setStatus] = useState<Status>('loading');

  useEffect(() => {
    loadTokens().then((t) => setStatus(t ? 'signedIn' : 'signedOut'));
    // The client calls this when the refresh token is rejected or the account is suspended.
    setSessionEndedHandler(() => {
      queryClient.clear();
      setStatus('signedOut');
    });
    return () => setSessionEndedHandler(null);
  }, []);

  const signIn = useCallback(async (res: TokenResponse) => {
    await saveTokens(tokensFrom(res));
    queryClient.setQueryData(queryKeys.me, res.user);
    setStatus('signedIn');
  }, []);

  const signOut = useCallback(async () => {
    const refresh = getTokens()?.refresh;
    await saveTokens(null);
    queryClient.clear();
    setStatus('signedOut');
    // Best effort: the local session is already gone even if the server cannot be reached.
    if (refresh) authApi.logout(refresh).catch(() => {});
  }, []);

  const value = useMemo(() => ({ status, signIn, signOut }), [status, signIn, signOut]);
  return <SessionContext value={value}>{children}</SessionContext>;
}
