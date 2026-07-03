import fs from 'node:fs/promises';
import path from 'node:path';
import axios from 'axios';
import type { GitLabBranch, GitLabEvent, GitLabCacheData, GitLabSyncResult } from '~~/shared/types/GitLab';

const PER_PAGE = 100;

const createEmptyCache = (projectId: string): GitLabCacheData => ({
  projectId: Number(projectId),
  branches: {},
  events: [],
  lastUpdated: '',
});

const mergeEventsById = (baseEvents: GitLabEvent[] = [], incomingEvents: GitLabEvent[] = []) => {
  const eventById = new Map<number, GitLabEvent>();
  for (const event of baseEvents) {
    eventById.set(event.id, event);
  }
  for (const event of incomingEvents) {
    eventById.set(event.id, event);
  }
  return Array.from(eventById.values());
};

const loadCache = async (cacheFilePath: string, projectId: string): Promise<GitLabCacheData> => {
  try {
    const fileContent = await fs.readFile(cacheFilePath, 'utf-8');
    const parsed = JSON.parse(fileContent) as GitLabCacheData;
    return {
      ...parsed,
      projectId: Number(projectId),
      branches: parsed.branches || {},
      events: parsed.events || [],
      lastUpdated: parsed.lastUpdated || '',
    };
  } catch {
    return createEmptyCache(projectId);
  }
};

const saveCache = async (cacheFilePath: string, cache: GitLabCacheData) => {
  await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
  await fs.writeFile(cacheFilePath, JSON.stringify(cache, null, 2));
};

const fetchGitLabEventsPage = async (
  gitlabUrl: string,
  headers: Record<string, string>,
  projectId: string,
  page: number,
  after?: string,
  before?: string,
) => {
  const response = await axios.get<GitLabEvent[]>(
    `${gitlabUrl}/api/v4/projects/${projectId}/events`,
    {
      headers,
      params: {
        action: 'pushed',
        per_page: PER_PAGE,
        page,
        ...(after ? { after } : {}),
        ...(before ? { before } : {}),
      },
    }
  );

  const nextPage = Number(response.headers['x-next-page'] || 0);
  const currentPage = Number(response.headers['x-page'] || page);

  return {
    events: response.data,
    nextPage,
    currentPage,
  };
};

const extractCreatedBranchEvents = (events: GitLabEvent[]) => {
  return events.filter((event) => (
    event.push_data?.action === 'created' &&
    event.push_data?.ref_type === 'branch'
  ));
};

const buildBranchInfoFromCache = (cache: GitLabCacheData, branch: GitLabBranch) => {
  const allEvents = extractCreatedBranchEvents(cache.events || []);
  const matchedEvent = allEvents
    .filter((event) => event.push_data?.ref === branch.name)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())[0];

  if (matchedEvent) {
    const info = {
      creator_name: matchedEvent.author.name,
      created_at: matchedEvent.created_at,
      is_direct: true,
    };
    cache.branches[branch.name] = info;
    return { ...branch, ...info };
  }

  if (cache && cache.branches && branch && branch.name) {
    const cachedBranch = cache.branches[branch.name];
    
    if (cachedBranch && cachedBranch.is_direct) {
      return { ...branch, ...cachedBranch };
    }
  }

  return {
    ...branch,
    creator_name: branch.commit.author_name,
    created_at: branch.commit.authored_date,
    is_direct: false,
  };
};

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
  const cacheFilePath = path.join(process.cwd(), gitlabCacheDir, `project-${projectId}.json`);
  const cache = await loadCache(cacheFilePath, projectId);

  if (gitlabCacheMode === 'file') {
    await fs.mkdir(path.dirname(cacheFilePath), { recursive: true });
  }

  // 2. Fetch current branches from GitLab
  // const branchesRes = await axios.get<GitLabBranch[]>(
  //   `${gitlabUrl}/api/v4/projects/${projectId}/repository/branches`,
  //   { headers }
  // );
  
  // const currentBranches = branchesRes.data;

  const currentBranches = await fetchAllBranches(gitlabUrl, headers, projectId);


  // 3. Incremental sync: always pull latest 100 events and merge to cache
  const latestPage = await fetchGitLabEventsPage(gitlabUrl, headers, projectId, 1);
  cache.events = mergeEventsById(cache.events, latestPage.events);

  // 4. Merge Logic
  const mergedBranches = currentBranches.map((branch) => buildBranchInfoFromCache(cache, branch));

  // 5. Save Cache (Auto-fill)
  if (gitlabCacheMode === 'file') {
    cache.lastUpdated = new Date().toISOString();
    await saveCache(cacheFilePath, cache);
  } else if (gitlabCacheMode === 'mongodb') {
    // MongoDB implementation placeholder
    console.warn('MongoDB mode not yet fully implemented, check gitlabCache.ts');
  }

  return mergedBranches;
};

async function fetchAllBranches(
  gitlabUrl: string,
  headers: Record<string, string>,
  projectId: string
): Promise<GitLabBranch[]> {
  const all: GitLabBranch[] = [];
  let page = 1;

  while (true) {
    const res = await axios.get<GitLabBranch[]>(
      `${gitlabUrl}/api/v4/projects/${projectId}/repository/branches`,
      {
        headers,
        params: { per_page: PER_PAGE, page },
      }
    );
    //PER_PAGE
    all.push(...res.data);

    // GitLab ส่ง next page มาใน header; ถ้าว่าง = หมดแล้ว
    const nextPage = res.headers['x-next-page'];
    if (!nextPage) break;
    page = Number(nextPage);
  }

  return all;
}

export const syncProjectEvents = async (projectId: string, after: string, before: string): Promise<GitLabSyncResult> => {
  const config = useRuntimeConfig();
  const gitlabUrl = config.public.gitlabUrl;
  const gitlabToken = (config as any).gitlabToken;
  const gitlabCacheMode = (config as any).gitlabCacheMode;
  const gitlabCacheDir = (config as any).gitlabCacheDir;

  const headers = {
    'PRIVATE-TOKEN': gitlabToken,
  };

  const cacheFilePath = path.join(process.cwd(), gitlabCacheDir, `project-${projectId}.json`);
  const cache = await loadCache(cacheFilePath, projectId);

  let page = 1;
  let lastPage = 1;
  const collected: GitLabEvent[] = [];

  // Header-based pagination: keep fetching while x-next-page exists.
  while (page > 0) {
    const response = await fetchGitLabEventsPage(gitlabUrl, headers, projectId, page, after, before);
    collected.push(...response.events);
    lastPage = response.currentPage;
    page = response.nextPage;
  }

  const previousCount = (cache.events || []).length;
  cache.events = mergeEventsById(cache.events, collected);
  const totalInCache = (cache.events || []).length;
  const newlyAdded = Math.max(totalInCache - previousCount, 0);
  cache.lastUpdated = new Date().toISOString();

  if (gitlabCacheMode === 'file') {
    await saveCache(cacheFilePath, cache);
  } else if (gitlabCacheMode === 'mongodb') {
    console.warn('MongoDB mode not yet fully implemented, check gitlabCache.ts');
  }

  return {
    totalFetched: collected.length,
    newlyAdded,
    totalInCache,
    lastPage,
  };
};
