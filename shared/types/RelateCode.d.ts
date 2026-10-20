// A GitLab merge request / commit link found in an issue's text. Computed by us (get_issue), never sent by Redmine,
// so it lives here and not on RawIssue.
export interface RelateCode {
    type: 'merge_request' | 'commit';
    url?: string;
    projectPath?: string;
    iid?: number;
    sha?: string;
    // 'description' | 'journal:<id>' | 'changeset'
    foundIn: string;
}
