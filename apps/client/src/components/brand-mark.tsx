/** The TrustedHands house mark, shared by the UI and generated app icons. */
export function HousePaths({ strokeWidth = 2.2 }: { strokeWidth?: number }) {
  return (
    <>
      <path d="M3 11l9-7 9 7" strokeWidth={strokeWidth} />
      <path d="M6 10v10h12V10" strokeWidth={strokeWidth} />
    </>
  );
}

export function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <div
      className="flex flex-none items-center justify-center rounded-[10px] bg-brand text-white"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={size * 0.56}
        height={size * 0.56}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <HousePaths />
      </svg>
    </div>
  );
}

export function BrandLockup() {
  return (
    <div className="flex items-center gap-2.5">
      <BrandMark />
      <span className="font-display text-xl font-extrabold tracking-[-0.02em]">TrustedHands</span>
    </div>
  );
}
