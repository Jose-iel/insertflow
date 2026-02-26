import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';

export async function GET(req: Request) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();

    const { searchParams } = new URL(req.url);
    const matched = searchParams.get('matched');

    const where: any = {};
    if (matched !== null) {
      where.matched = matched === 'true';
    }

    const images = await db.image.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ images });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
