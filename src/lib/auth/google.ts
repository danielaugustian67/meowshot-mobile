import { GoogleSignin, isCancelledResponse, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';

// The id_token "aud" is the Web client ID; the server only accepts IDs listed in GOOGLE_CLIENT_IDS.
// Client IDs are public, so the production values are the defaults (like API_URL).
const WEB_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '554006493413-iaesh43ucl55hot3nh7mhm382gsoac2h.apps.googleusercontent.com';
// Must match the iosUrlScheme (reversed) of the google-signin plugin in app.json.
const IOS_CLIENT_ID =
  process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '554006493413-hudoaj15acn03p7c538dnj4b4evqljec.apps.googleusercontent.com';

let configured = false;

/** Opens the Google account sheet. Resolves to the id_token, or null when the user backs out. */
export async function googleIdToken(): Promise<string | null> {
  if (!configured) {
    GoogleSignin.configure({ webClientId: WEB_CLIENT_ID, iosClientId: IOS_CLIENT_ID });
    configured = true;
  }
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const res = await GoogleSignin.signIn();
    if (isCancelledResponse(res)) return null;
    // Only the token is needed; forgetting the Google session lets the next sign-in pick another account.
    GoogleSignin.signOut().catch(() => {});
    if (!res.data.idToken) throw new Error('Google returned no id_token');
    return res.data.idToken;
  } catch (e) {
    // A second tap while the sheet is open.
    if (isErrorWithCode(e) && (e.code === statusCodes.IN_PROGRESS || e.code === statusCodes.SIGN_IN_CANCELLED)) {
      return null;
    }
    throw e;
  }
}
