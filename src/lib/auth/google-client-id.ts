// The id_token "aud" is the Web client ID; the server only accepts IDs listed in GOOGLE_CLIENT_IDS.
// Client IDs are public, so the production values are the defaults (like API_URL).
export const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '554006493413-iaesh43ucl55hot3nh7mhm382gsoac2h.apps.googleusercontent.com';
