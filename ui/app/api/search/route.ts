import { NextResponse } from 'next/server';

// Search API route — bridges the UI to the core search architecture.
// In production, this would import from the core library and invoke real adapters.
// Currently returns structured metadata about the search pipeline.

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, mode } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'Query is required' }, { status: 400 });
    }

    // Return pipeline stage information
    // Real adapter execution requires configured provider credentials
    return NextResponse.json({
      searchId: `search-${Date.now()}`,
      query,
      mode: mode ?? 'text',
      status: 'pipeline-ready',
      message: 'Pipeline stages prepared. Provider execution requires configured credentials.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
