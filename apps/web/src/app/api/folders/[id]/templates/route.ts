import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireOrg();
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format');

    const where: any = {
      folderId: params.id,
      orgId: session.user.orgId!,
    };

    if (format) {
      where.format = format;
    }

    const templates = await prisma.template.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error: any) {
    console.error('[Templates API] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
