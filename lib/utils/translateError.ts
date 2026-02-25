/**
 * Maps English Supabase/Auth error messages to i18n translation keys.
 * The key is the English error string (or substring), and the value is
 * the translation key within the "errors" namespace.
 */
const ERROR_KEY_MAP: Record<string, string> = {
  "A user with this email address has already been registered": "emailAlreadyRegistered",
  "User already registered": "userAlreadyRegistered",
  "Invalid login credentials": "invalidLoginCredentials",
  "Email not confirmed": "emailNotConfirmed",
  "Signup requires a valid password": "validPasswordRequired",
  "Password should be at least 6 characters": "passwordMinChars",
  "New password should be different from the old password.": "newPasswordMustDiffer",
  "Email rate limit exceeded": "emailRateLimitExceeded",
  "For security purposes, you can only request this once every 60 seconds": "securityRateLimit",
  "Unable to validate email address: invalid format": "invalidEmailFormat",
  "Auth session missing!": "sessionMissing",
};

/**
 * Translates a Supabase/Auth error message using the provided translation function.
 * @param message - The original English error message from Supabase
 * @param t - Translation function from useTranslations("errors") or getTranslations("errors")
 */
export function translateError(message: string, t: (key: string) => string): string {
  if (!message) return t("generic");

  // Exact match
  if (ERROR_KEY_MAP[message]) return t(ERROR_KEY_MAP[message]);

  // Partial match
  for (const [en, key] of Object.entries(ERROR_KEY_MAP)) {
    if (message.toLowerCase().includes(en.toLowerCase())) return t(key);
  }

  return message;
}
