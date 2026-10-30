import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRss, searchNewsRss } from './news-rss.mjs';

test('RSS parser extracts headlines without claiming verification', () => {
  const xml = '<rss><channel><item><title>Exercise &amp; response</title><link>https://news.google.com/rss/articles/abc</link><pubDate>Fri, 30 Oct 2026 00:00:00 GMT</pubDate><description>Public report</description></item></channel></rss>';
  const records = parseRss(xml);
  assert.equal(records.length, 1);
  assert.equal(records[0].title, 'Exercise & response');
  assert.equal(records[0].provider, 'google-news-rss');
});
test('RSS fetch failures are visible instead of invented headlines', async () => {
  await assert.rejects(searchNewsRss('test', {fetchImpl: async()=>({ok:false,status:429})}), /429/);
});
