import type { SearchAdapter, SearchMode, SearchObservation, SearchRequest } from '../core/types.js';

abstract class HttpAdapter implements SearchAdapter {
  abstract readonly id: string;
  abstract readonly modes: SearchMode[];
  protected abstract endpoint: string;
  isAvailable(): Promise<boolean> { return Promise.resolve(Boolean(this.endpoint)); }
  async search(_request: SearchRequest): Promise<SearchObservation[]> {
    // Providers are intentionally disabled until credentials and their current terms/API contracts are configured.
    return [];
  }
}

export class TinEyeAdapter extends HttpAdapter {
  readonly id = 'tineye';
  readonly modes: SearchMode[] = ['image'];
  protected endpoint = process.env.TINEYE_API_URL ?? '';
}

export class GoogleVisionAdapter extends HttpAdapter {
  readonly id = 'google-vision';
  readonly modes: SearchMode[] = ['image', 'text', 'metadata'];
  protected endpoint = process.env.GOOGLE_VISION_API_URL ?? '';
}

export class WaybackAdapter extends HttpAdapter {
  readonly id = 'wayback';
  readonly modes: SearchMode[] = ['archive', 'image', 'text', 'document'];
  protected endpoint = process.env.WAYBACK_API_URL ?? 'https://web.archive.org';
}

export class CommonCrawlAdapter extends HttpAdapter {
  readonly id = 'common-crawl';
  readonly modes: SearchMode[] = ['archive', 'image', 'text', 'document'];
  protected endpoint = process.env.COMMON_CRAWL_API_URL ?? 'https://index.commoncrawl.org';
}

export class InsightFaceAdapter extends HttpAdapter {
  readonly id = 'insightface';
  readonly modes: SearchMode[] = ['face', 'image'];
  protected endpoint = process.env.INSIGHTFACE_API_URL ?? '';
}

export const builtInAdapters: SearchAdapter[] = [
  new TinEyeAdapter(),
  new GoogleVisionAdapter(),
  new WaybackAdapter(),
  new CommonCrawlAdapter(),
  new InsightFaceAdapter(),
];
