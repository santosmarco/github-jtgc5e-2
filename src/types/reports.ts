import type { Tables } from "~/lib/supabase/database.types";

export type ReportSection = {
  id: string;
  title: string;
  summary: string;
  direction: "positive" | "negative";
};

export type MomentData = {
  id: string;
  video_api_id: string;
  _internal_thumbs_down?: number;
  transcript?: string;
  start_time?: number;
  end_time?: number;
  video_name?: string;
  confidence?: number;
  created_at?: string;
  updated_at?: string;
};

export type ReportMoment = {
  report_section_id: string;
  score?: number;
  report_section_confidence?: number;
  moment: MomentData;
};

export type ReportGoal = {
  goal_id: string;
  goal: Tables<"goals">;
};

export type UserProfile = {
  nickname: string;
  id?: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
};

export type ReportComment = Tables<"report_comments"> & {
  user: UserProfile;
};

export type Report = {
  id: string;
  report_sections: ReportSection[];
  report_moments: ReportMoment[];
  report_goals: ReportGoal[];
  report_comments: ReportComment[];
};

export type GroupReports = {
  reports: Report[];
};
