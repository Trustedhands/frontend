'use client';

import { cx } from '@trustedhands/ui';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useId, useRef, useState } from 'react';
import { api, unwrap } from '@/lib/api';
import { useDebounced } from '@/lib/use-debounced';

const PANEL_WIDTH = 420;

/** "Search requests, workers, clients" with results as you type. */
export function SearchBox() {
  const router = useRouter();
  const [text, setText] = useState('');
  const q = useDebounced(text.trim());
  const [open, setOpenState] = useState(false);
  const [alignRight, setAlignRight] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const listId = useId();

  // Open under the box, flush with whichever edge keeps the panel on screen
  const setOpen = (next: boolean) => {
    if (next && box.current) {
      const { left } = box.current.getBoundingClientRect();
      setAlignRight(left + PANEL_WIDTH > window.innerWidth - 16);
    }
    setOpenState(next);
  };

  useEffect(() => {
    // pointerdown covers mouse, touch and pen
    const close = (e: PointerEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpenState(false);
    };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, []);

  const results = useQuery({
    queryKey: ['admin', 'search', q],
    queryFn: () => unwrap(api.GET('/v1/admin/search', { params: { query: { q } } })),
    enabled: q.length >= 2,
  });
  const r = results.data;
  const empty = r && !r.requests.length && !r.workers.length && !r.clients.length;
  const showing = open && q.length >= 2;

  return (
    <div ref={box} className="relative w-full sm:w-auto">
      <label className="flex h-11 w-full items-center gap-2 rounded-xl border border-field bg-white px-3.5 focus-within:border-ink sm:w-[300px]">
        <Search size={18} className="text-muted" aria-hidden="true" />
        <span className="sr-only">Search</span>
        <input
          type="search"
          role="combobox"
          aria-expanded={showing}
          aria-controls={listId}
          aria-autocomplete="list"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            // Enter on a single request reference jumps straight to it
            if (e.key === 'Enter' && r?.requests.length === 1)
              router.push(`/requests/${r.requests[0]!.id}`);
            if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Search requests, workers, clients"
          className="min-w-0 flex-1 border-0 bg-transparent text-sm text-ink outline-none"
        />
      </label>
      {showing && (
        <div
          id={listId}
          role="region"
          aria-label="Search results"
          aria-live="polite"
          style={{ width: `min(${PANEL_WIDTH}px, calc(100vw - 2rem))` }}
          className={cx(
            'absolute top-full z-30 mt-2 flex max-h-[min(480px,70dvh)] flex-col gap-3 overflow-y-auto rounded-2xl border border-line bg-white p-3 shadow-lg',
            alignRight ? 'right-0' : 'left-0',
          )}
        >
          {results.isPending && <span className="p-2 text-sm text-muted">Searching…</span>}
          {results.error && (
            <span className="p-2 text-sm text-danger">Search failed. Try again.</span>
          )}
          {empty && <span className="p-2 text-sm text-muted">Nothing matches “{q}”.</span>}
          {r && r.requests.length > 0 && (
            <ResultGroup title="Requests">
              {r.requests.map((x) => (
                <ResultLink
                  key={x.id}
                  href={`/requests/${x.id}`}
                  title={`${x.reference} · ${x.categoryLabel}`}
                  meta={x.client.fullName}
                  onPick={() => setOpen(false)}
                />
              ))}
            </ResultGroup>
          )}
          {r && r.workers.length > 0 && (
            <ResultGroup title="Workers">
              {r.workers.map((x) => (
                <ResultLink
                  key={x.id}
                  href={`/workers/${x.id}`}
                  title={x.fullName}
                  meta={x.phone}
                  onPick={() => setOpen(false)}
                />
              ))}
            </ResultGroup>
          )}
          {r && r.clients.length > 0 && (
            <ResultGroup title="Clients">
              {r.clients.map((x) => (
                <ResultLink
                  key={x.id}
                  href={`/clients/${x.id}`}
                  title={x.fullName}
                  meta={x.email}
                  onPick={() => setOpen(false)}
                />
              ))}
            </ResultGroup>
          )}
        </div>
      )}
    </div>
  );
}

function ResultGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col">
      <span className="px-2 pb-1 text-xs font-bold tracking-[0.06em] text-muted uppercase">
        {title}
      </span>
      {children}
    </div>
  );
}

function ResultLink({
  href,
  title,
  meta,
  onPick,
}: {
  href: string;
  title: string;
  meta: string;
  onPick: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onPick}
      className="flex min-w-0 flex-col rounded-lg px-2 py-2 text-ink no-underline hover:bg-paper hover:text-ink focus-visible:bg-paper"
    >
      <span className="truncate text-sm font-bold">{title}</span>
      <span className="truncate text-xs text-muted">{meta}</span>
    </Link>
  );
}
