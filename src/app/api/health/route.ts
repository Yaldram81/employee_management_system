import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Self-ping endpoint to keep the server alive in containerized environments
// where idle processes get killed
export async function GET() {
  const startTime = Date.now();
  
  try {
    // Check database connection
    const { db } = await import('@/lib/db');
    await db.$queryRaw`SELECT 1`;
    
    const responseTime = Date.now() - startTime;
    const memUsage = process.memoryUsage();
    
    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
      checks: {
        database: 'connected',
        server: 'running',
      },
    });
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const memUsage = process.memoryUsage();
    
    return NextResponse.json({
      status: 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      responseTime: `${responseTime}ms`,
      memory: {
        rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      },
      checks: {
        database: 'disconnected',
        server: 'running',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    }, { status: 503 });
  }
}
