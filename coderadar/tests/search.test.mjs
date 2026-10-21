import {test} from 'node:test';import assert from 'node:assert/strict';
import {queryFor,normalize,github} from '../lib/search.mjs';import {validateCatalog} from '../evolution/validate.mjs';
test('capability query removes filler and constrains gems',()=>{assert.equal(queryFor('find me local llm','gems','Python'),'local llm in:name,description,readme archived:false stars:5..500 language:Python');});
test('advanced qualifiers preserved',()=>{assert.equal(queryFor('topic:agent stars:>30'),'topic:agent stars:>30 in:name,description,readme archived:false');});
test('empty and excessive queries rejected',()=>{assert.throws(()=>queryFor(''));assert.throws(()=>queryFor('x'.repeat(241)));});
test('unknown license remains unknown',()=>assert.equal(normalize({full_name:'a/b'}).license,'Unknown'));
test('rate limit surfaced instead of empty success',async()=>{await assert.rejects(github('/search/repositories',async()=>({ok:false,status:403})),/API access is limited/);});
test('catalog rejects invalid URLs, duplicate data and overstated evidence',()=>{const r={name:'a/b',url:'https://github.com/a/b',area:'memory',observedAt:'2026-10-20T00:00:00Z',evidence:'metadata'};assert.equal(validateCatalog([r]),true);assert.throws(()=>validateCatalog([r,r]),/Duplicate/);assert.throws(()=>validateCatalog([{...r,url:'https://evil.test/a'}]),/URL/);assert.throws(()=>validateCatalog([{...r,evidence:'execution-tested'}]),/evidence/);});
