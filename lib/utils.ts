import { type ClassValue, clsx } from "clsx";

export function cn(...inputs: ClassValue[]) {
    return clsx(inputs.filter(Boolean).join(' '));
}
