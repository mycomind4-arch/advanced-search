import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHistory, compareReports, reviewCrossSourceCandidates } from './history.mjs';

const date = '2026-10-30T07:00:00.000Z';
function item(id, title, source='fema-declarations', verification='official-source-record') {
  return { id, title, source, verification, url: 'https://example.org/' + id };
}
function report(id, observations, overrides = {}) {
  return {
    runId:id, generatedAt:date, counts:{officialRecords:observations.length, unverifiedLeads:0, failedOfficialSources:0},
    observations, sourceStatus:[{source:'fema-declarations',status:'ok'}, {source:'usgs',status:'ok'}],
    agentStatus:[], assessment:{coordinatedGlobalEvent:'not-established'}, ...overrides,
  };
}

test('first history entry has no fabricated baseline or event date', () => {
  const first=buildHistory(report('first', [item('a','FEMA publishes routine emergency notice')]),null);
  assert.equal(first.latest.changes.baselineAvailable,false);
  assert.equal(first.latest.changes.newlyObserved,null);
  assert.equal(first.latest.changes.independentlyVerifiedClaims,0);
  assert.equal(first.index.runs.length,1);
});

test('newly seen data is only a sample difference', () => {
  const prior=report('previous',[item('a','Original notice'),item('b','Older notice')]);
  const current=report('current',[item('b','Older notice'),item('c','Additional notice')]);
  const delta=compareReports(current,prior);
  assert.equal(delta.newlyObserved,1);
  assert.equal(delta.notSeenInCurrentSample,1);
  assert.ok(delta.limits.some(x=>x.includes('not resolution')));
});

test('source outage does not imply prior records disappeared', () => {
  const prior=report('previous',[item('a','Government advisory')]);
  const current=report('current',[],{sourceStatus:[{source:'fema-declarations',status:'failed'}]});
  assert.equal(compareReports(current,prior).notSeenInCurrentSample,0);
});

test('RSS stories never automatically become independent corroboration', () => {
  const records=[
    item('a','Routine Emergency Alert Test - Outlet One','google-news-rss','unverified-lead'),
    item('b','Routine Emergency Alert Test - Outlet Two','google-news-rss','unverified-lead'),
  ];
  assert.equal(reviewCrossSourceCandidates(records).length,0);
});

test('matching official publications form a review candidate but not proof', () => {
  const candidates=reviewCrossSourceCandidates([
    item('a','Coordination Exercise Announced','fema-declarations'),
    item('b','Coordination Exercise Announced','usgs'),
  ]);
  assert.equal(candidates.length,1);
  assert.equal(candidates[0].assessment,'requires-independent-source-review');
  assert.equal(candidates[0].independentlyCorroborated,false);
});

test('history indexes are deduplicated and bounded', () => {
  const current=report('new',[]);
  const old={runs:[
    {id:'old',generatedAt:'2020-01-01T00:00:00Z'},
    {id:'new',generatedAt:date},
  ]};
  const {index}=buildHistory(current,null,old);
  assert.equal(index.runs.length,1);
  assert.equal(index.runs[0].id,'new');
});

test('report schema requires observations and source status', () => {
  assert.throws(()=>buildHistory({runId:'x',generatedAt:date,observations:[]}), /Invalid/);
});
