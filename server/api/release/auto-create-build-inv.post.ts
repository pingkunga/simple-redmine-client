import { getThisWeekVersions } from "../../utils/releaseService";
import { readConfigJson } from "../../utils/projectConfig";
import type { BuildInvSetRequest } from "~~/shared/types/BuildInvSet";

export default defineEventHandler(async (event) => {
    const query = getQuery(event);
    
    // Default project ID if none provided (e.g., 858 for Investment .NET)
    let filterProjectId: number = 858;
    if (query.projectId) {
        filterProjectId = Number(query.projectId);
    }

    try {
        // Get weekly versions
        const versions = await getThisWeekVersions(event, filterProjectId);
        
        const results = [];
        const currentHeaders = getRequestHeaders(event);

        // Process each version found
        for (const version of versions) {
            // Determine layout: Customer if buildFor is set, otherwise Internal
            const isCustomer = !!version.buildFor;
            const targetLayout = isCustomer ? 'WeeklyBuild-Customer' : 'WeeklyBuild-Internal';
            console.log(`Processing version ${version.name} with layout ${targetLayout}`);
            
            // read template from target layout if exists, otherwise use the default template
            const layoutTemplateName = `buildinvset/${targetLayout}/build_parameters.json`;
            const template = readConfigJson<BuildInvSetRequest>(layoutTemplateName);
            if (!template) {
                throw createError({
                    statusCode: 500,
                    statusMessage: `Build parameter template not found in /public/IssueTemplate/${layoutTemplateName}`,
                });
            }
            
            // Prepare the request for the buildinvset API
            const buildRequest: BuildInvSetRequest = {
                ...template,
                project: { 
                    id: version.projectid, 
                    name: version.projectname 
                },
                targetVersion: version,
                buildBranch: version.currentReleaseBranch,
                layout: targetLayout,
                startDate: new Date().toISOString().split('T')[0],
                endDate: version.due_date || new Date().toISOString().split('T')[0],
                thisweekRelease: true
            };

            // Call /api/buildinvset internally
            try {
                const response = await $fetch('/api/buildinvset', {
                    method: 'POST',
                    body: { buildInvSetRequest: buildRequest },
                    headers: currentHeaders
                });

                results.push({
                    version: version.name,
                    versionText: version.versionText,
                    maintainer: version.ownerTeam,
                    layout: targetLayout,
                    status: 'success',
                    data: response
                });
            } catch (err: any) {
                console.error(`Failed to auto-create build for version ${version.name}:`, err);
                results.push({
                    version: version.name,
                    layout: targetLayout,
                    status: 'error',
                    message: err.message
                });
            }
        }

        return {
            success: true,
            totalProcessed: versions.length,
            results: results
        };

    } catch (error) {
        console.error('Error in auto-create-build-inv API:', error);
        throw error;
    }
});
