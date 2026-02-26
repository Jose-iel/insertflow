import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { Queue } from 'bullmq';
import { redis } from '@insertflow/lib';
import { prisma } from '@/lib/prisma';

const generationQueue = new Queue('encarte-generation', { connection: redis });

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const body = await req.json();

    // Validar input
    if (!body.folderId || !body.format || !body.productIds?.length) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    if (body.allocations && !Array.isArray(body.allocations)) {
      return NextResponse.json({ error: 'Invalid allocations format' }, { status: 400 });
    }

    // Criar registro do job no banco
    const generationJob = await prisma.generationJob.create({
      data: {
        orgId: session.user.orgId!,
        userId: session.user.id,
        folderId: body.folderId,
        format: body.format,
        status: 'pending',
        progress: 0,
        metadata: {
          productIds: body.productIds,
          globalData: body.globalData,
          allocations: body.allocations,
        },
      },
    });

    // Adicionar job na fila
    const job = await generationQueue.add('generate', {
      jobId: generationJob.id,
      orgId: session.user.orgId!,
      userId: session.user.id,
      folderId: body.folderId,
      format: body.format,
      productIds: body.productIds,
      globalData: body.globalData,
      allocations: body.allocations,
    });

    console.log('[Generation API] Job added to queue:', job.id, 'DB Job:', generationJob.id);

    return NextResponse.json({ jobId: generationJob.id }, { status: 202 });
  } catch (error: any) {
    console.error('[Generation API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
