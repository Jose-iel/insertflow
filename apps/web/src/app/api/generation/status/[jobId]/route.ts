import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request, { params }: { params: { jobId: string } }) {
  try {
    const session = await requireOrg();

    const job = await prisma.generationJob.findFirst({
      where: {
        id: params.jobId,
        orgId: session.user.orgId!,
      },
      include: {
        encartes: true,
      },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json({ job });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
