export interface GitLabProject {
    id: number;
    name: string;
}

export interface GitLabBranch {
    name: string;
    merged: boolean;
    protected: boolean;
    default: boolean;
    web_url: string;
    commit: {
        id: string;
        short_id: string;
        title: string;
        message: string;
        author_name: string;
        author_email: string;
        authored_date: string;
        committer_name: string;
        committer_email: string;
        committed_date: string;
        web_url: string;
    };
    // Merged data
    creator_name?: string;
    created_at?: string;
    is_direct?: boolean;
}

export interface GitLabCacheData {
    projectId: number;
    branches: Record<string, {
        creator_name: string;
        created_at: string;
        is_direct: boolean;
    }>;
    lastUpdated: string;
}

export interface GitLabEvent {
    id: number;
    project_id: number;
    action_name: string;
    author: {
        id: number;
        username: string;
        name: string;
    };
    created_at: string;
    push_data?: {
        action: string;
        ref_type: string;
        ref: string;
    };
}
