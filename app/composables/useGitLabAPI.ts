import type { GitLabProject, GitLabBranch } from "~~/shared/types/GitLab";

export default () => {
  const fetchGitLabProjects = async () => {
    return await useFetch<GitLabProject[]>("/api/gitlab/projects");
  };

  const fetchGitLabBranches = async (projectId: number) => {
    return await useFetch<GitLabBranch[]>("/api/gitlab/branches", {
      query: { projectId },
    });
  };

  return {
    fetchGitLabProjects,
    fetchGitLabBranches,
  };
};
