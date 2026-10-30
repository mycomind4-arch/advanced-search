import test from 'node:test';
import assert from 'node:assert/strict';
import { OFFICIAL_FEEDS, queriesFor } from '../src/config.mjs';
import { canonicalUrl, dateISO, parseNewsRSS, fetchOfficial, fetchRoles, collect } from '../src/collect.mjs';
import { makeReport, compareSamples, candidatesForReview, updateIndex } from '../src/analyze.mjs';
import { gitClient, publish } from '../src/publish.mjs';

const NOW = '2026-10-30T15:00:00.000Z';
function rec(id, source = 'fema-declarations', kind = 'official-record') {
  return { id, title: 'Official notice of incident number ' + id,
    source, classification: kind, domain: 'government', url: 'https://example.org/' + id };
}
function raw(items, sources = [{ id: 'fema-declarations', status: 'ok', accepted: items.length }]) {
  return { generatedAt: NOW, observations: items,
    officialSourceStatus: sources, researchRoleStatus: [] };
}
function response(status, body) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}
test('research roles are distinct and rolling, not pinned to October 2026', () => {
  const roles = queriesFor('2027-05-12T00:00:00Z');
  assert.equal(roles.length, 10);
  assert.equal(new Set(roles.map(x => x.id)).size, 10);
  assert.match(roles[0].query, /2027-05/);
  assert.doesNotMatch(roles[0].query, /2026-10/);
});
test('source URLs must be HTTP(S) and tracking-free', () => {
  assert.equal(canonicalUrl('https://EXAMPLE.org/docs/?utm_source=x&id=2#part'), 'https://example.org/docs?id=2');
  assert.equal(canonicalUrl('javascript:alert(1)'), null);
  assert.equal(dateISO('not a date'), null);
});
test('RSS is treated as discovery and never direct corroboration', async () => {
  const xml = '<rss><item><title>Routine exercise &amp; communications</title><link>https://news.google.com/rss/a</link><pubDate>Fri, 30 Oct 2026 12:00:00 GMT</pubDate></item></rss>';
  assert.equal(parseNewsRSS(xml)[0].title, 'Routine exercise & communications');
  const output = await fetchRoles({
    now: NOW,
    roles: [{ id: 'government', query: 'exercise' }],
    newsSearch: async () => parseNewsRSS(xml),
  });
  assert.equal(output.entries.length, 1);
  assert.equal(output.entries[0].classification, 'unverified-lead');
  assert.equal(output.entries[0].independentlyVerified, false);
});
test('failed official feeds are recorded, stale entries excluded', async () => {
  const feeds = [
    { id: 'up', domain: 'government', kind: 'publication', url: 'https://example.org/up',
      extract: j => j.items },
    { id: 'down', domain: 'government', kind: 'publication', url: 'https://example.org/down',
      extract: j => j.items },
  ];
  const fetchImpl = async url => url.endsWith('/down') ? response(503,{}) :
    response(200, { items: [
      { url: 'https://example.org/new', title: 'New official notice', publishedAt: '2026-10-30' },
      { url: 'https://example.org/old', title: 'Old notice', publishedAt: '2025-01-01' },
    ] });
  const out = await fetchOfficial({ now: NOW, feeds, fetchImpl });
  assert.equal(out.entries.length, 1);
  assert.deepEqual(out.status.map(x => x.status), ['ok','failed']);
});
test('first baseline gives no false indication that all records are new', () => {
  const report = makeReport(raw([rec('1')]));
  assert.equal(report.comparisons.baselineAvailable,false);
  assert.equal(report.comparisons.newInSample,null);
  assert.equal(report.assessment.predictedEventDate,null);
});
test('missing source does not mean a prior real-world incident ended', () => {
  const old = makeReport(raw([rec('1')]));
  const current = raw([], [{ id: 'fema-declarations', status: 'failed', accepted: 0 }]);
  assert.equal(compareSamples(current, old).absentFromSample, 0);
});
test('same words from two official publishers create review candidate not verification', () => {
  const a=rec('a'), b={...rec('b', 'usgs'), title: rec('a').title};
  const candidates=candidatesForReview([a,b]);
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].independentlyVerified,false);
  assert.equal(candidatesForReview([a,{...b,classification:'unverified-lead'}]).length,0);
});
test('history deduplication and retention are bounded', () => {
  const report=makeReport(raw([rec('1')]));
  const index=updateIndex({entries:[
    {runId:report.runId,generatedAt:NOW,counts:report.counts},
    {runId:'expired',generatedAt:'2022-01-01T00:00:00Z'},
  ]},report);
  assert.equal(index.entries.length,1);
});
test('all source adapters can be mocked without network', async () => {
  const feeds=[{id:'one',domain:'government',kind:'publication',url:'https://example.org/a',
    extract:j=>j.items}];
  const out=await collect({now:NOW,feeds,roles:[],
    fetchImpl:async()=>response(200,{items:[{url:'https://example.org/notice',
      title:'Original document',publishedAt:NOW}]}),
  });
  assert.equal(out.observations.length,1);
  assert.equal(out.officialSourceStatus[0].status,'ok');
});
test('missing GitHub token stops history writes before any request', async () => {
  let count=0;
  await assert.rejects(publish(makeReport(raw([])), {
    env:{GITHUB_REPOSITORY:'some/repo'}, fetchImpl:async()=>{count++;return response(500,{})},
  }),/GITHUB_TOKEN/);
  assert.equal(count,0);
});
test('history publisher preserves app branch and commits 3 data files atomically', async () => {
  const baseSha='a'.repeat(40);
  let exists=false, tree;
  const fakeFetch=async (url, options) => {
    const path=new URL(url).pathname, method=options.method;
    if (method==='GET' && path.endsWith('/git/ref/heads/global-intelligence-history')) {
      return exists ? response(200,{object:{sha:baseSha}}) : response(404,{});
    }
    if (method==='POST' && path.endsWith('/git/refs')) {exists=true;return response(201,{})}
    if (method==='GET' && path.includes('/contents/')) return response(404,{});
    if (method==='GET' && path.endsWith('/git/commits/'+baseSha)) return response(200,{tree:{sha:'b'.repeat(40)}});
    if (method==='POST' && path.endsWith('/git/trees')) {tree=JSON.parse(options.body);return response(201,{sha:'c'.repeat(40)})}
    if (method==='POST' && path.endsWith('/git/commits')) return response(201,{sha:'d'.repeat(40)});
    if (method==='PATCH' && path.endsWith('/git/refs/heads/global-intelligence-history')) return response(200,{});
    throw Error('Unexpected call '+method+' '+path);
  };
  const result=await publish(makeReport(raw([])),{
    env:{GITHUB_TOKEN:'unit-test',GITHUB_REPOSITORY:'some/repo',GITHUB_SHA:baseSha},
    fetchImpl:fakeFetch,
  });
  assert.equal(result.status,'published');
  assert.equal(result.snapshotCount,1);
  assert.equal(tree.tree.length,3);
  assert.ok(tree.tree.every(f=>f.path.startsWith('global-intelligence-network/data/')));
});
test('config contains six read-only official feeds, no secret URLs', () => {
  assert.equal(OFFICIAL_FEEDS.length,6);
  assert.ok(OFFICIAL_FEEDS.every(f=>f.url.startsWith('https://')));
});
