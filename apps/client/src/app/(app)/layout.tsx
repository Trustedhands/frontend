import type { ReactNode } from 'react';
import { RequireClient } from '@/components/require-client';

export default function SignedInLayout({ children }: { children: ReactNode }) {
  return <RequireClient>{children}</RequireClient>;
}
