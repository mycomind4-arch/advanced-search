export function queryFor(input, mode='discover', language='') {
 const raw=String(input||'').trim();
 if(!raw || raw.length>240) throw new Error('Enter a search between 1 and 240 characters.');
 const stop=new Set(['find','me','a','an','the','that','can','with','for','i','want','to','build','code','which','and','is','of','my']);
 const terms=raw.includes(':')?raw:raw.toLowerCase().split(/\s+/).filter(w=>!stop.has(w)).slice(0,6).join(' ');
 return `${terms || raw} in:name,description,readme archived:false${mode==='gems'?' stars:5..500':''}${language?' language:'+language:''}`;
}
export function normalize(r) {return {id:r.id,name:r.full_name,url:r.html_url,description:r.description||'No description supplied.',stars:r.stargazers_count,forks:r.forks_count,language:r.language||'Unknown',license:r.license?.spdx_id||'Unknown',updated:r.pushed_at,topics:r.topics||[],issues:r.open_issues_count,archived:!!r.archived};}
export async function github(path, fetcher=fetch, token='') {
 const res=await fetcher('https://api.github.com'+path,{headers:{...(token?{Authorization:'Bearer '+token}:{}),Accept:'application/vnd.github+json','User-Agent':'CodeRadar','X-GitHub-Api-Version':'2022-11-28'},signal:AbortSignal.timeout(12000)});
 if(!res.ok) {const e=new Error(res.status===403||res.status===429?'GitHub API access is limited. Retry after the quota resets, or configure a server-side GITHUB_TOKEN for reliable access.':'GitHub request failed ('+res.status+').'); e.status=res.status; throw e;}
 return res.json();
}
export const packs=[{name:'Agent memory',query:'agent memory',description:'Persistent context and retrieval for autonomous agents.'},{name:'Local intelligence',query:'local llm',description:'Run language models on your own hardware.'},{name:'Browser automation',query:'browser automation',description:'Tools that interact with real web applications.'},{name:'Code understanding',query:'code search',description:'Index, navigate and understand large repositories.'},{name:'Document engines',query:'pdf extraction',description:'Extract structured information from documents.'},{name:'Signal discovery',query:'wifi sensing',description:'Explore research tools for wireless sensing.'}];
