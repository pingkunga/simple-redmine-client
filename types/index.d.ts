// Global type declarations - auto available everywhere

// Re-export all types as global
export * from './Version.d';
export * from './Issue.d';
export * from './Project.d';
export * from './DevTracker';
export * from './IssuesResponse.d';
export * from './VersionsResponse.d';
export * from './ProjectResponse';
export * from './ProjectMemberShipResponse';

// Declare global types
declare global {
  // Version types
  type Version = import('./Version.d').Version;
  type RawVersion = import('./Version.d').RawVersion;

  // Issue types  
  type Issue = import('./Issue.d').Issue;
  type RawIssue = import('./Issue.d').RawIssue;

  // Project types
  type Project = import('./Project.d').Project;
  type RawProject = import('./Project.d').RawProject;
  type ProjectMemberShip = import('./Project.d').ProjectMemberShip;
  type RawMembership = import('./Project.d').RawMembership;

  // DevTracker types
  type DevTrackerRequest = import('./DevTracker').DevTrackerRequest;
  type ProgramSpec = import('./DevTracker').ProgramSpec;
}
