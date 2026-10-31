'use client';

import { Alert, Button, buttonClass, Card } from '@trustedhands/ui';
import type { Me } from '@trustedhands/api';
import { useQueryClient } from '@tanstack/react-query';
import { Bell, CircleCheck, MapPin } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense, useState, type ReactNode } from 'react';
import { RequireProfile } from '@/components/require-profile';
import { BackLink, FlowScreen, Heading } from '@/components/screen';
import { api, unwrap } from '@/lib/api';
import { useBrowserValue } from '@/lib/browser';
import { keys } from '@/lib/queries';

type PermissionState = 'idle' | 'asking' | 'on' | 'off' | 'unsupported';

export default function PermissionsPage() {
  return (
    <Suspense>
      <RequireProfile>{(me) => <Permissions me={me} />}</RequireProfile>
    </Suspense>
  );
}

/** Optional notifications and location ("3b" in the design). */
function Permissions({ me }: { me: Me }) {
  const editing = useSearchParams().get('edit') === '1';
  const done = editing ? '/profile' : '/';

  return (
    <FlowScreen className="gap-5">
      <div className="flex items-center justify-between">
        <BackLink href={editing ? '/profile' : '/signup/verify'} />
        {!editing && (
          <Link href="/" className="px-1 py-3 text-sm font-bold">
            Skip
          </Link>
        )}
      </div>
      <Heading
        title="Stay in the loop"
        lead="Two optional permissions. Your browser will ask you to confirm each one, and you can change them any time in Profile."
      />
      <NotificationsSection />
      <LocationSection me={me} />
      <div className="mt-auto flex flex-col gap-3">
        <Link href={done} className={buttonClass('primary')}>
          Continue
        </Link>
      </div>
    </FlowScreen>
  );
}

function PermissionCard({
  icon,
  iconClass,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  iconClass: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex items-start gap-3">
        <div
          className={`flex size-10 flex-none items-center justify-center rounded-xl ${iconClass}`}
        >
          {icon}
        </div>
        <div className="flex flex-1 flex-col gap-1">
          <span className="text-base font-bold">{title}</span>
          <span className="text-sm leading-[1.45] text-muted">{body}</span>
        </div>
      </div>
      {children}
    </Card>
  );
}

function OnState({ children }: { children: ReactNode }) {
  return (
    <span className="flex min-h-11 items-center gap-2 rounded-xl bg-success-bg px-3 text-sm font-bold text-success-ink">
      <CircleCheck size={18} aria-hidden="true" />
      {children}
    </span>
  );
}

function readNotificationState(): PermissionState {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'on';
  if (Notification.permission === 'denied') return 'off';
  return 'idle';
}

function NotificationsSection() {
  const queryClient = useQueryClient();
  const initial = useBrowserValue<PermissionState>(readNotificationState, 'idle');
  const [asked, setState] = useState<PermissionState | null>(null);
  const state = asked ?? initial;

  const ask = async () => {
    setState('asking');
    const result = await Notification.requestPermission();
    const on = result === 'granted';
    setState(on ? 'on' : result === 'denied' ? 'off' : 'idle');
    const me = await unwrap(api.PATCH('/v1/me/profile', { body: { pushEnabled: on } }));
    queryClient.setQueryData(keys.me, me);
  };

  return (
    <PermissionCard
      icon={<Bell size={20} aria-hidden="true" />}
      iconClass="bg-peach text-cta-hover"
      title="Notifications"
      body="Know the moment your price is ready, your worker is confirmed, or they're on the way."
    >
      {(state === 'idle' || state === 'asking') && (
        <Button variant="dark" size="md" onClick={ask} loading={state === 'asking'}>
          Turn on notifications
        </Button>
      )}
      {state === 'on' && <OnState>Notifications are on</OnState>}
      {state === 'off' && (
        <Alert tone="warn" title="Notifications are blocked">
          We'll still text you about price and worker updates. To turn them on later, tap the lock
          icon next to the web address and allow notifications.
        </Alert>
      )}
      {state === 'unsupported' && (
        <Alert tone="warn" title="Not available in this browser">
          We'll text you about price and worker updates instead.
        </Alert>
      )}
      <span className="text-[13px] leading-[1.4] text-muted">
        On iPhone, notifications work once you've added the app to your Home Screen (iOS 16.4 or
        later).{' '}
        <Link href="/install" className="font-bold">
          How to install
        </Link>
      </span>
    </PermissionCard>
  );
}

function LocationSection({ me }: { me: Me }) {
  const queryClient = useQueryClient();
  const home = me.homeAddress;
  const [state, setState] = useState<PermissionState>(home?.latitude != null ? 'on' : 'idle');
  const [error, setError] = useState<string | null>(null);

  const ask = () => {
    if (!('geolocation' in navigator) || !home) {
      setState('unsupported');
      return;
    }
    setState('asking');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const saved = await unwrap(
            api.PUT('/v1/me/home-address', {
              body: {
                district: home.district,
                sector: home.sector,
                street: home.street,
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              },
            }),
          );
          queryClient.setQueryData(keys.me, saved);
          setState('on');
        } catch (e) {
          setError((e as Error).message);
          setState('idle');
        }
      },
      () => setState('off'),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  return (
    <PermissionCard
      icon={<MapPin size={20} aria-hidden="true" />}
      iconClass="bg-sky text-ink-2"
      title="Location"
      body="Pin your exact address so workers find your gate first time. We only use it when you set an address."
    >
      {(state === 'idle' || state === 'asking') && (
        <Button variant="outline" size="md" onClick={ask} loading={state === 'asking'}>
          Use my location
        </Button>
      )}
      {state === 'on' && home && (
        <OnState>
          Location pinned · {home.sector}, {home.district}
        </OnState>
      )}
      {(state === 'off' || state === 'unsupported') && (
        <Alert tone="warn" title="No problem">
          You can type your address and a landmark instead. Our team calls you if the worker needs
          directions.
        </Alert>
      )}
      {error && <Alert>{error}</Alert>}
    </PermissionCard>
  );
}
