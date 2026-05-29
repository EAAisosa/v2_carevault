import type { Patient } from "@repo/types";

export interface PatientResult extends Patient {
  facilityName?: string;
  matchConfidence?: number;
}

export interface PatientSearchResponse {
  data: PatientResult[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface PatientSearchVars {
  q?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  phone?: string;
  gender?: string;
}
