import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { collect } from './collect.mjs';
import { makeReport, updateIndex } from './analyze.mjs';

export async function readJson(path) {
  try { return JSON.parse(await readFile(path, 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
export async function scan({
  now = new Date().toISOString(), fetchImpl, feeds, roles, newsSearch,
  previous = null,
} = {}) {
  const options = { now };
  if (fetchImpl) options.fetchImpl = fetchImpl;
  if (feeds) options.feeds = feeds;
  if (roles) options.roles = roles;
  if (newsSearch) options.newsSearch = newsSearch;
  return makeReport(await collect(options), previous);
}
export async function saveLocal(report, dir = 'data') {
  const folder = resolve(dir);
  const previousIndex = await readJson(resolve(folder, 'index.json'));
  const index = updateIndex(previousIndex, report);
  const snapshot = resolve(folder, 'snapshots', report.runId + '.json');
  await mkdir(dirname(snapshot), { recursive: true });
  await writeFile(snapshot, JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(resolve(folder, 'latest.json'), JSON.stringify(report, null, 2) + '\n', 'utf8');
  await writeFile(resolve(folder, 'index.json'), JSON.stringify(index, null, 2) + '\n', 'utf8');
  return { snapshot, indexSize: index.entries.length };
}
async function main() {
  const args = process.argv.slice(2);
  const pos = args.indexOf('--out');
  const directory = pos >= 0 ? args[pos+1] : 'data';
  if (!directory || directory.startsWith('-')) throw new Error('--out requires a directory');
  const previous = await readJson(resolve(directory, 'latest.json'));
  const report = await scan({
    previous, ...(args.includes('--official-only') ? { roles: [] } : {}),
  });
  const saved = await saveLocal(report, directory);
  console.log(JSON.stringify({
    runId: report.runId, generatedAt: report.generatedAt,
    counts: report.counts, baselineAvailable: report.comparisons.baselineAvailable,
    newInSample: report.comparisons.newInSample,
    sourceStatus: report.officialSourceStatus, roleStatus: report.researchRoleStatus,
    assessment: report.assessment, storedAt: saved.snapshot,
  }, null, 2));
  if (report.officialSourceStatus.length > 0 &&
    report.officialSourceStatus.every(x => x.status === 'failed')) {
    process.exitCode = 2;
  }
}
if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main().catch(error => { console.error('Scan failed:', error.message); process.exitCode = 1; });
}
