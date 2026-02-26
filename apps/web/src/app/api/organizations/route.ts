import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth-helpers';
import { createOrganizationSchema } from '@insertflow/lib';

export async function GET() {
  try {
    await requireAdmin();
    
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: { users: true, products: true, templates: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ organizations });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    await requireAdmin();
    const body = await req.json();
    
    const validated = createOrganizationSchema.parse(body);
    
    const organization = await prisma.organization.create({
      data: validated,
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create organization' }, { status: 500 });
  }
}
