import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateBMI(weight: number, heightCm: number) {
  if (!weight || !heightCm) return 0;
  const heightM = heightCm / 100;
  return weight / (heightM * heightM);
}

export function generateConsultationId() {
  const chars = "0123456789";
  let result = "AL";
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatMozPhone(value: string) {
  const cleaned = value.replace(/\D/g, "");
  if (cleaned.startsWith("258")) {
    return "+" + cleaned;
  }
  return "+258" + cleaned;
}
