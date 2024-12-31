interface Issue {
    id: number;
    projectId: number;
    projectName: string;
    trackerId: number;
    trackerName: string;
    statusId: number;
    statusName: string;
    authorId: number;
    authorName: string;
    assignedToUserId: number;
    assignedToUserName: string;
    categoryId: number;
    categoryName: string;
    versionId: number;
    versionName: string;
    subject: string;
    description: string;
    start_date?: string | null;
    impactNote: string;
    due_date: string;
    is_private: boolean;
    created_on: string;
    updated_on: string;
    closed_on?: string | null;
}

//จาก redmine json
interface RawIssue {
    id: number;
    project: { id: number; name: string };
    tracker: { id: number; name: string };
    status: { id: number; name: string; is_closed: boolean };
    priority: { id: number; name: string };
    author: { id: number; name: string };
    assigned_to: { id: number; name: string };
    category: { id: number; name: string };
    fixed_version: { id: number; name: string };
    parent?: { id: number };
    subject: string;
    description: string;
    start_date?: string | null;
    due_date: string;
    done_ratio: number;
    is_private: boolean;
    estimated_hours?: number | null;
    total_estimated_hours?: number | null;
    custom_fields: { id: number; name: string; value: string | string[]; multiple?: boolean }[];
    created_on: string;
    updated_on: string;
    closed_on?: string | null;
}
