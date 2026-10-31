import { createSession } from '@trustedhands/session';
import { env } from './env';

/** This app's session (its own refresh cookie, separate from the admin console). */
export const session = createSession({ apiUrl: env.apiUrl, app: 'client' });
