import { Version } from './Version.d';
export interface RawVersion {
    id: number;
    project: Project;
    name: string;
    description: string;
    status: string;
    due_date: string | null;
    sharing: string;
    wiki_page_title: string;
    created_on: string;
    updated_on: string;
  }

export interface Version{
    id: number;
    projectid: number;
    projectname: string;
    name: string;
    versionName: string;
    description: string;
    status: string;
    due_date: string | null;
    sharing: string;
    wiki_page_title: string;
    created_on: string;
    updated_on: string;
} 

export interface VersionWithReleaseNotes extends Version {
    versionText: string;
    wikiFullURL: string;
    
    ownerTeam: string;

    currentBuildSeries : string;
    currentReleaseBranch : string;

    buildFor: string;
    nextWeekReleaseVersion : string;
    versionDueDateText: string;
    versionDueDateWorkingDayText: string;
}