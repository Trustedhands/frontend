import createClient, { type Middleware } from 'openapi-fetch';
import type { components, paths } from './schema';

export type { components, paths };

type Schemas = components['schemas'];
export type Me = Schemas['MeView'];
export type AuthSession = Schemas['AuthSessionView'];
export type Profile = Schemas['ProfileView'];
export type Address = Schemas['AddressView'];
export type PaymentMethod = Schemas['PaymentMethodView'];
export type ServiceRequestSummary = Schemas['ServiceRequestSummaryView'];
export type ServiceRequestDetail = Schemas['ServiceRequestDetailView'];
export type AssignedWorker = Schemas['AssignedWorkerView'];
export type TimelineEntry = Schemas['TimelineEntryView'];
export type Payment = Schemas['PaymentView'];
export type PaymentHistory = Schemas['PaymentHistoryView'];
export type Transaction = Schemas['TransactionView'];
export type Worker = Schemas['WorkerView'];
export type AdminServiceRequestSummary = Schemas['AdminServiceRequestSummaryView'];
export type AdminServiceRequestDetail = Schemas['AdminServiceRequestDetailView'];

export type ServiceCategory = ServiceRequestSummary['category'];
export type ServiceRequestStatus = ServiceRequestSummary['status'];
export type Language = Profile['preferredLanguages'][number];
export type Gender = NonNullable<Profile['gender']>;
export type AccountType = Profile['accountType'];
export type GenderPreference = ServiceRequestDetail['preferredGender'];

/** Error body the API returns: `code` is stable, `message` is human-readable. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;

const SESSION_PATHS = new Set([
  '/v1/auth/register',
  '/v1/auth/login',
  '/v1/auth/refresh',
  '/v1/auth/logout',
  '/v1/auth/password/forgot',
  '/v1/auth/password/reset',
]);

/**
 * Typed client for the TrustedHands API. `getAccessToken` supplies the
 * caller's access token for each request; cookies are included so the
 * /v1/auth endpoints can read and rotate the httpOnly refresh cookie.
 */
export function createApiClient(options: {
  baseUrl: string;
  getAccessToken: () => Promise<string | null>;
}) {
  const client = createClient<paths>({ baseUrl: options.baseUrl, credentials: 'include' });

  const auth: Middleware = {
    async onRequest({ request, schemaPath }) {
      // Session endpoints authenticate by cookie or credentials, not bearer
      if (SESSION_PATHS.has(schemaPath)) return request;
      const token = await options.getAccessToken();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
  };
  client.use(auth);
  return client;
}

/**
 * Returns `data` or throws an ApiError, so callers (e.g. React Query) can use
 * ordinary exception handling:
 *   const me = await unwrap(api.GET('/v1/me'));
 */
export async function unwrap<T>(
  call: Promise<{ data?: T; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await call;
  if (error !== undefined || !response.ok) {
    const body = (error ?? {}) as { code?: string; message?: string | string[] };
    const message = Array.isArray(body.message)
      ? body.message.join('. ')
      : (body.message ?? `Request failed (${response.status})`);
    throw new ApiError(response.status, body.code, message);
  }
  return data as T;
}
