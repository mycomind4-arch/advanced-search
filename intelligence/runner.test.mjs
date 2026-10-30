import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, consolidate, makeRecord, collectOfficial, buildReport } from './runner.mjs';

const now = '2026-10-30T13:00:00Z';
test('normalizes public URLs safely', () => {
  assert.equal(canonicalUrl('https://example.org/a/?utm_source=x#top'), 'https://example.org/a');
  assert.equal(canonicalUrl('javascript:evil'), null);
});
test('preserves distinct official records at same page', () => {
  const item = (title) => makeRecord({url:'https://example.org/catalog',title,source:'catalog',domain:'government',type:'notice'}, now);
  assert.equal(consolidate([item('one'),item('two'),item('one')]).length, 2);
});
test('reports source outages and excludes stale records', async () => {
  const feeds=[{id:'ok',domain:'government',type:'exercise',url:'https://a.example.org',extract:j=>j.items},{id:'bad',domain:'government',type:'exercise',url:'https://b.example.org',extract:j=>j.items}];
  const fetchImpl=async url => url.includes('b.example') ? {ok:false,status:503} : {ok:true,json:async()=>({items:[{url:'https://a.example.org/1',title:'current',publishedAt:'2026-10-28'},{url:'https://a.example.org/2',title:'old',publishedAt:'2020-01-01'}]})};
  const out=await collectOfficial({feeds,fetchImpl,now});
  assert.equal(out.records.length,1);
  assert.equal(out.sources[1].status,'failed');
});
test('never classifies a search lead as independently confirmed', async () => {
  const report=await buildReport({now,feeds:[],tasks:[['military','exercise']],searchFn:async()=>[{sourceUrl:'https://example.org/story',title:'claim',provider:'hackernews'}]});
  assert.equal(report.observations[0].verification,'unverified-lead');
  assert.equal(report.observations[0].independentlyCorroborated,false);
  assert.equal(report.assessment.predictedDate,null);
});
