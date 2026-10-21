import { env } from 'cloudflare:workers';
import { github as publicGithub } from './search.mjs';
export function github(path:string){return publicGithub(path,fetch,(env as Record<string,unknown>).GITHUB_TOKEN as string||'');}
