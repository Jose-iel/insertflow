import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { createProductSchema, normalize } from '@insertflow/lib';

export async function GET(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const processed = searchParams.get('processed');

    const where: any = {};
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { normalizedName: { contains: normalize(search) } },
      ];
    }
    
    if (processed !== null) {
      where.processed = processed === 'true';
    }

    const products = await db.product.findMany({
      where,
      include: {
        images: {
          select: { id: true, urls: true, matched: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ products });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();
    
    const validated = createProductSchema.parse(body);
    
    const product = await db.product.create({
      data: {
        ...validated,
        normalizedName: normalize(validated.name),
        orgId: session.user.orgId!,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}
