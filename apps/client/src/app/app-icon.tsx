import { ImageResponse } from 'next/og';

/**
 * Renders the app icon as a PNG. `maskable` adds padding so Android's
 * circular/squircle masks don't clip the mark.
 */
export function renderAppIcon(size: number, { maskable = false } = {}) {
  const glyph = Math.round(size * (maskable ? 0.42 : 0.58));
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#E8641B',
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg
          width={glyph}
          height={glyph}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#FFFFFF"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Satori only accepts raw SVG elements here (same paths as <HousePaths>) */}
          <path d="M3 11l9-7 9 7" strokeWidth={2.2} />
          <path d="M6 10v10h12V10" strokeWidth={2.2} />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
