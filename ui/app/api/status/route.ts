import { NextResponse } from 'next/server';

// System status API — returns agent and source information

export async function GET() {
  return NextResponse.json({
    agents: 14,
    sources: {
      configured: 2,
      total: 10,
    },
    engine: 'online',
    version: '0.1.0',
  });
}
