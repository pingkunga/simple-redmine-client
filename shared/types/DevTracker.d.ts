export interface DevTrackerRequest {
  tracker_id: number;

  project: Project;
  assignTo: ProjectMemberShip;
  
  targetVerion: Version;

  subject: string;
}

export interface ProgramSpecRequest {
  issue: ProgramSpec;
}
  
export interface ProgramSpec {
  project_id: number;
  tracker_id: number;
  status_id: number;
  priority_id: number;
  assigned_to_id: number;
  fixed_version_id: string;
  subject: string;
  description: string;
  start_date: string;
  due_date: string;
  custom_fields: CustomField[];
}
