import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildHistory } from './history.mjs';

export const DEFAULT_HISTORY_BRANCH = 'intelligence-history';
const BASE_API = 'https://api.github.com';

function validateEnvironment(env) {
  const token = env.GITHUB_TOKEN;
  const repo = env.GITHUB_REPOSITORY;
  if (!token) throw new Error('GITHUB_TOKEN is required for history publication');
  if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) {
    throw new Error('GITHUB_REPOSITORY must be owner/repository');
  }
  return { token, repo };
}

export function makeApi({ fetchImpl = fetch, token, repository }) {
  const root = BASE_API + '/repos/' + repository;
  async function request(method, path, body) {
    const resp = await fetchImpl(root + path, {
      method,
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: 'Bearer ' + token,
        'X-GitHub-Api-Version': '2022-11-28',
        'Content-Type': 'application/json',
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000),
    });
    if (resp.status === 404) return null;
    if (!resp.ok) throw new Error('GitHub API HTTP ' + resp.status + ' ' + method + ' ' + path);
    return resp.json();
  }
  const branchPath = (branch) => '/git/ref/heads/' + encodeURIComponent(branch);
  return {
    request,
    async head(branch) {
      const ref = await request('GET', branchPath(branch));
      return ref?.object?.sha ?? null;
    },
    async ensureBranch(branch, seedSha) {
      const existing = await this.head(branch);
      if (existing) return existing;
      if (!seedSha || !/^[0-9a-f]{40}$/i.test(seedSha)) throw new Error('Valid main branch SHA required');
      await request('POST', '/git/refs', { ref: 'refs/heads/' + branch, sha: seedSha });
      return this.head(branch);
    },
    async readJson(branch, path) {
      const result = await request('GET', '/contents/' + path + '?ref=' + encodeURIComponent(branch));
      if (!result) return null;
      if (result.encoding !== 'base64' || !result.content) throw new Error('Unexpected GitHub content encoding at ' + path);
      return JSON.parse(Buffer.from(result.content.replace(/\s/g, ''), 'base64').toString('utf8'));
    },
    async commitFiles(branch, parentSha, files) {
      const old = await request('GET', '/git/commits/' + parentSha);
      if (!old?.tree?.sha) throw new Error('Unable to find base Git tree');
      const entries = files.map(({ path, content }) => ({
        path, mode: '100644', type: 'blob', content,
      }));
      const tree = await request('POST', '/git/trees', {
        base_tree: old.tree.sha, tree: entries,
      });
      const commit = await request('POST', '/git/commits', {
        message: 'Store verified-source research snapshot and run history',
        tree: tree.sha, parents: [parentSha],
      });
      await request('PATCH', '/git/refs/heads/' + encodeURIComponent(branch), {
        sha: commit.sha, force: false,
      });
      return commit.sha;
    },
  };
}

export async function publishReport(report, {
  env = process.env,
  fetchImpl = fetch,
  branch = DEFAULT_HISTORY_BRANCH,
} = {}) {
  const { token, repo } = validateEnvironment(env);
  const api = makeApi({ fetchImpl, token, repository: repo });
  const seedSha = env.GITHUB_SHA;
  const head = await api.ensureBranch(branch, seedSha);
  if (!head) throw new Error('History branch creation did not return a head');
  const [previous, index] = await Promise.all([
    api.readJson(branch, 'intelligence/data/latest.json'),
    api.readJson(branch, 'intelligence/data/index.json'),
  ]);
  // Re-running identical input is idempotent: do not accumulate duplicate entries.
  if (previous?.runId === report.runId) {
    return { status: 'already-published', branch, runId: report.runId, commit: head };
  }
  const output = buildHistory(report, previous, index);
  const files = [
    { path: output.snapshotPath, content: JSON.stringify(output.latest, null, 2) + '\n' },
    { path: 'intelligence/data/latest.json', content: JSON.stringify(output.latest, null, 2) + '\n' },
    { path: 'intelligence/data/index.json', content: JSON.stringify(output.index, null, 2) + '\n' },
  ];
  const commit = await api.commitFiles(branch, head, files);
  return {
    status: 'published', branch, commit, runId: report.runId,
    historyEntries: output.index.runs.length,
    observations: report.observations.length,
    newRecords: output.latest.changes.newlyObserved,
    reviewCandidates: output.latest.changes.reviewCandidates.length,
  };
}

async function main() {
  const inputFlag = process.argv.indexOf('--input');
  const source = inputFlag >= 0 ? process.argv[inputFlag + 1] : 'intelligence-report.json';
  if (!source || source.startsWith('-')) throw new Error('Missing input path');
  const report = JSON.parse(await readFile(source, 'utf8'));
  const result = await publishReport(report);
  console.log(JSON.stringify(result, null, 2));
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((error) => {
    console.error('History publication failed:', error.message);
    process.exitCode = 1;
  });
}
