import { z } from 'zod';
import { getIssuesByVersion } from './getIssuesByVersion';
import { listVersions } from './listVersions';
import { MAX_RESULTS, type McpToolDef, type ToolContext } from './types';

// Hard max of versions fetched per call; a longer range is read in batches (limit + offset).
const MAX_FETCHED_VERSIONS = 50;
const MAX_SKIPPED_NAMES = 40;
const MAX_SERIES = 40;
const ISSUES_PER_VERSION = 100;
// Redmine rejected some of 6 parallel fan-outs in production; keep the burst small.
const CONCURRENCY = 4;

const inputSchema = {
  from: z.string().trim().min(1).max(32)
    .describe('First version of the range, e.g. "8.9.14.1". A 3-part value like "8.9.14" starts at 8.9.14.0.'),
  to: z.string().trim().min(1).max(32)
    .describe('Last version of the range, e.g. "8.9.20.5". "8.9.20.x" or "8.9.20" means the whole 8.9.20 series.'),
  projectId: z.number().int().positive().optional()
    .describe('Narrow the version lookup to this Redmine project'),
  limit: z.number().int().min(1).max(MAX_FETCHED_VERSIONS).optional()
    .describe(`How many versions to fetch in this call (default and max ${MAX_FETCHED_VERSIONS}). Use the batch size the user asked for.`),
  offset: z.number().int().min(0).optional()
    .describe('Index of the first version to fetch, for the next batch: pass nextOffset from the previous result (default 0).'),
};
const schema = z.object(inputSchema);

type Parts = [number, number, number, number];

// "from": 3 or 4 numeric parts. "to": additionally "a.b.c" / "a.b.c.x" = the whole series.
const parseBound = (raw: string, isTo: boolean): Parts => {
  const m = /^(\d+)\.(\d+)\.(\d+)(?:\.(\d+|x))?$/i.exec(raw);
  if (!m) throw new Error(`Invalid version "${raw}": expected A.B.C.D, e.g. 8.9.14.1`);
  const last = m[4]?.toLowerCase();
  const d = last === undefined || last === 'x' ? (isTo ? Infinity : 0) : Number(last);
  return [Number(m[1]), Number(m[2]), Number(m[3]), d];
};

const compare = (a: Parts, b: Parts) => {
  for (let i = 0; i < 4; i++) if (a[i]! !== b[i]!) return a[i]! < b[i]! ? -1 : 1;
  return 0;
};

interface Candidate {
  id: number;
  name: string;
  projectId?: number;
  parts: Parts;
}

// Weekly versions end in 1-2 digits (8.9.14.3). Hotfix-style names (8.9.14.101, 8.9.14.0001, 8.9.14.x)
// are only reported by name, never fetched.
const classify = (name: string) => {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\S+)$/.exec(name.trim());
  if (!m) return undefined;
  const series: [number, number, number] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return /^\d{1,2}$/.test(m[4]!) ? { series, weekly: Number(m[4]) } : { series, weekly: undefined };
};

const mapLimit = async <T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> => {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]!);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
};

interface VersionLookup {
  partial: boolean;
  truncated: boolean;
  failedScopes: string[];
  versions: { id: number; name: string; projectId?: number }[];
}

interface IssuesResult {
  total: number;
  truncated: boolean;
  issues: { id: number; subject: string; tracker?: string; status?: string; impactNote?: string; impactNoteTruncated?: boolean }[];
}

export const getIssuesByVersionRange = async (rawArgs: unknown, ctx: ToolContext) => {
  const { from, to, projectId, limit = MAX_FETCHED_VERSIONS, offset = 0 } = schema.parse(rawArgs);
  const lo = parseBound(from, false);
  const hi = parseBound(to, true);

  if (lo[0] !== hi[0] || lo[1] !== hi[1]) throw new Error('from and to must share the same A.B prefix (e.g. 8.9.x)');
  if (compare(lo, hi) > 0) throw new Error('from must not be later than to');
  const seriesNumbers = Array.from({ length: hi[2] - lo[2] + 1 }, (_, i) => lo[2] + i);
  if (seriesNumbers.length > MAX_SERIES) throw new Error(`Range spans more than ${MAX_SERIES} series; narrow it`);

  // One lookup per series: a lookup by "8.9." would also match 8.8.9.x and overflow the result cap.
  let partial = false;
  let incomplete = false;
  const failedScopes = new Set<string>();
  const lookups = await mapLimit(seriesNumbers, CONCURRENCY, async c => {
    try {
      return await listVersions({ projectId, name: `${lo[0]}.${lo[1]}.${c}.`, limit: MAX_RESULTS }, ctx) as VersionLookup;
    } catch {
      partial = true;
      failedScopes.add(`series ${lo[0]}.${lo[1]}.${c}`);
      return undefined;
    }
  });

  const weekly = new Map<number, Candidate>();
  const skipped: string[] = [];
  for (const lookup of lookups) {
    if (!lookup) continue;
    partial ||= lookup.partial;
    incomplete ||= lookup.truncated;
    lookup.failedScopes.forEach(s => failedScopes.add(s));
    for (const v of lookup.versions) {
      const c = classify(v.name);
      if (!c || c.series[0] !== lo[0] || c.series[1] !== lo[1] || c.series[2] < lo[2] || c.series[2] > hi[2]) continue;
      if (c.weekly === undefined) {
        skipped.push(v.name.trim());
        continue;
      }
      const parts: Parts = [...c.series, c.weekly];
      if (compare(parts, lo) >= 0 && compare(parts, hi) <= 0) {
        weekly.set(v.id, { id: v.id, name: v.name.trim(), projectId: v.projectId, parts });
      }
    }
  }

  const versions = [...weekly.values()].sort((a, b) => compare(a.parts, b.parts));
  const skippedNames = [...new Set(skipped)].sort();
  const common = {
    partial: partial || incomplete,
    failedScopes: [...failedScopes],
    skippedHotfixVersions: { count: skippedNames.length, names: skippedNames.slice(0, MAX_SKIPPED_NAMES) },
  };

  const batch = versions.slice(offset, offset + limit);
  const nextOffset = offset + batch.length;
  const remaining = versions.slice(nextOffset);
  const remainingBySeries: Record<string, string[]> = {};
  for (const v of remaining) (remainingBySeries[v.parts.slice(0, 3).join('.')] ??= []).push(v.name);

  const results = await mapLimit(batch, CONCURRENCY, async v => {
    try {
      const r = await getIssuesByVersion({ versionId: v.id, limit: ISSUES_PER_VERSION }, ctx) as IssuesResult;
      return {
        id: v.id,
        name: v.name,
        total: r.total,
        ...(r.truncated && { truncated: true }),
        issues: r.issues.map(i => ({
          id: i.id,
          subject: i.subject,
          tracker: i.tracker,
          status: i.status,
          ...(i.impactNote && { impactNote: i.impactNote }),
          ...(i.impactNoteTruncated && { impactNoteTruncated: true }),
        })),
      };
    } catch {
      return { id: v.id, name: v.name, error: 'failed to fetch issues' };
    }
  });
  const failedVersions = results.filter(r => 'error' in r).map(r => r.name);

  return {
    resolved: true,
    totalVersions: versions.length,
    versionCount: batch.length,
    offset,
    hasMore: remaining.length > 0,
    ...(remaining.length > 0 && { nextOffset, remainingVersions: remainingBySeries }),
    ...common,
    partial: common.partial || failedVersions.length > 0,
    ...(failedVersions.length > 0 && { failedVersions }),
    versions: results,
  };
};

export const getIssuesByVersionRangeTool: McpToolDef = {
  name: 'get_issues_by_version_range',
  description:
    'List the issues of every existing weekly version between "from" and "to" in one call (e.g. from "8.9.14.1" to ' +
    '"8.9.20.5", or to "8.9.25.x" for a whole series end). Versions are walked in numeric order. Use it for any series ' +
    'or range of versions; use get_issues_by_version for a single version. Each issue has subject, tracker, status and ' +
    'impactNote when the developer wrote one. Hotfix-style versions (last part with 3-4 digits such as 8.9.14.101, ' +
    '8.9.14.0001 or 8.9.14.x) are NOT fetched: skippedHotfixVersions lists their names, mention them in one line. ' +
    'Fetches at most 50 versions per call (or "limit", the batch size the user asked for). If hasMore is true, say ' +
    '"N of totalVersions shown", ask how many versions per batch they want next, and call again with the same ' +
    'from/to, offset=nextOffset and limit=their number. If "partial" is true, some data is missing ' +
    '(see failedScopes / failedVersions).',
  inputSchema,
  handler: getIssuesByVersionRange,
};
