import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await requireOrg();

    const jobs = await prisma.generationJob.findMany({
      where: {
        orgId: session.user.orgId!,
      },
      include: {
        encartes: true,
        folder: {
          select: { name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
