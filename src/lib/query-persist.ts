import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { defaultShouldDehydrateQuery, type InfiniteData } from '@tanstack/react-query';
import type { PersistQueryClientOptions, PersistedClient } from '@tanstack/react-query-persist-client';

import { PERSIST_MAX_AGE } from './query';
import { queryStorage } from './query-storage';

// Raise this when the shape of a cached API response changes, so an update does not read the old one.
const CACHE_VERSION = '1';

// Search, nearby cats and the unread count go stale too quickly to be worth showing from a past session.
function isKept([root, kind]: readonly unknown[]) {
  if (root === 'cats') return kind !== 'nearby';
  return root === 'me' || root === 'posts' || root === 'friends';
}

/** Only the first page of a list: it is what shows on opening, and a restored list refetches every page it has. */
function firstPagesOnly(client: PersistedClient): PersistedClient {
  const queries = client.clientState.queries.map((query) => {
    const data = query.state.data as InfiniteData<unknown> | undefined;
    if (!data?.pages) return query;
    const first = { pages: data.pages.slice(0, 1), pageParams: data.pageParams.slice(0, 1) };
    return { ...query, state: { ...query.state, data: first } };
  });
  return { ...client, clientState: { ...client.clientState, queries } };
}

const persister = createAsyncStoragePersister({
  storage: queryStorage,
  // Written at most this often, so scrolling and reacting do not keep a low-end phone busy.
  throttleTime: 2000,
  serialize: (client) => JSON.stringify(firstPagesOnly(client)),
});

/**
 * Lists from the last session show at once when the app opens, then refetch behind them. Expired signed URLs are
 * harmless here: photos already on disk are found by their cache key, and the refetch brings fresh URLs for the rest.
 */
export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: PERSIST_MAX_AGE,
  buster: CACHE_VERSION,
  dehydrateOptions: {
    shouldDehydrateMutation: () => false,
    shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) && isKept(query.queryKey),
  },
};

/** Signing out must not leave one account's lists for the next to see, even if the app closes right away. */
export function clearPersistedQueries() {
  Promise.resolve(persister.removeClient()).catch(() => {});
}
