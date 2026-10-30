import type { TokenResponse } from './types';
import { getTokens, saveTokens, type Tokens } from './tokens';

export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'https://meowshot-api.zyros.me/v1';

/** Error body from the API: {"error": {"code", "message"}}. Network failures use status 0, code "network". */
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

type Query = Record<string, string | number | boolean | null | undefined>;

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  query?: Query;
  /** Sent as JSON. */
  body?: unknown;
  /** Sent as multipart/form-data; fetch sets the boundary header itself. */
  form?: FormData;
  /** Attach the access token and refresh it on 401. Off for /auth/* calls. */
  auth?: boolean;
  signal?: AbortSignal;
};

let onSessionEnded: (() => void) | null = null;

/** Called once the refresh token is rejected, so the app can drop back to the sign-in screen. */
export function setSessionEndedHandler(fn: (() => void) | null) {
  onSessionEnded = fn;
}

export function tokensFrom(res: TokenResponse): Tokens {
  return { access: res.access_token, refresh: res.refresh_token };
}

function buildURL(path: string, query?: Query) {
  const url = API_URL + path;
  if (!query) return url;
  const params = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`);
  return params.length ? `${url}?${params.join('&')}` : url;
}

async function send(path: string, opts: RequestOptions, accessToken?: string): Promise<Response> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  let body: BodyInit | undefined;
  if (opts.form) {
    body = opts.form;
  } else if (opts.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(opts.body);
  }
  try {
    return await fetch(buildURL(path, opts.query), {
      method: opts.method ?? 'GET',
      headers,
      body,
      signal: opts.signal,
    });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new ApiError(0, 'network', 'Tidak bisa terhubung ke server');
  }
}

async function parse<T>(res: Response): Promise<T> {
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  const data = text ? JSON.parse(text) : undefined;
  if (!res.ok) {
    const err = data?.error;
    throw new ApiError(res.status, err?.code ?? 'http_' + res.status, err?.message ?? res.statusText);
  }
  return data as T;
}

// The refresh token is single-use: presenting a rotated one revokes every session of the user.
// All callers therefore share one in-flight refresh.
let refreshing: Promise<boolean> | null = null;

function refreshTokens(): Promise<boolean> {
  refreshing ??= (async () => {
    const tokens = getTokens();
    if (!tokens) return false;
    const res = await send('/auth/refresh', { method: 'POST', body: { refresh_token: tokens.refresh } });
    if (res.status === 401 || res.status === 403) {
      await saveTokens(null);
      onSessionEnded?.();
      return false;
    }
    await saveTokens(tokensFrom(await parse<TokenResponse>(res)));
    return true;
  })().finally(() => {
    refreshing = null;
  });
  return refreshing;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  if (opts.auth === false) return parse<T>(await send(path, opts));

  if (refreshing) await refreshing;
  const used = getTokens()?.access;
  if (!used) throw new ApiError(401, 'unauthorized', 'Belum login');
  let res = await send(path, opts, used);
  if (res.status === 401) {
    // Another request may already have rotated the tokens while this one was in flight.
    const latest = getTokens()?.access;
    const ok = latest && latest !== used ? true : await refreshTokens();
    if (!ok) throw new ApiError(401, 'unauthorized', 'Sesi berakhir, silakan login lagi');
    res = await send(path, opts, getTokens()!.access);
  }
  if (res.status === 403) {
    // Suspension takes effect on the next request; treat it like a forced logout.
    const err = await parse<never>(res).catch((e: ApiError) => e);
    if (err instanceof ApiError && err.code === 'account_suspended') {
      await saveTokens(null);
      onSessionEnded?.();
    }
    throw err;
  }
  return parse<T>(res);
}
