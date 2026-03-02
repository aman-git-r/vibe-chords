import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * cn() — merges Tailwind class names with support for conditionals and conflict resolution.
 * Used by shadcn/ui components. Combines clsx (conditionals) + tailwind-merge (deduping).
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
