import type { ReactNode } from 'react';
import { TabNav } from '@/components/tab-nav';

export default function TabsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {children}
      <TabNav />
    </div>
  );
}
