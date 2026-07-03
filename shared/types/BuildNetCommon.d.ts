export interface BuildNetCommonOptions {
  executeTest: boolean;
  sonarAnalysis: boolean;
  publishDc: boolean;
  publishDr: boolean;
  buildPurpose: string;
}

export interface BuildNetCommonRequest {
  tracker_id: number;
  project: Project;
  assignTo: ProjectMemberShip;
  targetVerion: Version;
  subject: string;
  options: BuildNetCommonOptions;
}