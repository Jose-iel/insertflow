import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { redis } from '@insertflow/lib';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    await redis.ping();

    return NextResponse.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: 'ok',
        redis: 'ok',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message,
      },
      { status: 503 }
    );
  }
}
