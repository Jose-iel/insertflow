import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { updateOrganizationSchema } from '@insertflow/lib';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    
    const organization = await prisma.organization.findUnique({
      where: { id: params.id },
      include: {
        users: true,
        _count: {
          select: { products: true, templates: true, folders: true },
        },
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    return NextResponse.json({ organization });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    const body = await req.json();
    
    const validated = updateOrganizationSchema.parse(body);
    
    const organization = await prisma.organization.update({
      where: { id: params.id },
      data: validated,
    });

    return NextResponse.json({ organization });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update organization' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    
    await prisma.organization.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
  }
}
