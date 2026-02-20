import axios from "axios";
import useRedmineAPI from "~/composables/useRedmineAPI";
import { VersionWithReleaseNotes } from "~~/shared/types/Version";


export default defineEventHandler<{query: { projectId: Number } }>(async (event) => {
  

    const filterThisWeekVersion = (versions: Version[], versionMode: "PREVIOUS" | "NEXT") => {
      /*
       if ($versionMode -eq "PREVIOUS")
    {
        $startDate = (Get-Date).AddDays(-7).Date
        $endDate  = (Get-Date).Date
    }
    else
    {
        $startDate = (Get-Date)
        $endDate  = (Get-Date).AddDays(+7).Date
    }

        $ThisWeekVersion = $TSYVersions | where { (([DateTime]$_.due_date).Date -le $endDate.Date) -and ($([DateTime]$_.due_date).Date -gt $startDate.Date) -and ($([DateTime]$_.due_date).Date.DayOfWeek.value__ -eq 0) } | select id, name, description, due_date

      */

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
      if (version.due_date) {
        const d = new Date(version.due_date);
        versionDueDateText = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
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
      };

      return result;
    }

    //===================================================
    const versionsData: Version[] = [];
    const config = useRuntimeConfig(event);
    const { createBaseRedmineHeader, mapRawVersionToVersion } = useRedmineAPI();

    // ================================
    // Check Query Parameter
    const query = getQuery(event);

    let filterProjectId: number = 858;
    if (query.projectId) {
        filterProjectId= 858
    }
    // ================================

    const url = `${config.public.redmineUrl}/projects/${filterProjectId}/versions.json`;
    const req = getRequestHeaders(event);
    const headers = createBaseRedmineHeader(req);

    try {
      const response = await axios.get<VersionsResponse>(url, { headers });
      //console.log(response.data.issues);

      const versions: Version[] = response.data.versions.map(mapRawVersionToVersion);
      versionsData.push(...versions);

      // Filter This Week Versions
      const thisWeekVersions = filterThisWeekVersion(versionsData, "NEXT");
      versionsData.length = 0; // Clear the array
      thisWeekVersions.forEach(v => {
        versionsData.push(fillVersionReleaseNotes(v));
      });
    } 
    catch (error) {
        console.error('Error fetching issues:', error);
        throw error;
    }
    return versionsData;

    
});