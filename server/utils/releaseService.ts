import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";
import { VersionWithReleaseNotes } from "~~/shared/types/Version";

export async function getThisWeekVersions(event: any, projectId: number): Promise<VersionWithReleaseNotes[]> {
  const config = useRuntimeConfig();
  const { createBaseRedmineHeader, mapRawVersionToVersion } = useRedmineAPI();

  const dueDateWorkingDayText = (version: Version): string => {
    if (!version.due_date) 
      return '';

    const date = new Date(version.due_date);
    const day = date.getDay();          // 0 (Sun) to 6 (Sat)
    if (day !== 5) {                    // If not Friday
        const diff = (day + 2) % 7;     // Calculate difference to previous Friday
        date.setDate(date.getDate() - diff);
    }

    const d = date.getDate().toString().padStart(2, '0');
    const m = date.toLocaleString('en-GB', { month: 'short' }).toUpperCase();
    const y = date.getFullYear();
                
    return `${d}-${m}-${y}`;
  }

  const filterThisWeekVersion = (versions: Version[], versionMode: "PREVIOUS" | "NEXT") => {
    const now = new Date();
    if (versionMode === "PREVIOUS") {
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      return versions.filter(version => {
        if (!version.due_date) return false;
        const dueDate = new Date(version.due_date);
        return dueDate > startDate && dueDate <= endDate && dueDate.getDay() === 0;
      });
    }
    
    // NEXT
    const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
    
    return versions.filter(version => {
      if (!version.due_date) return false;
      const dueDate = new Date(version.due_date);
      return dueDate > startDate && dueDate <= endDate && dueDate.getDay() === 0;
    });
  }

  const fillVersionReleaseNotes = (version: Version): VersionWithReleaseNotes => {
    let versionText = version.name;
    if (version.description) {
      versionText += ` (${version.description})`;
    }

    let versionDueDateText = "";
    let versionDueDateWorkingDayText = "";
    if (version.due_date) {
      const d = new Date(version.due_date);
      versionDueDateText = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        
      versionDueDateWorkingDayText = dueDateWorkingDayText(version);
    }

    const parts = version.name ? version.name.split('.') : [];
    const majorV = parseInt(parts[0] || '0', 10) || 0;
    const minorV = parseInt(parts[1] || '0', 10) || 0;
    const patchV = parseInt(parts[2] || '0', 10) || 0;
    const buildC = parseInt(parts[3] || '0', 10) || 0;

    const ownerTeam = (patchV % 2 === 0) ? 'Team Invest' : 'Team TM';
    const currentBuildSeries = `${majorV}.${minorV}.${patchV}.X`;
    const currentReleaseBranch = `release/${majorV}.${minorV}.${patchV}`;

    let buildFor = '';
    let nextWeekReleaseVersion = '';
    if (version.description && /PROD/i.test(version.description)) {
      buildFor = '[CUSTOMER (PRODUCTION)]';
      nextWeekReleaseVersion = `${majorV}.${minorV}.${patchV + 1}.0`;
    } else {
      nextWeekReleaseVersion = `${majorV}.${minorV}.${patchV}.${buildC + 1}`;
    }

    const wikiName = version.name ? version.name.replace(/\./g, '') : '';
    const wikiFullURL = `${wikiName}${versionDueDateText}${buildFor ? '-CUSTOMER-VERSION' : ''}`;

    const result: VersionWithReleaseNotes = {
      ...version,
      versionText,
      wikiFullURL,
      ownerTeam,
      currentBuildSeries,
      currentReleaseBranch,
      buildFor,
      nextWeekReleaseVersion,
      versionDueDateText,
      versionDueDateWorkingDayText
    };

    return result;
  }

  const url = `${config.public.redmineUrl}/projects/${projectId}/versions.json`;
  const req = getRequestHeaders(event);
  const headers = createBaseRedmineHeader(req);

  try {
    const response = await axios.get<VersionsResponse>(url, { headers });
    const versions: Version[] = response.data.versions.map(mapRawVersionToVersion);
    const thisWeekVersions = filterThisWeekVersion(versions, "NEXT");
    return thisWeekVersions.map(fillVersionReleaseNotes);
  } catch (error) {
    console.error('Error fetching versions:', error);
    throw error;
  }
}