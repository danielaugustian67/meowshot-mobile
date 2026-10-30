import { strings } from '@/lib/i18n';

import { ApiError } from './client';

/** User-facing text, in the current language, for an error thrown by the API client. */
export function errorMessage(err: unknown): string {
  const messages = strings().errors;
  if (err instanceof ApiError) {
    // validation_failed messages come from the server in English but are specific; show them as-is.
    if (err.code === 'validation_failed') return err.message;
    return messages[err.code] ?? err.message;
  }
  return messages.fallback;
}
