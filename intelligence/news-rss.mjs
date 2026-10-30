// News RSS provides discovery leads, not corroborated evidence.
const decode = (s = '') => String(s)
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)));

function tag(item, name) {
  const m = item.match(new RegExp('<' + name + '(?:\\s[^>]*)?>([\\s\\S]*?)</' + name + '>', 'i'));
  return m ? decode(m[1].trim()) : '';
}

export function parseRss(xml, limit = 5) {
  const blocks = [...String(xml).matchAll(/<item(?:\s[^>]*)?>([\s\S]*?)<\/item>/gi)];
  return blocks.slice(0, limit).map((m) => ({
    title: tag(m[1], 'title'),
    sourceUrl: tag(m[1], 'link'),
    publishedAt: tag(m[1], 'pubDate'),
    snippet: tag(m[1], 'description').replace(/<[^>]+>/g, '').slice(0, 250),
    provider: 'google-news-rss',
  })).filter((x) => x.title && /^https?:\/\//.test(x.sourceUrl));
}

export async function searchNewsRss(query, { fetchImpl = fetch } = {}) {
  const url = 'https://news.google.com/rss/search?q=' +
    encodeURIComponent(query + ' when:14d') + '&hl=en-US&gl=US&ceid=US:en';
  const res = await fetchImpl(url, {
    headers: { Accept: 'application/rss+xml, application/xml, text/xml' },
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) throw new Error('News RSS HTTP ' + res.status);
  return parseRss(await res.text());
}
