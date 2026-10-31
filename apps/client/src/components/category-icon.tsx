import {
  Car,
  ChefHat,
  Ellipsis,
  House,
  Shirt,
  ShoppingBasket,
  Sparkle,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

const ICONS: Record<string, LucideIcon> = {
  CLEANING: Sparkles,
  COOKING: ChefHat,
  ERRANDS: ShoppingBasket,
  REPAIRS: Wrench,
  LAUNDRY: Shirt,
  DRIVER: Car,
  HOUSE_HELP: House,
  OTHER: Ellipsis,
};

/** Services are configured by ops, so new ones get a generic icon. */
export function categoryIcon(key: string): LucideIcon {
  return ICONS[key] ?? Sparkle;
}
