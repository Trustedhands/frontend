import type { ReactNode } from 'react';

/** Centered card used by the sign-in screens. */
export function AuthCard({
  title,
  lead,
  children,
}: {
  title: string;
  lead?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-[420px] flex-col gap-6 rounded-[20px] border border-line bg-white p-8">
        <div className="flex items-center gap-2.5">
          <span
            className="flex size-[34px] items-center justify-center rounded-[10px] bg-brand text-white"
            aria-hidden="true"
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M3 11l9-7 9 7" />
              <path d="M6 10v10h12V10" />
            </svg>
          </span>
          <span className="font-display text-lg font-extrabold">
            TrustedHands <span className="font-medium text-cta">Ops</span>
          </span>
        </div>
        <div className="flex flex-col gap-1.5">
          <h1 className="m-0 font-display text-[26px] font-extrabold tracking-[-0.02em]">
            {title}
          </h1>
          {lead && <p className="m-0 text-sm leading-[1.45] text-muted">{lead}</p>}
        </div>
        {children}
      </div>
    </main>
  );
}
