import {
  Car,
  ChefHat,
  Ellipsis,
  Shirt,
  ShoppingBasket,
  Sparkles,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import type { ServiceCategory } from '@trustedhands/api';

export const CATEGORY_ICONS: Record<ServiceCategory, LucideIcon> = {
  CLEANING: Sparkles,
  COOKING: ChefHat,
  ERRANDS: ShoppingBasket,
  REPAIRS: Wrench,
  LAUNDRY: Shirt,
  DRIVER: Car,
  OTHER: Ellipsis,
};
