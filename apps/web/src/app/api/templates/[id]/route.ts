import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    const template = await db.template.update({
      where: { id: params.id },
      data: {
        name: body.name,
        productSlots: body.productSlots,
        data: body.data,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();

    await db.template.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
