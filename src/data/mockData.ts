export interface Patient {
  id: string;
  nin: string;
  firstName: string;
  lastName: string;
  gender: "male" | "female";
  dateOfBirth: string;
  phone: string;
  address: string;
  state: string;
  lga: string;
  bloodGroup: string;
  genotype: string;
  registeredHospital: string;
  lastSeen: string;
  matchConfidence?: number;
}

export interface Encounter {
  id: string;
  date: string;
  hospital: string;
  practitioner: string;
  type: string;
  diagnosis: string;
  notes: string;
  status: "completed" | "in-progress";
}

export interface VitalRecord {
  date: string;
  hospital: string;
  systolic: number;
  diastolic: number;
  heartRate: number;
  temperature: number;
  weight: number;
  spO2: number;
}

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  hospital: string;
  startDate: string;
  endDate?: string;
  status: "active" | "completed" | "discontinued";
}

export interface Allergy {
  substance: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe";
  reportedBy: string;
  hospital: string;
  dateRecorded: string;
}

export interface LabResult {
  test: string;
  result: string;
  unit: string;
  referenceRange: string;
  date: string;
  hospital: string;
  status: "normal" | "abnormal" | "critical";
}

export interface StagingRecord {
  id: string;
  patientName: string;
  nin: string;
  sourceHospital: string;
  dataType: string;
  submittedAt: string;
  status: "pending" | "approved" | "rejected" | "needs-review";
  conflictType?: string;
  priority: "low" | "medium" | "high" | "critical";
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  role: string;
  action: string;
  resource: string;
  hospital: string;
  ipAddress: string;
  status: "success" | "failure" | "warning";
}

export interface HospitalConnector {
  id: string;
  name: string;
  location: string;
  status: "online" | "offline" | "degraded";
  lastSync: string;
  recordsCount: number;
  uptime: number;
  ehrSystem: string;
}

export const patients: Patient[] = [
  {
    id: "pt-001",
    nin: "12345678901",
    firstName: "Adebayo",
    lastName: "Ogundimu",
    gender: "male",
    dateOfBirth: "1985-03-15",
    phone: "+234 801 234 5678",
    address: "12 Broad Street, Lagos Island",
    state: "Lagos",
    lga: "Lagos Island",
    bloodGroup: "O+",
    genotype: "AA",
    registeredHospital: "Lagos University Teaching Hospital",
    lastSeen: "2025-12-10",
  },
  {
    id: "pt-002",
    nin: "98765432109",
    firstName: "Amina",
    lastName: "Ibrahim",
    gender: "female",
    dateOfBirth: "1992-07-22",
    phone: "+234 803 987 6543",
    address: "45 Ahmadu Bello Way, Kaduna",
    state: "Kaduna",
    lga: "Kaduna North",
    bloodGroup: "A+",
    genotype: "AS",
    registeredHospital: "Ahmadu Bello University Teaching Hospital",
    lastSeen: "2026-01-05",
  },
  {
    id: "pt-003",
    nin: "55566677788",
    firstName: "Chukwuemeka",
    lastName: "Okafor",
    gender: "male",
    dateOfBirth: "1978-11-02",
    phone: "+234 805 555 6666",
    address: "8 New Market Road, Enugu",
    state: "Enugu",
    lga: "Enugu North",
    bloodGroup: "B+",
    genotype: "AA",
    registeredHospital: "University of Nigeria Teaching Hospital",
    lastSeen: "2025-11-28",
  },
];

export const encounters: Encounter[] = [
  { id: "enc-001", date: "2025-12-10", hospital: "Lagos University Teaching Hospital", practitioner: "Dr. Folake Adeleke", type: "Outpatient", diagnosis: "Hypertension Stage 2", notes: "BP elevated. Started on Amlodipine 5mg. Follow up in 2 weeks.", status: "completed" },
  { id: "enc-002", date: "2025-10-05", hospital: "General Hospital Ikeja", practitioner: "Dr. Emeka Nwankwo", type: "Emergency", diagnosis: "Acute Gastroenteritis", notes: "IV fluids administered. Oral rehydration salts prescribed. Resolved.", status: "completed" },
  { id: "enc-003", date: "2025-08-20", hospital: "Lagos University Teaching Hospital", practitioner: "Dr. Folake Adeleke", type: "Outpatient", diagnosis: "Type 2 Diabetes Mellitus", notes: "HbA1c at 7.8%. Metformin 500mg BD initiated.", status: "completed" },
  { id: "enc-004", date: "2025-06-12", hospital: "National Hospital Abuja", practitioner: "Dr. Ibrahim Musa", type: "Inpatient", diagnosis: "Malaria (P. falciparum)", notes: "Admitted for 3 days. IV Artesunate followed by ACTs. Discharged stable.", status: "completed" },
  { id: "enc-005", date: "2026-01-15", hospital: "General Hospital Ikeja", practitioner: "Dr. Emeka Nwankwo", type: "Outpatient", diagnosis: "Routine follow-up", notes: "BP controlled on current meds. Continue regimen.", status: "in-progress" },
];

export const vitals: VitalRecord[] = [
  { date: "2026-01-15", hospital: "General Hospital Ikeja", systolic: 135, diastolic: 88, heartRate: 76, temperature: 36.6, weight: 82, spO2: 98 },
  { date: "2025-12-10", hospital: "Lagos University Teaching Hospital", systolic: 158, diastolic: 98, heartRate: 84, temperature: 36.8, weight: 83, spO2: 97 },
  { date: "2025-10-05", hospital: "General Hospital Ikeja", systolic: 140, diastolic: 90, heartRate: 92, temperature: 38.2, weight: 81, spO2: 96 },
  { date: "2025-08-20", hospital: "Lagos University Teaching Hospital", systolic: 145, diastolic: 92, heartRate: 78, temperature: 36.5, weight: 84, spO2: 98 },
  { date: "2025-06-12", hospital: "National Hospital Abuja", systolic: 130, diastolic: 85, heartRate: 88, temperature: 39.1, weight: 80, spO2: 95 },
  { date: "2025-04-01", hospital: "Lagos University Teaching Hospital", systolic: 142, diastolic: 91, heartRate: 74, temperature: 36.7, weight: 83, spO2: 98 },
];

export const medications: Medication[] = [
  { name: "Amlodipine", dosage: "5mg", frequency: "Once daily", prescribedBy: "Dr. Folake Adeleke", hospital: "Lagos University Teaching Hospital", startDate: "2025-12-10", status: "active" },
  { name: "Metformin", dosage: "500mg", frequency: "Twice daily", prescribedBy: "Dr. Folake Adeleke", hospital: "Lagos University Teaching Hospital", startDate: "2025-08-20", status: "active" },
  { name: "Artemether-Lumefantrine", dosage: "80/480mg", frequency: "Twice daily x 3 days", prescribedBy: "Dr. Ibrahim Musa", hospital: "National Hospital Abuja", startDate: "2025-06-12", endDate: "2025-06-15", status: "completed" },
  { name: "Lisinopril", dosage: "10mg", frequency: "Once daily", prescribedBy: "Dr. Emeka Nwankwo", hospital: "General Hospital Ikeja", startDate: "2025-03-01", endDate: "2025-12-10", status: "discontinued" },
];

export const allergies: Allergy[] = [
  { substance: "Penicillin", reaction: "Urticaria (hives)", severity: "moderate", reportedBy: "Dr. Folake Adeleke", hospital: "Lagos University Teaching Hospital", dateRecorded: "2025-08-20" },
  { substance: "Sulfonamides", reaction: "Skin rash", severity: "mild", reportedBy: "Dr. Ibrahim Musa", hospital: "National Hospital Abuja", dateRecorded: "2025-06-12" },
  { substance: "NSAIDs (Ibuprofen)", reaction: "Bronchospasm", severity: "severe", reportedBy: "Dr. Emeka Nwankwo", hospital: "General Hospital Ikeja", dateRecorded: "2025-10-05" },
];

export const labResults: LabResult[] = [
  { test: "Fasting Blood Glucose", result: "142", unit: "mg/dL", referenceRange: "70-100", date: "2025-12-10", hospital: "Lagos University Teaching Hospital", status: "abnormal" },
  { test: "HbA1c", result: "7.8", unit: "%", referenceRange: "<6.5", date: "2025-08-20", hospital: "Lagos University Teaching Hospital", status: "abnormal" },
  { test: "Full Blood Count - WBC", result: "6.2", unit: "x10³/µL", referenceRange: "4.0-11.0", date: "2025-12-10", hospital: "Lagos University Teaching Hospital", status: "normal" },
  { test: "Malaria Parasite (RDT)", result: "Positive", unit: "", referenceRange: "Negative", date: "2025-06-12", hospital: "National Hospital Abuja", status: "critical" },
  { test: "Serum Creatinine", result: "1.0", unit: "mg/dL", referenceRange: "0.7-1.3", date: "2025-12-10", hospital: "Lagos University Teaching Hospital", status: "normal" },
  { test: "Lipid Panel - LDL", result: "145", unit: "mg/dL", referenceRange: "<100", date: "2025-08-20", hospital: "Lagos University Teaching Hospital", status: "abnormal" },
];

export const stagingRecords: StagingRecord[] = [
  { id: "stg-001", patientName: "Adebayo Ogundimu", nin: "12345678901", sourceHospital: "General Hospital Ikeja", dataType: "Encounter + Vitals", submittedAt: "2026-01-15T14:30:00Z", status: "pending", priority: "medium" },
  { id: "stg-002", patientName: "Amina Ibrahim", nin: "98765432109", sourceHospital: "National Hospital Abuja", dataType: "Lab Results", submittedAt: "2026-01-14T09:15:00Z", status: "needs-review", conflictType: "Conflicting allergy data", priority: "high" },
  { id: "stg-003", patientName: "Chukwuemeka Okafor", nin: "55566677788", sourceHospital: "University of Nigeria Teaching Hospital", dataType: "Medications", submittedAt: "2026-01-13T16:45:00Z", status: "approved", priority: "low" },
  { id: "stg-004", patientName: "Fatima Abdullahi", nin: "33344455566", sourceHospital: "Aminu Kano Teaching Hospital", dataType: "Encounter + Diagnosis", submittedAt: "2026-01-15T08:00:00Z", status: "pending", conflictType: "Duplicate encounter suspected", priority: "critical" },
  { id: "stg-005", patientName: "Oluwaseun Adeyemi", nin: "77788899900", sourceHospital: "University College Hospital Ibadan", dataType: "Vitals + Labs", submittedAt: "2026-01-12T11:20:00Z", status: "rejected", priority: "low" },
  { id: "stg-006", patientName: "Adebayo Ogundimu", nin: "12345678901", sourceHospital: "National Hospital Abuja", dataType: "Allergy Update", submittedAt: "2026-01-15T10:00:00Z", status: "needs-review", conflictType: "New allergy contradicts existing record", priority: "high" },
];

export const auditLogs: AuditLog[] = [
  { id: "aud-001", timestamp: "2026-01-15T14:32:00Z", user: "Dr. Emeka Nwankwo", role: "Clinician", action: "PATIENT_SEARCH", resource: "Patient/pt-001", hospital: "General Hospital Ikeja", ipAddress: "41.58.xx.xx", status: "success" },
  { id: "aud-002", timestamp: "2026-01-15T14:33:00Z", user: "Dr. Emeka Nwankwo", role: "Clinician", action: "RECORD_VIEW", resource: "Patient/pt-001/encounters", hospital: "General Hospital Ikeja", ipAddress: "41.58.xx.xx", status: "success" },
  { id: "aud-003", timestamp: "2026-01-15T10:05:00Z", user: "Admin Bello", role: "NHRIRP Admin", action: "MERGE_APPROVE", resource: "StagingRecord/stg-003", hospital: "NHRIRP Central", ipAddress: "105.112.xx.xx", status: "success" },
  { id: "aud-004", timestamp: "2026-01-14T22:15:00Z", user: "Dr. Aisha Mohammed", role: "Clinician", action: "BREAK_GLASS_ACCESS", resource: "Patient/pt-002", hospital: "Aminu Kano Teaching Hospital", ipAddress: "41.73.xx.xx", status: "warning" },
  { id: "aud-005", timestamp: "2026-01-14T18:00:00Z", user: "System", role: "System", action: "CONNECTOR_SYNC", resource: "Connector/hosp-005", hospital: "University College Hospital Ibadan", ipAddress: "—", status: "failure" },
  { id: "aud-006", timestamp: "2026-01-14T15:30:00Z", user: "IT Admin Okafor", role: "Hospital IT Admin", action: "USER_ROLE_UPDATE", resource: "User/usr-012", hospital: "University of Nigeria Teaching Hospital", ipAddress: "41.190.xx.xx", status: "success" },
];

export const hospitalConnectors: HospitalConnector[] = [
  { id: "hosp-001", name: "Lagos University Teaching Hospital", location: "Lagos", status: "online", lastSync: "2026-01-15T14:00:00Z", recordsCount: 245680, uptime: 99.8, ehrSystem: "OpenMRS" },
  { id: "hosp-002", name: "General Hospital Ikeja", location: "Lagos", status: "online", lastSync: "2026-01-15T14:30:00Z", recordsCount: 189340, uptime: 99.5, ehrSystem: "OpenMRS" },
  { id: "hosp-003", name: "National Hospital Abuja", location: "FCT", status: "online", lastSync: "2026-01-15T13:45:00Z", recordsCount: 312450, uptime: 99.9, ehrSystem: "Bahmni" },
  { id: "hosp-004", name: "Ahmadu Bello University Teaching Hospital", location: "Kaduna", status: "degraded", lastSync: "2026-01-15T10:00:00Z", recordsCount: 178920, uptime: 94.2, ehrSystem: "OpenMRS" },
  { id: "hosp-005", name: "University College Hospital Ibadan", location: "Oyo", status: "offline", lastSync: "2026-01-14T08:00:00Z", recordsCount: 267100, uptime: 87.3, ehrSystem: "DHIS2" },
  { id: "hosp-006", name: "University of Nigeria Teaching Hospital", location: "Enugu", status: "online", lastSync: "2026-01-15T14:15:00Z", recordsCount: 156780, uptime: 98.7, ehrSystem: "Bahmni" },
  { id: "hosp-007", name: "Aminu Kano Teaching Hospital", location: "Kano", status: "online", lastSync: "2026-01-15T14:20:00Z", recordsCount: 203450, uptime: 99.1, ehrSystem: "OpenMRS" },
];

export const dashboardStats = {
  totalPatients: 1_553_720,
  totalEncounters: 4_892_340,
  connectedHospitals: 7,
  pendingMerges: 14,
  todaySearches: 2847,
  activeAlerts: 3,
};
