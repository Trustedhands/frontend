import { renderAppIcon } from './app-icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

// iOS applies its own rounded mask, so render it full-bleed
export default function AppleIcon() {
  return renderAppIcon(180, { maskable: true });
}
