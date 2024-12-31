
export default () => {

    const getVersions = async <VersionsResponse>() => {
        return await useFetch<VersionsResponse>("/api/versions");
    };

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
            impactNote: impactNoteField ? impactNoteField.value as string : "",
            due_date: rawIssue.due_date,
            is_private: rawIssue.is_private,
            created_on: rawIssue.created_on,
            updated_on: rawIssue.updated_on,
            closed_on: rawIssue.closed_on
        };
    }

    return { getVersions, mapRawIssueToIssue, getIssuesByVersion};
}