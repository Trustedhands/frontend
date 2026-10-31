import type { ReactNode } from 'react';
import { RequireStaff } from '@/components/require-staff';
import { Shell } from '@/components/shell';

export default function ConsoleLayout({ children }: { children: ReactNode }) {
  return (
    <RequireStaff>
      <Shell>{children}</Shell>
    </RequireStaff>
  );
}
