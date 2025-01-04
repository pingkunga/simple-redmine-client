interface RawVersion {
    id: number;
    project: Project;
    name: string;
    description: string;
    status: string;
    due_date: string | null;
    sharing: string;
    wiki_page_title: string;
    created_on: string;
    updated_on: string;
  }

interface Version{
    id: number;
    projectid: number;
    projectname: string;
    name: string;
    description: string;
    status: string;
    due_date: string | null;
    sharing: string;
    wiki_page_title: string;
    created_on: string;
    updated_on: string;
} 