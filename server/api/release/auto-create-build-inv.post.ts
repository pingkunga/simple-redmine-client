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
        // 1. Get weekly versions
        const versions = await getThisWeekVersions(event, filterProjectId);
        
        // 2. Read the base template from buildinvset/Default/build_parameters.json
        const template = readConfigJson<BuildInvSetRequest>('buildinvset/Default/build_parameters.json');
        
        if (!template) {
            throw createError({
                statusCode: 500,
                statusMessage: 'Build parameter template not found in /public/IssueTemplate/buildinvset/Default/build_parameters.json',
            });
        }

        const results = [];
        const currentHeaders = getRequestHeaders(event);

        // 3. Process each version found
        for (const version of versions) {
            // Determine layout: Customer if buildFor is set, otherwise Internal
            const isCustomer = !!version.buildFor;
            const targetLayout = isCustomer ? 'WeeklyBuild-Customer' : 'WeeklyBuild-Internal';

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

            // 4. Call /api/buildinvset internally
            try {
                const response = await $fetch('/api/buildinvset', {
                    method: 'POST',
                    body: { buildInvSetRequest: buildRequest },
                    headers: currentHeaders
                });

                results.push({
                    version: version.name,
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
