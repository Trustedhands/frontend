import { createSession } from '@trustedhands/session';
import { env } from './env';

/** The admin console's session: its own refresh cookie, separate from the client app. */
export const session = createSession({ apiUrl: env.apiUrl, app: 'admin' });
