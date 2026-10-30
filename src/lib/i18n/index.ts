import { getLocales, useLocales } from 'expo-localization';

import { getPrefs, usePrefs, type LanguagePref } from '@/lib/prefs';

import { dictionaries, type Language, type Strings } from './strings';

export type { Language, Strings };

// Indonesian devices get Indonesian; everyone else gets English.
function resolve(pref: LanguagePref, deviceLanguage: string | null | undefined): Language {
  if (pref !== 'system') return pref;
  return deviceLanguage === 'id' ? 'id' : 'en';
}

/** The language the app shows now, following the setting and the device language. */
export function useLanguage(): Language {
  const { language } = usePrefs();
  const [locale] = useLocales();
  return resolve(language, locale.languageCode);
}

/** The copy for the current language. Components re-render when the language changes. */
export function useT(): Strings {
  return dictionaries[useLanguage()];
}

/** The copy outside React (formatters, error messages): read at call time, so it does not re-render. */
export function strings(): Strings {
  return dictionaries[resolve(getPrefs().language, getLocales()[0].languageCode)];
}
