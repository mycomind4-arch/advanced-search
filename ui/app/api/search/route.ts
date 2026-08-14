import { runPipeline, type PipelineEvent } from '@/lib/server/engine';
import type { SearchRequest } from '@/lib/types';

// SSE streaming endpoint for search execution.
// Sends real-time pipeline stage updates as adapters and agents run.
export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { query, mode } = body;
  if (!query || typeof query !== 'string') {
    return new Response(JSON.stringify({ error: 'Query is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const searchRequest: SearchRequest = {
    id: `search-${Date.now()}`,
    mode: mode ?? 'text',
    query,
    budget: {
      maxJobs: 40,
      maxDepth: 2,
      timeoutMs: 15000,
    },
  };

  // Create a ReadableStream that emits SSE events
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (event: PipelineEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      try {
        await runPipeline(searchRequest, sendEvent);
      } catch (err) {
        sendEvent({ type: 'done', error: String(err) });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// GET endpoint — returns available adapters and pipeline info
export async function GET() {
  const { getAvailableAdapters } = await import('@/lib/server/adapters');
  return Response.json({
    adapters: getAvailableAdapters(),
    pipeline: 'ready',
  });
}
