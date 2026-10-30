import ResearchDashboard from '@/components/intelligence/ResearchDashboard';

export const dynamic = 'force-dynamic';

const BASE = 'https://raw.githubusercontent.com/mycomind4-arch/advanced-search/intelligence-history/intelligence/data/';

async function readHistory(path: 'latest.json' | 'index.json'): Promise<unknown | null> {
  try {
    const response = await fetch(BASE + path, { next: { revalidate: 300 } });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export default async function GlobalIntelligencePage() {
  const [latest, index] = await Promise.all([
    readHistory('latest.json'), readHistory('index.json'),
  ]);
  return <ResearchDashboard latest={latest} history={index} />;
}
