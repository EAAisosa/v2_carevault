export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      allergies: {
        Row: {
          created_at: string
          date_recorded: string
          facility_id: string | null
          facility_name: string
          id: string
          patient_id: string
          reaction: string
          reported_by: string
          severity: string
          substance: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          date_recorded: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          patient_id: string
          reaction?: string
          reported_by?: string
          severity?: string
          substance: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          date_recorded?: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          patient_id?: string
          reaction?: string
          reported_by?: string
          severity?: string
          substance?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "allergies_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allergies_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          facility_id: string | null
          facility_name: string
          id: string
          ip_address: string
          metadata: Json | null
          resource: string
          role: string
          status: string
          user_id: string
          user_name: string
        }
        Insert: {
          action: string
          created_at?: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          ip_address?: string
          metadata?: Json | null
          resource?: string
          role?: string
          status?: string
          user_id: string
          user_name?: string
        }
        Update: {
          action?: string
          created_at?: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          ip_address?: string
          metadata?: Json | null
          resource?: string
          role?: string
          status?: string
          user_id?: string
          user_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      encounters: {
        Row: {
          created_at: string
          diagnosis: string
          encounter_date: string
          facility_id: string | null
          facility_name: string
          id: string
          notes: string
          patient_id: string
          practitioner: string
          status: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          diagnosis?: string
          encounter_date: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          notes?: string
          patient_id: string
          practitioner?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          diagnosis?: string
          encounter_date?: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          notes?: string
          patient_id?: string
          practitioner?: string
          status?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "encounters_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "encounters_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      facilities: {
        Row: {
          created_at: string
          ehr_system: string
          facility_code: string | null
          id: string
          last_sync: string | null
          location: string
          name: string
          records_count: number
          state: string
          status: Database["public"]["Enums"]["facility_status"]
          updated_at: string
          uptime: number
        }
        Insert: {
          created_at?: string
          ehr_system?: string
          facility_code?: string | null
          id?: string
          last_sync?: string | null
          location: string
          name: string
          records_count?: number
          state: string
          status?: Database["public"]["Enums"]["facility_status"]
          updated_at?: string
          uptime?: number
        }
        Update: {
          created_at?: string
          ehr_system?: string
          facility_code?: string | null
          id?: string
          last_sync?: string | null
          location?: string
          name?: string
          records_count?: number
          state?: string
          status?: Database["public"]["Enums"]["facility_status"]
          updated_at?: string
          uptime?: number
        }
        Relationships: []
      }
      facility_connections: {
        Row: {
          auth_credentials: Json
          auth_type: string
          base_url: string
          created_at: string
          ehr_type: string
          facility_id: string
          fhir_version: string
          id: string
          is_active: boolean
          last_successful_sync: string | null
          sync_direction: string
          sync_interval_minutes: number
          updated_at: string
        }
        Insert: {
          auth_credentials?: Json
          auth_type?: string
          base_url: string
          created_at?: string
          ehr_type?: string
          facility_id: string
          fhir_version?: string
          id?: string
          is_active?: boolean
          last_successful_sync?: string | null
          sync_direction?: string
          sync_interval_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_credentials?: Json
          auth_type?: string
          base_url?: string
          created_at?: string
          ehr_type?: string
          facility_id?: string
          fhir_version?: string
          id?: string
          is_active?: boolean
          last_successful_sync?: string | null
          sync_direction?: string
          sync_interval_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "facility_connections_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string
          facility_id: string | null
          facility_name: string
          id: string
          patient_id: string
          reference_range: string
          result: string
          result_date: string
          status: string
          test: string
          unit: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          patient_id: string
          reference_range?: string
          result: string
          result_date: string
          status?: string
          test: string
          unit?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          facility_name?: string
          id?: string
          patient_id?: string
          reference_range?: string
          result?: string
          result_date?: string
          status?: string
          test?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      medications: {
        Row: {
          created_at: string
          dosage: string
          end_date: string | null
          facility_id: string | null
          facility_name: string
          frequency: string
          id: string
          name: string
          patient_id: string
          prescribed_by: string
          start_date: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          dosage?: string
          end_date?: string | null
          facility_id?: string | null
          facility_name?: string
          frequency?: string
          id?: string
          name: string
          patient_id: string
          prescribed_by?: string
          start_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          dosage?: string
          end_date?: string | null
          facility_id?: string | null
          facility_name?: string
          frequency?: string
          id?: string
          name?: string
          patient_id?: string
          prescribed_by?: string
          start_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "medications_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "medications_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          blood_group: string | null
          created_at: string
          date_of_birth: string
          facility_id: string | null
          first_name: string
          gender: string
          genotype: string | null
          id: string
          last_name: string
          lga: string | null
          nin: string
          phone: string | null
          state: string | null
          updated_at: string
        }
        Insert: {
          blood_group?: string | null
          created_at?: string
          date_of_birth: string
          facility_id?: string | null
          first_name: string
          gender: string
          genotype?: string | null
          id?: string
          last_name: string
          lga?: string | null
          nin: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Update: {
          blood_group?: string | null
          created_at?: string
          date_of_birth?: string
          facility_id?: string | null
          first_name?: string
          gender?: string
          genotype?: string | null
          id?: string
          last_name?: string
          lga?: string | null
          nin?: string
          phone?: string | null
          state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          facility_id: string | null
          full_name: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          facility_id?: string | null
          full_name?: string
          id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          facility_id?: string | null
          full_name?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      research_project_audit: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          id: string
          project_id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          id?: string
          project_id: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_project_audit_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_project_facilities: {
        Row: {
          created_at: string
          decided_at: string | null
          decided_by: string | null
          decision_notes: string | null
          facility_id: string
          id: string
          project_id: string
          status: string
        }
        Insert: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          facility_id: string
          id?: string
          project_id: string
          status?: string
        }
        Update: {
          created_at?: string
          decided_at?: string | null
          decided_by?: string | null
          decision_notes?: string | null
          facility_id?: string
          id?: string
          project_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "research_project_facilities_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "research_projects"
            referencedColumns: ["id"]
          },
        ]
      }
      research_projects: {
        Row: {
          carevault_decided_at: string | null
          carevault_decided_by: string | null
          carevault_decision: string | null
          carevault_notes: string | null
          completed_at: string | null
          created_at: string
          created_by: string
          date_from: string
          date_to: string
          description: string
          id: string
          purpose: string
          requested_facility_ids: string[]
          status: string
          submitted_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          carevault_decided_at?: string | null
          carevault_decided_by?: string | null
          carevault_decision?: string | null
          carevault_notes?: string | null
          completed_at?: string | null
          created_at?: string
          created_by: string
          date_from: string
          date_to: string
          description: string
          id?: string
          purpose: string
          requested_facility_ids?: string[]
          status?: string
          submitted_at?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          carevault_decided_at?: string | null
          carevault_decided_by?: string | null
          carevault_decision?: string | null
          carevault_notes?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string
          date_from?: string
          date_to?: string
          description?: string
          id?: string
          purpose?: string
          requested_facility_ids?: string[]
          status?: string
          submitted_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      staged_records: {
        Row: {
          admin_notes: string | null
          conflict_type: string | null
          created_at: string
          data_type: string
          fhir_payload: Json | null
          fhir_resource_type: string | null
          flagged: boolean
          id: string
          nin: string
          patient_name: string
          practitioner: string
          priority: string
          source_facility_id: string | null
          source_facility_name: string
          status: string
          submitted_at: string
          summary: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          conflict_type?: string | null
          created_at?: string
          data_type: string
          fhir_payload?: Json | null
          fhir_resource_type?: string | null
          flagged?: boolean
          id?: string
          nin: string
          patient_name: string
          practitioner: string
          priority?: string
          source_facility_id?: string | null
          source_facility_name: string
          status?: string
          submitted_at?: string
          summary: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          conflict_type?: string | null
          created_at?: string
          data_type?: string
          fhir_payload?: Json | null
          fhir_resource_type?: string | null
          flagged?: boolean
          id?: string
          nin?: string
          patient_name?: string
          practitioner?: string
          priority?: string
          source_facility_id?: string | null
          source_facility_name?: string
          status?: string
          submitted_at?: string
          summary?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staged_records_source_facility_id_fkey"
            columns: ["source_facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          completed_at: string | null
          created_at: string
          direction: string
          error_details: Json | null
          error_message: string | null
          facility_connection_id: string | null
          facility_id: string
          id: string
          max_retries: number
          next_retry_at: string | null
          records_failed: number
          records_processed: number
          retry_count: number
          started_at: string
          status: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          direction?: string
          error_details?: Json | null
          error_message?: string | null
          facility_connection_id?: string | null
          facility_id: string
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          records_failed?: number
          records_processed?: number
          retry_count?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          direction?: string
          error_details?: Json | null
          error_message?: string | null
          facility_connection_id?: string | null
          facility_id?: string
          id?: string
          max_retries?: number
          next_retry_at?: string | null
          records_failed?: number
          records_processed?: number
          retry_count?: number
          started_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_facility_connection_id_fkey"
            columns: ["facility_connection_id"]
            isOneToOne: false
            referencedRelation: "facility_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sync_logs_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vital_records: {
        Row: {
          created_at: string
          diastolic: number | null
          facility_id: string | null
          facility_name: string
          heart_rate: number | null
          id: string
          patient_id: string
          recorded_date: string
          spo2: number | null
          systolic: number | null
          temperature: number | null
          updated_at: string
          weight: number | null
        }
        Insert: {
          created_at?: string
          diastolic?: number | null
          facility_id?: string | null
          facility_name?: string
          heart_rate?: number | null
          id?: string
          patient_id: string
          recorded_date: string
          spo2?: number | null
          systolic?: number | null
          temperature?: number | null
          updated_at?: string
          weight?: number | null
        }
        Update: {
          created_at?: string
          diastolic?: number | null
          facility_id?: string | null
          facility_name?: string
          heart_rate?: number | null
          id?: string
          patient_id?: string
          recorded_date?: string
          spo2?: number | null
          systolic?: number | null
          temperature?: number | null
          updated_at?: string
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vital_records_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vital_records_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      patients_deidentified: {
        Row: {
          age_band: string | null
          blood_group: string | null
          facility_id: string | null
          gender: string | null
          genotype: string | null
          registered_on: string | null
          research_id: string | null
          state: string | null
        }
        Insert: {
          age_band?: never
          blood_group?: string | null
          facility_id?: string | null
          gender?: string | null
          genotype?: string | null
          registered_on?: never
          research_id?: never
          state?: string | null
        }
        Update: {
          age_band?: never
          blood_group?: string | null
          facility_id?: string | null
          gender?: string | null
          genotype?: string | null
          registered_on?: never
          research_id?: never
          state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patients_facility_id_fkey"
            columns: ["facility_id"]
            isOneToOne: false
            referencedRelation: "facilities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_facility_id: { Args: { _user_id: string }; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_any_admin: { Args: { _user_id: string }; Returns: boolean }
      is_researcher: { Args: { _user_id: string }; Returns: boolean }
      researcher_has_facility_access: {
        Args: { _facility_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "clinician"
        | "administrator"
        | "facility_admin"
        | "carevault_admin"
        | "researcher"
      facility_status: "online" | "degraded" | "offline"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "clinician",
        "administrator",
        "facility_admin",
        "carevault_admin",
        "researcher",
      ],
      facility_status: ["online", "degraded", "offline"],
    },
  },
} as const
