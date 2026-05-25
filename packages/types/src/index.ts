// ── Auth & Users ───────────────────────────────────────────────────────────

export type AppRole = "clinician" | "facility_admin" | "carevault_admin" | "researcher";

export interface AuthUser {
  id: string;
  email: string;
  role: AppRole;
  facilityId: string | null;
  facilityName?: string;
  fullName: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  role: AppRole;
  facilityId: string | null;
  facilityName: string | null;
  banned: boolean;
  confirmed: boolean;
  lastSignIn: string | null;
  createdAt: string;
}

// ── Facilities ─────────────────────────────────────────────────────────────

export type FacilityStatus = "online" | "degraded" | "offline";

export interface Facility {
  id: string;
  name: string;
  location: string;
  state: string;
  facilityCode: string | null;
  ehrSystem: string;
  status: FacilityStatus;
  uptime: number;
  recordsCount: number;
  lastSync: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Patients ───────────────────────────────────────────────────────────────

export interface Patient {
  id: string;
  nin: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  gender: "Male" | "Female";
  phone: string | null;
  bloodGroup: string | null;
  genotype: string | null;
  facilityId: string | null;
  lga: string | null;
  state: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PatientWithFacility extends Patient {
  facility: Pick<Facility, "id" | "name"> | null;
}

// ── Clinical ───────────────────────────────────────────────────────────────

export type EncounterStatus = "completed" | "in-progress";
export type MedicationStatus = "active" | "completed" | "discontinued";
export type AllergySeverity = "mild" | "moderate" | "severe";
export type LabStatus = "normal" | "abnormal" | "critical";

export interface Encounter {
  id: string;
  patientId: string;
  facilityId: string | null;
  facilityName: string;
  practitioner: string;
  encounterDate: string;
  type: string;
  diagnosis: string;
  notes: string;
  status: EncounterStatus;
  createdAt: string;
  updatedAt: string;
}

export interface VitalRecord {
  id: string;
  patientId: string;
  facilityId: string | null;
  facilityName: string;
  recordedDate: string;
  systolic: number | null;
  diastolic: number | null;
  heartRate: number | null;
  temperature: number | null;
  weight: number | null;
  spo2: number | null;
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  facilityId: string | null;
  facilityName: string;
  name: string;
  dosage: string;
  frequency: string;
  prescribedBy: string;
  startDate: string;
  endDate: string | null;
  status: MedicationStatus;
  createdAt: string;
}

export interface Allergy {
  id: string;
  patientId: string;
  facilityId: string | null;
  facilityName: string;
  substance: string;
  reaction: string;
  severity: AllergySeverity;
  reportedBy: string;
  dateRecorded: string;
  createdAt: string;
}

export interface LabResult {
  id: string;
  patientId: string;
  facilityId: string | null;
  facilityName: string;
  test: string;
  result: string;
  unit: string;
  referenceRange: string;
  resultDate: string;
  status: LabStatus;
  createdAt: string;
}

export interface PatientRecord {
  patient: PatientWithFacility;
  encounters: Encounter[];
  vitalRecords: VitalRecord[];
  medications: Medication[];
  allergies: Allergy[];
  labResults: LabResult[];
}

// ── Staged Records ─────────────────────────────────────────────────────────

export type StagedRecordStatus = "pending" | "approved" | "rejected" | "needs-review";
export type StagedRecordPriority = "low" | "medium" | "high" | "critical";

export interface StagedRecord {
  id: string;
  patientName: string;
  nin: string;
  sourceFacilityId: string | null;
  sourceFacilityName: string;
  dataType: string;
  submittedAt: string;
  status: StagedRecordStatus;
  priority: StagedRecordPriority;
  summary: string;
  practitioner: string;
  conflictType: string | null;
  flagged: boolean;
  adminNotes: string | null;
  fhirResourceType: string | null;
  fhirPayload: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ── Facility Connections ───────────────────────────────────────────────────

export type AuthType = "basic" | "oauth2" | "api_key";
export type SyncDirection = "pull" | "push" | "bidirectional";
export type SyncStatus = "pending" | "in_progress" | "completed" | "failed" | "retrying";

export interface FacilityConnection {
  id: string;
  facilityId: string;
  ehrType: string;
  baseUrl: string;
  authType: AuthType;
  fhirVersion: string;
  syncDirection: SyncDirection;
  syncIntervalMinutes: number;
  isActive: boolean;
  lastSuccessfulSync: string | null;
  createdAt: string;
  updatedAt: string;
  // auth_credentials intentionally excluded — never sent to frontend
}

export interface SyncLog {
  id: string;
  facilityConnectionId: string | null;
  facilityId: string;
  direction: "inbound" | "outbound";
  status: SyncStatus;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage: string | null;
  retryCount: number;
  maxRetries: number;
  nextRetryAt: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
}

// ── Audit Logs ─────────────────────────────────────────────────────────────

export type AuditAction =
  | "PATIENT_SEARCH"
  | "RECORD_VIEW"
  | "BREAK_GLASS_ACCESS"
  | "STAGING_APPROVE"
  | "STAGING_REJECT"
  | "STAGING_FLAG"
  | "STAGING_NEEDS_REVIEW"
  | "USER_INVITE"
  | "USER_DEACTIVATE"
  | "USER_ACTIVATE"
  | "USER_DELETE"
  | "USER_ROLE_CHANGE"
  | "USER_PASSWORD_RESET"
  | "USER_INVITE_RESENT"
  | "FACILITY_STATUS_CHANGE"
  | "FACILITY_CONNECTION_CREATE"
  | "FACILITY_CONNECTION_UPDATE"
  | "FACILITY_CONNECTION_DELETE"
  | "SYNC_TRIGGERED";

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  role: string;
  action: AuditAction;
  resource: string;
  facilityId: string | null;
  facilityName: string;
  ipAddress: string;
  status: "success" | "failure" | "warning";
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

// ── Research ───────────────────────────────────────────────────────────────

export type ResearchProjectStatus =
  | "draft"
  | "pending_carevault"
  | "pending_facilities"
  | "approved"
  | "rejected"
  | "completed";

export interface ResearchProject {
  id: string;
  title: string;
  description: string;
  purpose: string;
  requestedFacilityIds: string[];
  dateFrom: string;
  dateTo: string;
  status: ResearchProjectStatus;
  createdBy: string;
  submittedAt: string | null;
  carevaultDecision: string | null;
  carevaultNotes: string | null;
  carevaultDecidedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  facilities?: ResearchProjectFacility[];
}

export interface ResearchProjectFacility {
  id: string;
  projectId: string;
  facilityId: string;
  status: "pending" | "approved" | "rejected";
  decisionNotes: string | null;
  decidedAt: string | null;
  createdAt: string;
}

// ── Dashboard ──────────────────────────────────────────────────────────────

export interface DashboardStats {
  totalPatients: number;
  totalFacilities: number;
  pendingStagedRecords: number;
  totalUsers: number;
  recentSyncLogs: SyncLog[];
  facilityStatuses: { online: number; degraded: number; offline: number };
}

// ── API Shared Types ───────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

export interface ApiSuccess<T = void> {
  ok: true;
  data?: T;
  message?: string;
}
