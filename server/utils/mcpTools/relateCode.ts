import type { RelateCode } from '~~/shared/types/RelateCode';

export const MAX_RELATE_CODE = 50;

// GitLab web URLs: <host>/<group>/<sub>/<project>/-/merge_requests/<iid> and .../-/commit/<sha>.
// The path stops at a whitespace / quote / bracket, which also ends URLs embedded in textile or HTML.
const URL_RE = /https?:\/\/[^\s"'<>()[\]|]+?\/-\/(merge_requests|commits?)\/([0-9a-f]{7,40}|\d+)\b[^\s"'<>()[\]|]*/gi;
const PATH_RE = /^https?:\/\/[^/]+\/(.+?)\/-\//i;

/**
 * Finds GitLab merge request / commit links in free text. Pure: links and ids only, nothing is fetched.
 * `seen` dedupes across several calls (the same link in the description and in a journal counts once).
 */
export const extractRelateCode = (text: string | null | undefined, foundIn: string, seen = new Set<string>()): RelateCode[] => {
  if (!text) return [];
  const found: RelateCode[] = [];

  for (const match of text.matchAll(URL_RE)) {
    const kind = match[1]!.toLowerCase();
    const id = match[2]!;
    const isMr = kind === 'merge_requests';
    if (isMr && !/^\d+$/.test(id)) continue;
    if (!isMr && !/^[0-9a-f]{7,40}$/i.test(id)) continue;

    const url = match[0].replace(/[.,;:!?]+$/, '');
    const key = isMr ? url.replace(/\/merge_requests\/(\d+).*$/i, '/merge_requests/$1') : url.replace(/\/commits?\/([0-9a-f]+).*$/i, '/commit/$1');
    if (seen.has(key.toLowerCase())) continue;
    seen.add(key.toLowerCase());

    const projectPath = PATH_RE.exec(url)?.[1];
    found.push(isMr
      ? { type: 'merge_request', url: key, ...(projectPath && { projectPath }), iid: Number(id), foundIn }
      : { type: 'commit', url: key, ...(projectPath && { projectPath }), sha: id.toLowerCase(), foundIn });
  }

  return found;
};
