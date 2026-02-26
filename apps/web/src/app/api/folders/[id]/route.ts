import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { updateFolderSchema } from '@insertflow/lib';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    
    const folder = await db.folder.findUnique({
      where: { id: params.id },
      include: {
        templates: {
          select: { id: true, name: true, format: true },
        },
        _count: {
          select: { templates: true },
        },
      },
    });

    if (!folder) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 });
    }

    return NextResponse.json({ folder });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = updateFolderSchema.parse(body);
    
    const folder = await db.folder.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ folder });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update folder' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    
    await db.folder.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete folder' }, { status: 500 });
  }
}
