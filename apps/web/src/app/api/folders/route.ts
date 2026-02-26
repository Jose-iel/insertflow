import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { createFolderSchema } from '@insertflow/lib';

export async function GET() {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    
    const folders = await db.folder.findMany({
      include: {
        _count: {
          select: { templates: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({ folders });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = createFolderSchema.parse(body);
    
    const folder = await db.folder.create({
      data: {
        ...validated,
        orgId: session.user.orgId!,
      },
    });

    return NextResponse.json({ folder }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create folder' }, { status: 500 });
  }
}
