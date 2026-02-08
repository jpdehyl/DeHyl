// Crew Management Types

export type CrewRole = 'superintendent' | 'foreman' | 'laborer' | 'driver' | 'operator' | 'admin';
export type EmploymentType = 'employee' | 'subcontractor';
export type CrewStatus = 'active' | 'inactive' | 'on_leave';
export type CertificationStatus = 'valid' | 'expired' | 'pending';

export interface CrewMember {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  role: CrewRole | null;
  employment_type: EmploymentType;
  company: string | null;
  hourly_rate: number | null; // PRIVATE - only for admin
  hire_date: string | null;
  termination_date: string | null;
  status: CrewStatus;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Safe version without hourly_rate for non-admin views
export interface CrewMemberPublic extends Omit<CrewMember, 'hourly_rate'> {}

export interface Certification {
  id: string;
  crew_member_id: string;
  name: string;
  cert_number: string | null;
  issuing_body: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  document_url: string | null;
  status: CertificationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TimeEntry {
  id: string;
  crew_member_id: string;
  project_id: string | null;
  daily_log_id: string | null;
  date: string;
  hours: number;
  start_time: string | null;
  end_time: string | null;
  task_description: string | null;
  area: string | null;
  billable: boolean;
  billed: boolean;
  notes: string | null;
  source: 'manual' | 'daily_log' | 'import';
  source_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectAssignment {
  id: string;
  crew_member_id: string;
  project_id: string;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// Extended types with relations
export interface CrewMemberWithDetails extends CrewMember {
  certifications?: Certification[];
  current_projects?: ProjectAssignment[];
  total_hours_this_week?: number;
}

export interface TimeEntryWithDetails extends TimeEntry {
  crew_member?: { id: string; name: string };
  project?: { id: string; code: string; description: string };
}

// API Response types
export interface CrewListResponse {
  crew: CrewMemberPublic[];
  total: number;
}

export interface CrewDetailResponse {
  crew_member: CrewMember; // Full details including hourly_rate for admin
  certifications: Certification[];
  assignments: (ProjectAssignment & { project?: { code: string; description: string } })[];
  recent_time_entries: TimeEntryWithDetails[];
  stats: {
    hours_this_week: number;
    hours_this_month: number;
    active_projects: number;
    expiring_certs: number;
  };
}

export interface TimeEntriesResponse {
  entries: TimeEntryWithDetails[];
  total_hours: number;
  date_range: { from: string; to: string };
}

// Form types
export interface CreateCrewMemberInput {
  name: string;
  phone?: string;
  email?: string;
  role?: CrewRole;
  employment_type?: EmploymentType;
  company?: string;
  hourly_rate?: number;
  hire_date?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  notes?: string;
}

export interface CreateTimeEntryInput {
  crew_member_id: string;
  project_id?: string;
  daily_log_id?: string;
  date: string;
  hours: number;
  start_time?: string;
  end_time?: string;
  task_description?: string;
  area?: string;
  billable?: boolean;
  notes?: string;
}

export interface CreateCertificationInput {
  crew_member_id: string;
  name: string;
  cert_number?: string;
  issuing_body?: string;
  issue_date?: string;
  expiry_date?: string;
  document_url?: string;
  notes?: string;
}
