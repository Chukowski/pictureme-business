import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Calculates if a user is 18 or older based on their birth date
 * @param birthDate Date string in YYYY-MM-DD or ISO format
 * @returns boolean
 */
export function isUserAdult(birthDate?: string | null): boolean {
  if (!birthDate) return false;

  const today = new Date();
  const birth = new Date(birthDate);
  
  if (isNaN(birth.getTime())) return false;

  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }

  return age >= 18;
}
