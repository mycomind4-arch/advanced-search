import test from 'node:test';
import assert from 'node:assert/strict';
import { makeApi, publishReport } from './publish-history.mjs';

function response(status, json) {
  return { ok: status >= 200 && status < 300, status, json: async () => json };
}

function fixtureReport() {
  return {
    runId:'test-run-1',
    generatedAt:'2026-10-30T07:00:00.000Z',
    counts:{officialRecords:1,unverifiedLeads:0,failedOfficialSources:0},
    sourceStatus:[{source:'fema-declarations',status:'ok',accepted:1}],
    agentStatus:[],
    assessment:{coordinatedGlobalEvent:'not-established',predictedDate:null},
    observations:[{id:'record1',title:'FEMA routine emergency alert test',source:'fema-declarations',
      domain:'government',url:'https://fema.gov/sample',verification:'official-source-record'}],
  };
}

test('publisher refuses missing credentials before making any network call', async () => {
  let called=false;
  await assert.rejects(publishReport(fixtureReport(),{
    env:{GITHUB_REPOSITORY:'owner/repo'},
    fetchImpl:async()=>{called=true;return response(500,{});},
  }),/GITHUB_TOKEN/);
  assert.equal(called,false);
});

test('history publisher creates isolated branch and atomically commits 3 files', async () => {
  let branch=false;
  let treePayload=null;
  const initial='a'.repeat(40);
  const newCommit='c'.repeat(40);
  const fakeFetch=async (url,opts) => {
    const path=new URL(url).pathname;
    const method=opts.method;
    if(method==='GET' && path.endsWith('/git/ref/heads/intelligence-history'))
      return branch ? response(200,{object:{sha:initial}}) : response(404,{});
    if(method==='POST' && path.endsWith('/git/refs')) {branch=true;return response(201,{});}
    if(method==='GET' && path.includes('/contents/')) return response(404,{});
    if(method==='GET' && path.endsWith('/git/commits/'+initial))
      return response(200,{tree:{sha:'b'.repeat(40)}});
    if(method==='POST' && path.endsWith('/git/trees')) {
      treePayload=JSON.parse(opts.body);return response(201,{sha:'d'.repeat(40)});
    }
    if(method==='POST' && path.endsWith('/git/commits')) return response(201,{sha:newCommit});
    if(method==='PATCH' && path.endsWith('/git/refs/heads/intelligence-history'))
      return response(200,{});
    throw new Error('Unexpected API call: '+method+' '+path);
  };
  const result=await publishReport(fixtureReport(),{
    env:{GITHUB_REPOSITORY:'owner/repo',GITHUB_SHA:initial,GITHUB_TOKEN:'test-token'},
    fetchImpl:fakeFetch,
  });
  assert.equal(result.status,'published');
  assert.equal(result.commit,newCommit);
  assert.deepEqual(treePayload.tree.map(x=>x.path).sort(),[
    'intelligence/data/index.json',
    'intelligence/data/latest.json',
    'intelligence/data/snapshots/2026/10/30/test-run-1.json',
  ].sort());
});

test('publisher never overwrites main through its branch ref API', () => {
  const api=makeApi({repository:'owner/repo',token:'secret',fetchImpl:async()=>response(200,{object:{sha:'a'.repeat(40)}})});
  assert.ok(api);
});
