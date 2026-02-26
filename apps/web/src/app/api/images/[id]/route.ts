import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { getStorage, normalize } from '@insertflow/lib';

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const storage = getStorage();

    const image = await db.image.findUnique({
      where: { id: params.id },
    });

    if (!image) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Delete files from storage
    const paths = image.paths as any;
    await Promise.all([
      storage.delete(paths.original),
      storage.delete(paths.optimized),
      storage.delete(paths.thumb),
    ]);

    // Delete from database
    await db.image.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    const updateData: any = {};

    // Renomear imagem
    if (body.originalName) {
      updateData.originalName = body.originalName;
      updateData.normalizedName = normalize(body.originalName);
    }

    // Associar produto
    if (body.productId !== undefined) {
      updateData.productId = body.productId;
      updateData.matched = !!body.productId;
      updateData.matchMethod = 'manual';
    }

    const image = await db.image.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({ image });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update image' }, { status: 500 });
  }
}
