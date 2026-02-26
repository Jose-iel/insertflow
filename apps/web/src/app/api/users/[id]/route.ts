import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, requireAuth } from '@/lib/auth-helpers';
import { updateUserSchema } from '@insertflow/lib';
import bcrypt from 'bcryptjs';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    
    // User pode ver apenas próprio perfil, Admin pode ver qualquer um
    if (session.user.role !== 'admin' && session.user.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: params.id },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({ user });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const session = await requireAuth();
    
    // User pode editar apenas próprio perfil, Admin pode editar qualquer um
    if (session.user.role !== 'admin' && session.user.id !== params.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    const body = await req.json();
    const validated = updateUserSchema.parse(body);
    
    const data: any = { ...validated };
    
    // Hash password if provided
    if (validated.password) {
      data.password = await bcrypt.hash(validated.password, 10);
    }
    
    // Only admin can change active status
    if (validated.active !== undefined && session.user.role !== 'admin') {
      delete data.active;
    }
    
    const user = await prisma.user.update({
      where: { id: params.id },
      data,
    });

    return NextResponse.json({ user });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireAdmin();
    
    await prisma.user.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete user' }, { status: 500 });
  }
}
