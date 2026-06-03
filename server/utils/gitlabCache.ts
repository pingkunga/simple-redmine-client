import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import type { GitLabBranch, GitLabEvent, GitLabCacheData } from '~~/shared/types/GitLab';

export const getGitLabBranches = async (projectId: string) => {
  const config = useRuntimeConfig();
  const gitlabUrl = config.public.gitlabUrl;
  const gitlabToken = (config as any).gitlabToken;
  const gitlabCacheMode = (config as any).gitlabCacheMode;
  const gitlabCacheDir = (config as any).gitlabCacheDir;

  const headers = {
    'PRIVATE-TOKEN': gitlabToken,
  };

  // 1. Load existing cache
  let cache: GitLabCacheData = { projectId: Number(projectId), branches: {}, lastUpdated: '' };
  const cacheFilePath = path.join(process.cwd(), gitlabCacheDir, `project-${projectId}.json`);

  if (gitlabCacheMode === 'file') {
    try {
      await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
      const fileContent = await fs.readFile(cacheFilePath, 'utf-8');
      cache = JSON.parse(fileContent);
    } catch (e) {
      // Cache file doesn't exist yet, proceed with empty cache
    }
  }

  // 2. Fetch current branches from GitLab
  const branchesRes = await axios.get<GitLabBranch[]>(
    `${gitlabUrl}/api/v4/projects/${projectId}/repository/branches`,
    { headers }
  );
  const currentBranches = branchesRes.data;

  // 3. Fetch recent push events (The 90-day window)
  const eventsRes = await axios.get<GitLabEvent[]>(
    `${gitlabUrl}/api/v4/projects/${projectId}/events`,
    { 
      headers, 
      params: { action: 'pushed', per_page: 100 } 
    }
  );
  const pushEvents = eventsRes.data.filter(e => 
    e.push_data?.action === "created" && 
    e.push_data?.ref_type === "branch"
  );

  // 4. Merge Logic
  const mergedBranches = currentBranches.map(branch => {
    // A. Check recent API events (Direct info)
    const apiEvent = pushEvents.find(e => e.push_data?.ref === branch.name);
    if (apiEvent) {
      const info = {
        creator_name: apiEvent.author.name,
        created_at: apiEvent.created_at,
        is_direct: true
      };
      // Upsert into cache
      cache.branches[branch.name] = info;
      return { ...branch, ...info };
    }

    // B. Check persistent cache (Old Direct info)
    if (cache.branches[branch.name] && cache.branches[branch.name].is_direct) {
      return { ...branch, ...cache.branches[branch.name] };
    }

    // C. Fallback: Indirect calculation from Commit
    return {
      ...branch,
      creator_name: branch.commit.author_name,
      created_at: branch.commit.authored_date, // Using authored_date as primary fallback
      is_direct: false
    };
  });

  // 5. Save Cache (Auto-fill)
  if (gitlabCacheMode === 'file') {
    cache.lastUpdated = new Date().toISOString();
    await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
  } else if (gitlabCacheMode === 'mongodb') {
    // MongoDB implementation placeholder
    console.warn('MongoDB mode not yet fully implemented, check gitlabCache.ts');
  }

  return mergedBranches;
};
