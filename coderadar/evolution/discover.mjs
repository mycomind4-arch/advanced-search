import {writeFile,readFile,mkdir} from 'node:fs/promises';
import {packs,normalize} from '../lib/search.mjs';
import {validateCatalog} from './validate.mjs';
const token=process.env.GH_TOKEN;
if(!token)throw Error('GH_TOKEN is required in the GitHub Actions environment');
const headers={Accept:'application/vnd.github+json',Authorization:`Bearer ${token}`,'User-Agent':'CodeRadar-Evolution','X-GitHub-Api-Version':'2022-11-28'};
let old=[];try{old=JSON.parse(await readFile(new URL('./catalog.json',import.meta.url),'utf8'));}catch{}
const known=new Set(old.map(r=>r.url));const additions=[];const log=[];
for(const pack of packs){const q=pack.query+' archived:false stars:>10';const res=await fetch('https://api.github.com/search/repositories?'+new URLSearchParams({q,sort:'updated',per_page:'5'}),{headers,signal:AbortSignal.timeout(20000)});if(!res.ok)throw Error(`Discovery failed for ${pack.name}: ${res.status}`);const data=await res.json();log.push({area:pack.name,query:q,total:data.total_count});for(const raw of data.items){const r=normalize(raw);if(!known.has(r.url)&&old.length+additions.length<100){known.add(r.url);additions.push({...r,area:pack.name,observedAt:new Date().toISOString(),evidence:'metadata'});}}}
const catalog=[...old,...additions];validateCatalog(catalog);await writeFile(new URL('./catalog.json',import.meta.url),JSON.stringify(catalog,null,2)+'\n');await mkdir('evolution-report',{recursive:true});await writeFile('evolution-report/run.json',JSON.stringify({at:new Date().toISOString(),additions:additions.length,queries:log,status:'validated',limitations:['No discovered code executed','No license approval inferred','No automatic deployment']},null,2));console.log(JSON.stringify({additions:additions.length,total:catalog.length}));
