import type { GitLabProject, GitLabBranch, GitLabSyncResult } from "~~/shared/types/GitLab";

export default () => {
  const fetchGitLabProjects = async () => {
    return await useFetch<GitLabProject[]>("/api/gitlab/projects");
  };

  const fetchGitLabBranches = async (projectId: number) => {
    return await useFetch<GitLabBranch[]>("/api/gitlab/branches", {
      query: { projectId },
    });
  };

  const syncGitLabEvents = async (projectId: number, after: string, before: string) => {
    return await $fetch<GitLabSyncResult>("/api/gitlab/sync-events", {
      method: "POST",
      body: {
        projectId,
        after,
        before,
      },
    });
  };

  return {
    fetchGitLabProjects,
    fetchGitLabBranches,
    syncGitLabEvents,
  };
};
