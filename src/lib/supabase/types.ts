// Database types for Supabase tables

export type TrackType = 'short-form' | 'long-form' | 'builder' | 'sales';

export type CertificationStatus = 'pending' | 'submitted' | 'approved' | 'rejected';

export type TitleType = 'daily' | 'weekly';

export interface User {
  id: string;
  discord_id: string;
  discord_username: string;
  discord_discriminator: string | null;
  discord_avatar_url: string | null;
  discord_global_name: string | null;
  email: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  name: string;
  type: TrackType;
  description: string | null;
  certification_days: string[];
  deadline_day: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTrack {
  id: string;
  user_id: string;
  track_id: string;
  enrolled_at: string;
  is_active: boolean;
  dropout_warnings: number;
  last_warning_at: string | null;
  created_at: string;
  updated_at: string;
  track?: Track; // Joined data
}

export interface Certification {
  id: string;
  user_id: string;
  track_id: string;
  user_track_id: string;
  certification_url: string;
  certification_date: string; // DATE format
  submitted_at: string;
  status: CertificationStatus;
  notes: string | null;
  admin_override: boolean;
  admin_override_by: string | null;
  admin_override_at: string | null;
  created_at: string;
  updated_at: string;
  track?: Track; // Joined data
}

export interface Title {
  id: string;
  name: string;
  description: string | null;
  type: TitleType;
  track_type: TrackType | null;
  required_streak: number;
  badge_icon: string | null;
  badge_color: string | null;
  display_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserTitle {
  id: string;
  user_id: string;
  title_id: string;
  track_id: string | null;
  earned_at: string;
  created_at: string;
  title?: Title; // Joined data
  track?: Track; // Joined data
}

export interface AdminUser {
  id: string;
  user_id: string;
  discord_id: string;
  role: string;
  permissions: string[];
  granted_by: string | null;
  granted_at: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MissionContent {
  id: string;
  track_id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  track?: Track; // Joined data
}

// Leaderboard entry type
export interface LeaderboardEntry {
  user_id: string;
  discord_username: string;
  discord_avatar_url: string | null;
  total_certifications: number;
  current_streak: number;
  rank: number;
  titles?: UserTitle[]; // Optional joined titles
}

// API response types
export interface ApiResponse<T> {
  data: T | null;
  error: string | null;
}

// Calendar certification record
export interface CalendarCertification {
  date: string; // YYYY-MM-DD
  certified: boolean;
  certification?: Certification;
}

