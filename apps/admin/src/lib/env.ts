// Referenced literally so Next can inline it at build time.
// Empty (the default when API_ORIGIN is set): the API is called on this app's own
// origin and proxied by next.config.ts, so the refresh cookie is first-party.
export const env = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL ?? '',
};
