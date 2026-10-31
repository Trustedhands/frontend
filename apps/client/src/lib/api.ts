import { createApiClient } from '@trustedhands/api';
import { env } from './env';
import { session } from './session';

export { ApiError, unwrap } from '@trustedhands/api';

export const api = createApiClient({
  baseUrl: env.apiUrl,
  getAccessToken: session.getAccessToken,
});
