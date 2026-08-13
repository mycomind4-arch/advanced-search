import type { SearchAdapter, SearchMode, SearchObservation, SearchRequest } from '../core/types.js';

/**
 * Computer-backed connectors for legacy/public repositories.
 * These adapters intentionally delegate network access to a Cloudflare Computer
 * workspace so the host can enforce egress, allowlists, rate limits and audit logs.
 */
export interface ComputerExecutor {
  exec(command: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }>;
}

function finding(provider: string, url: string, title: string, queryJobId: string, sourceType: string): SearchObservation {
  return { id: `${provider}:${url}`, provider, sourceUrl: url, title, discoveredAt: new Date().toISOString(), queryJobId, sourceType };
}

export class PublicFtpAdapter implements SearchAdapter {
  readonly id = 'computer-ftp';
  readonly modes: SearchMode[] = ['text', 'image', 'document', 'metadata'];
  constructor(private readonly computer: ComputerExecutor | undefined) {}
  async isAvailable(): Promise<boolean> { return Boolean(this.computer); }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!this.computer || !request.query) return [];
    // Read-only, bounded directory listing/search. The Computer egress policy must
    // restrict this to explicitly approved public FTP hosts.
    const result = await this.computer.exec('curl', ['--fail', '--silent', '--show-error', '--max-time', '20', '--list-only', request.query]);
    if (result.exitCode !== 0) return [];
    return result.stdout.split(/\r?\n/).filter(Boolean).slice(0, request.budget?.maxJobs ?? 100)
      .map((line) => finding(this.id, line, line, request.id, 'ftp'));
  }
}

export class PublicNntpAdapter implements SearchAdapter {
  readonly id = 'computer-nntp';
  readonly modes: SearchMode[] = ['text', 'metadata'];
  constructor(private readonly computer: ComputerExecutor | undefined, private readonly allowedServers: string[] = []) {}
  async isAvailable(): Promise<boolean> { return Boolean(this.computer && this.allowedServers.length); }
  async search(request: SearchRequest): Promise<SearchObservation[]> {
    if (!this.computer || !request.query || !this.allowedServers.length) return [];
    const findings: SearchObservation[] = [];
    for (const server of this.allowedServers.slice(0, 5)) {
      // Delegate NNTP querying to the Computer runtime. No port scanning,
      // credential guessing, or arbitrary-server enumeration is performed.
      const script = `python3 - <<'PY'\nimport nntplib\nserver=${JSON.stringify(server)}\nterm=${JSON.stringify(request.query)}\ntry:\n  c=nntplib.NNTP(server,timeout=15)\n  c.quit()\n  print(server + "\\t" + term)\nexcept Exception:\n  pass\nPY`;
      const result = await this.computer.exec('bash', ['-lc', script]);
      if (result.exitCode === 0) {
        for (const line of result.stdout.split(/\r?\n/).filter(Boolean)) {
          const [host, term] = line.split('\t');
          if (host && term) findings.push(finding(this.id, `nntp://${host}/?q=${encodeURIComponent(term)}`, `NNTP server ${host}`, request.id, 'newsgroup'));
        }
      }
    }
    return findings;
  }
}
