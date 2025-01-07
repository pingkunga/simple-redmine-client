
export default () => {

    const versionStatuses : string[] = ["open", "locked", "closed"];

    const getVersions = async <T>() => {
        return await useFetch<Version[]>("/api/versions");
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
        return await useFetch<Issue[]>(`/api/issues/issue-version?version_id=${versionId}`);
    }

    function mapRawIssueToIssue(rawIssue: RawIssue): Issue {
        const impactNoteField = rawIssue.custom_fields.find(field => field.name === "Developer's Comment");
        
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

    return { getVersions, mapRawVersionToVersion, getIssuesByVersion, mapRawIssueToIssue, versionStatuses};
}