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

export function calculateFraminghamRisk(
  age: number,
  sex: 'M' | 'F',
  bmi: number,
  systolic: number,
  isTreated: boolean,
  isSmoker: boolean,
  hasDiabetes: boolean
): number {
  let points = 0;

  if (sex === 'M') {
    // Age
    if (age >= 30 && age <= 34) points += 0;
    else if (age >= 35 && age <= 39) points += 2;
    else if (age >= 40 && age <= 44) points += 5;
    else if (age >= 45 && age <= 49) points += 7;
    else if (age >= 50 && age <= 54) points += 8;
    else if (age >= 55 && age <= 59) points += 10;
    else if (age >= 60 && age <= 64) points += 11;
    else if (age >= 65 && age <= 69) points += 12;
    else if (age >= 70 && age <= 74) points += 14;
    else if (age >= 75) points += 15;

    // BMI
    if (bmi < 25) points += 0;
    else if (bmi >= 25 && bmi < 30) points += 1;
    else points += 2;

    // Systolic BP
    if (!isTreated) {
      if (systolic < 120) points += -2;
      else if (systolic < 130) points += 0;
      else if (systolic < 140) points += 1;
      else if (systolic < 160) points += 2;
      else points += 3;
    } else {
      if (systolic < 120) points += 0;
      else if (systolic < 130) points += 2;
      else if (systolic < 140) points += 3;
      else if (systolic < 160) points += 4;
      else points += 5;
    }

    // Smoker
    if (isSmoker) points += 4;

    // Diabetes
    if (hasDiabetes) points += 3;

    // Risk Conversion for Men
    const riskMap: Record<number, number> = {
      [-3]: 0, [-2]: 1.1, [-1]: 1.4, 0: 1.6, 1: 1.9, 2: 2.3, 3: 2.8, 4: 3.3, 5: 3.9,
      6: 4.7, 7: 5.6, 8: 6.7, 9: 7.9, 10: 9.4, 11: 11.2, 12: 13.2, 13: 15.6, 14: 18.4,
      15: 21.6, 16: 25.3, 17: 29.4, 18: 30
    };
    if (points < -3) return 0;
    if (points > 18) return 30;
    return riskMap[points] || 0;

  } else {
    // Age
    if (age >= 30 && age <= 34) points += 0;
    else if (age >= 35 && age <= 39) points += 2;
    else if (age >= 40 && age <= 44) points += 4;
    else if (age >= 45 && age <= 49) points += 5;
    else if (age >= 50 && age <= 54) points += 7;
    else if (age >= 55 && age <= 59) points += 8;
    else if (age >= 60 && age <= 64) points += 9;
    else if (age >= 65 && age <= 69) points += 10;
    else if (age >= 70 && age <= 74) points += 11;
    else if (age >= 75) points += 12;

    // BMI
    if (bmi < 25) points += 0;
    else if (bmi >= 25 && bmi < 30) points += 1;
    else points += 2;

    // Systolic BP
    if (!isTreated) {
      if (systolic < 120) points += -3;
      else if (systolic < 130) points += 0;
      else if (systolic < 140) points += 1;
      else if (systolic < 160) points += 2;
      else points += 4;
    } else {
      if (systolic < 120) points += -1;
      else if (systolic < 130) points += 2;
      else if (systolic < 140) points += 3;
      else if (systolic < 160) points += 5;
      else points += 6;
    }

    // Smoker
    if (isSmoker) points += 3;

    // Diabetes
    if (hasDiabetes) points += 4;

    // Risk Conversion for Women
    const riskMap: Record<number, number> = {
      [-2]: 0, [-1]: 1.0, 0: 1.2, 1: 1.5, 2: 1.7, 3: 2.0, 4: 2.4, 5: 2.8, 6: 3.3,
      7: 3.9, 8: 4.5, 9: 5.3, 10: 6.3, 11: 7.3, 12: 8.6, 13: 10.0, 14: 11.7, 15: 13.7,
      16: 15.9, 17: 18.5, 18: 21.5, 19: 24.8, 20: 28.5, 21: 30
    };
    if (points < -2) return 0;
    if (points > 21) return 30;
    return riskMap[points] || 0;
  }
}
