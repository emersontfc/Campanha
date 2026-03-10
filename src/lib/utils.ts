import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateBMI(weight: number, heightCm: number) {
  if (!weight || !heightCm) return 0;
  const heightM = heightCm / 100;
  const bmi = weight / (heightM * heightM);
  return Number(bmi.toFixed(1));
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
  let cleaned = value.replace(/\D/g, "");
  
  // Se começar com 00258, remover os 00
  if (cleaned.startsWith("00258")) {
    cleaned = cleaned.substring(2);
  }
  // Se começar com 0, remover o 0 (ex: 084 -> 84)
  else if (cleaned.startsWith("0") && !cleaned.startsWith("00")) {
    cleaned = cleaned.substring(1);
  }

  if (cleaned.startsWith("258")) {
    return "+" + cleaned;
  }
  return "+258" + cleaned;
}
