'use client';

import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { api, unwrap } from '@/lib/api';

/** "Search requests, workers, clients" with results as you type. */
export function SearchBox() {
  const router = useRouter();
  const [text, setText] = useState('');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  // Debounce typing
  useEffect(() => {
    const t = setTimeout(() => setQ(text.trim()), 250);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const results = useQuery({
    queryKey: ['admin', 'search', q],
    queryFn: () => unwrap(api.GET('/v1/admin/search', { params: { query: { q } } })),
    enabled: q.length >= 2,
  });
  const r = results.data;
  const empty = r && !r.requests.length && !r.workers.length && !r.clients.length;

  return (
    <div ref={box} className="relative">
      <label className="flex h-11 min-w-[280px] items-center gap-2 rounded-xl border border-field bg-white px-3.5">
        <Search size={18} className="text-muted" aria-hidden="true" />
        <span className="sr-only">Search</span>
        <input
          type="search"
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
      {open && q.length >= 2 && (
        <div className="absolute right-0 z-20 mt-2 flex w-[min(420px,90vw)] flex-col gap-3 rounded-2xl border border-line bg-white p-3 shadow-lg">
          {results.isPending && <span className="p-2 text-sm text-muted">Searching…</span>}
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
      className="flex flex-col rounded-lg px-2 py-2 text-ink no-underline hover:bg-paper hover:text-ink"
    >
      <span className="text-sm font-bold">{title}</span>
      <span className="text-xs text-muted">{meta}</span>
    </Link>
  );
}
