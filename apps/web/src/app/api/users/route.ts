import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { createUserSchema } from '@insertflow/lib';
import bcrypt from 'bcryptjs';

export async function GET(req: Request) {
  try {
    await requireAdmin();
    
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');

    const where: any = {};
    if (orgId) where.orgId = orgId;

    const users = await prisma.user.findMany({
      where,
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ users });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    
    const validated = createUserSchema.parse(body);
    
    const hashedPassword = await bcrypt.hash(validated.password, 10);
    
    const user = await prisma.user.create({
      data: {
        email: validated.email,
        name: validated.name,
        password: hashedPassword,
        role: validated.role,
        orgId: validated.orgId || null,
      },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create user' }, { status: 500 });
  }
}
