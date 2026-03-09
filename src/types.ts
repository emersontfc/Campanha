export type UserRole = 'Admin' | 'MedicalProfessional';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialty: string;
  is_verified: boolean;
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  location: string;
  start_date: string;
  end_date: string;
  active: boolean;
  created_at: string;
}

export interface Consultation {
  id: string;
  consultation_id: string;
  professional_id: string;
  campaign_id: string;
  professional_name: string;
  patient_name: string;
  patient_age: number;
  patient_phone: string;
  weight: number;
  height: number;
  bmi: number;
  blood_pressure: string; // e.g. "120/80"
  systolic: number;
  diastolic: number;
  glucose: number;
  ai_analysis: string;
  created_at: string;
}

export interface DashboardStats {
  total_screenings: number;
  hypertension_prevalence: number;
  diabetes_risk_prevalence: number;
  bmi_distribution: {
    underweight: number;
    normal: number;
    overweight: number;
    obese: number;
  };
  screenings_by_campaign: {
    campaign_name: string;
    count: number;
  }[];
}
