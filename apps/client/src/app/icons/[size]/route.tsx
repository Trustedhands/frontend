import { renderAppIcon } from '../../app-icon';

const SIZES: Record<string, { size: number; maskable: boolean }> = {
  '192.png': { size: 192, maskable: false },
  '512.png': { size: 512, maskable: false },
  'maskable-512.png': { size: 512, maskable: true },
};

export const dynamic = 'force-static';

export function generateStaticParams() {
  return Object.keys(SIZES).map((size) => ({ size }));
}

export async function GET(_: Request, { params }: { params: Promise<{ size: string }> }) {
  const spec = SIZES[(await params).size];
  if (!spec) return new Response('Not found', { status: 404 });
  return renderAppIcon(spec.size, { maskable: spec.maskable });
}
