import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { TEMPLATE_DIMENSIONS } from '@insertflow/lib/template-types';

export async function GET(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    const format = searchParams.get('format');

    const where: any = {};
    if (folderId) where.folderId = folderId;
    if (format) where.format = format;

    const templates = await db.template.findMany({
      where,
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    const dimensions = TEMPLATE_DIMENSIONS[body.format as 'feed' | 'stories'];

    const template = await db.template.create({
      data: {
        name: body.name,
        orgId: session.user.orgId!,
        folderId: body.folderId || null,
        format: body.format,
        width: dimensions.width,
        height: dimensions.height,
        productSlots: body.productSlots || 1,
        data: {
          background: { type: 'color', value: '#ffffff' },
          elements: [],
        },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
