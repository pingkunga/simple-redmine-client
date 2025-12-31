import useClientUtil from "./useClientUtil";



export default () => {
    const YOUR_OWN_REDMINE_API = "x-my-redmine-api-key"; 

    enum TRACKER {
        PROGRAM_SPEC = 11,
        FEATURE = 14,
        DEFECT = 8,
        BUILD_REQUEST = 6,
    }
    
    const devTrackerMap = new Map<number, string>(
        [
            [TRACKER.PROGRAM_SPEC, "Program Spec"],
            [TRACKER.FEATURE, "Feature"],
            [TRACKER.DEFECT, "Defect"]
        ]
    );

    const devTrackers = [...devTrackerMap].map(([id, name]) => ({ id, name }));

    const buildTrackerMap = new Map<number, string>(
        [
            [TRACKER.BUILD_REQUEST, "Build-Request"],
        ]
    );

    const buildTrackers = [...buildTrackerMap].map(([id, name]) => ({ id, name }));

    const versionStatuses : string[] = ["open", "locked", "closed"];

    const versionShareType = {
        NONE: "none",
        DESCENDANTS: "descendants",
        HIERARCHY: "hierarchy",
        TREE: "tree",
        SYSTEM: "system"
    };

    const versionShares : string[] = [versionShareType.NONE, versionShareType.DESCENDANTS, versionShareType.HIERARCHY, versionShareType.TREE, versionShareType.SYSTEM]; //

    const addVersion = async<T>(version: Version) => {
        const body = {
            version: {
                name: version.name,
                status: version.status,
                sharing: version.sharing,
                due_date: version.due_date,
                description: version.description
            }
        };

        return await useFetch<Version>("/api/versions", {
            method: "POST",
            body: JSON.stringify(body)
        });
    }

    const updateVersion = async<T>(version: Version) => {
        try {
            const body = {
                version: {
                    status: version.status,
                    sharing: version.sharing,
                    due_date: version.due_date,
                    description: version.description
                }
            };

            const { data, error } = await useFetch<Version>(`/api/versions/${version.id}`, {
                method: "PUT",
                body: JSON.stringify(body)
            });

            if (error.value) {
                throw createError({
                  ...error.value,
                  statusMessage: `Could not fetch data, reason: ${error.value.statusCode} ${error.value.statusMessage}`,
                });
              }
    
            return data;
        } catch (error) {
            console.error('Failed to update version:', error);
            throw error;
        }
    }

    const deleteVersion = async<T>(versionId: String) => {
        try {

            const { data, error } = await useFetch<Version>(`/api/versions/${versionId}`, {
                method: "DELETE"
            });

            if (error.value) {
                throw createError({
                  ...error.value,
                  statusMessage: `Could not fetch data, reason: ${error.value.statusCode} ${error.value.statusMessage}`,
                });
              }
    
            return data;
        } catch (error) {
            console.error('Failed to delete version:', error);
            throw error;
        }
    }

    // const getVersions = async <T>(headers?: Record<string, string>) => {
    //     const options = headers ? { headers } : undefined;
    //     return await useFetch<Version[]>("/api/versions", options);
    // };

    const getVersions = async <T>(headers?: Record<string, string>, pClear?: boolean) => {
        const options: any = headers ? { headers } : {};
        //Add key 

        if (pClear) {
            options.query = { t: Date.now() };
        }
        return await useFetch<Version[]>("/api/versions", options);
    };

    const getVersionByProjectId = async <T>(projectId: Number, headers?: Record<string, string>) => {
        const options = headers ? { headers } : undefined;
        return await useFetch<Version[]>(`/api/versions/?projectId=${projectId}`, options);
    };

    function mapRawVersionToVersion(rawVersion: RawVersion): Version {
        return {
            id: rawVersion.id,
            projectid: rawVersion.project?.id,
            projectname: rawVersion.project?.name,
            name: rawVersion.name,
            description: rawVersion.description,
            status: rawVersion.status,
            due_date: rawVersion.due_date,
            sharing: rawVersion.sharing,
            wiki_page_title: rawVersion.wiki_page_title,
            created_on: rawVersion.created_on,
            updated_on: rawVersion.updated_on
        };
    }

    const getIssuesByVersion = async<T>(versionId: String) => {
        return await useFetch<Issue[]>(`/api/issues/issue-version?version_id=${versionId}`, {
            deep: true
        });
    }

    function mapRawIssueToIssue(rawIssue: RawIssue): Issue {
        const impactNoteField = rawIssue.custom_fields.find((field: { name: string; }) => field.name === "Developer's Comment");
        
        return {
            id: rawIssue.id,
            projectId: rawIssue.project?.id,
            projectName: rawIssue.project?.name,
            trackerId: rawIssue.tracker?.id,
            trackerName: rawIssue.tracker?.name,
            statusId: rawIssue.status?.id,
            statusName: rawIssue.status?.name,
            authorId: rawIssue.author?.id,
            authorName: rawIssue.author?.name,
            assignedToUserId: rawIssue.assigned_to?.id,
            assignedToUserName: rawIssue.assigned_to?.name,
            categoryId: rawIssue.category?.id,
            categoryName: rawIssue.category?.name,
            versionId: rawIssue.fixed_version?.id,
            versionName: rawIssue.fixed_version?.name,
            subject: rawIssue.subject,
            description: rawIssue.description,
            start_date: rawIssue.start_date,
            impactNote: impactNoteField ? (impactNoteField.value as string).replace(/\r\n/g, '<br>') : "",
            due_date: rawIssue.due_date,
            is_private: rawIssue.is_private,
            created_on: rawIssue.created_on,
            updated_on: rawIssue.updated_on,
            closed_on: rawIssue.closed_on
        };
    }

    const getProject = async <T>(headers?: Record<string, string>) => {
        const options = headers ? { headers } : undefined;
        return await useFetch<Project[]>("/api/projects", options);
    };

    function mapRawProjectToProject(rawProject: RawProject): Project {
        return {
            id: rawProject.id,
            name: rawProject.name,
        };
    }

    // Project MemberShip
    const getProjectMemberShip = async<T>(projectId: Number, headers?: Record<string, string>) => {
        const options = headers ? { headers } : undefined;
        return await useFetch<ProjectMemberShip[]>(`/api/projects/project-member?project_id=${projectId}`, options);
    }
    function mapRawMembershipToProjectMemberShip(rawMembership: RawMembership): ProjectMemberShip {
        return {
            projectId: rawMembership.project.id,
            type: rawMembership.group ? "group" : "user",
            id: rawMembership.group ? rawMembership.group!.id : rawMembership.user!.id,
            name: rawMembership.group? rawMembership.group!.name : rawMembership.user!.name,
            membershipid: (rawMembership.group ? "group" : "user") + (rawMembership.group ? rawMembership.group!.id : rawMembership.user!.id),
        };
    }

    //Dev Tracker
    const createDevTrackerRequest = <T>(trackerId: number
                                      , project: Project
                                      , assignTo: ProjectMemberShip
                                      , targetVerion: Version
                                      , subject: string): DevTrackerRequest => {
        
        const request = {
            tracker_id: trackerId,
            project: project,
            assignTo: assignTo,
            targetVerion: targetVerion,
            subject: subject
        };

        return request;
    }

    const createDevTracker = async<T>(devTrackerRequest: DevTrackerRequest
                                    , headers?: Record<string, string>): Promise<string> => {
        const body = {
            DevTrackerRequest: devTrackerRequest
        };
    
        try {
            const { data, error } = await useFetch<string>("/api/devtrackers", {
                    method: "POST",
                    body: JSON.stringify(body),
                    headers: headers
            });
    
            if (error.value) {
                throw createError({
                    ...error.value,
                    statusMessage: `Failed to create Dev Tracker: ${error.value.statusMessage}`,
                });
            }
    
            return data.value ?? 'No found Issue ID returned.';

        } catch (error) {
            console.error('Error creating Dev Tracker:', error);
            return 'Error occurred while creating Dev Tracker.';
        }
    };

    //==========================================================
    // SERVER SIDE API
    //==========================================================
    const createBaseRedmineHeader = (pCustomHeader?: Record<string, string | string[] | undefined>) => {
        
        const {decryptedAccessKey} = useClientUtil();
        const config = useRuntimeConfig();
        const headers = {
            'Content-Type': 'application/json',
            'X-Redmine-API-Key': config.redmineToken,
        };

        if (pCustomHeader) {
            if (pCustomHeader[YOUR_OWN_REDMINE_API]) {
                const apiKey = pCustomHeader[YOUR_OWN_REDMINE_API];
                if (typeof apiKey === 'string') {
                    headers['X-Redmine-API-Key'] = decryptedAccessKey(apiKey);
                }
            }
        }
        return headers;
        
    };

    return { addVersion, updateVersion, deleteVersion, getVersions, getVersionByProjectId, mapRawVersionToVersion
           , getIssuesByVersion, mapRawIssueToIssue
           , getProject, mapRawProjectToProject
           , getProjectMemberShip, mapRawMembershipToProjectMemberShip
           , createDevTrackerRequest, createDevTracker
           , createBaseRedmineHeader
           , YourOwnRedmineAPI: YOUR_OWN_REDMINE_API, versionStatuses, versionShareType, versionShares, devTrackers, buildTrackers, TRACKER};
}