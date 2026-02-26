import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { optimizeImage } from '@/lib/image-optimizer';
import { prisma } from '@/lib/prisma';
import { getStorage, normalize } from '@insertflow/lib';

// Match por nome normalizado (sem IA)
async function matchByName(imageName: string, orgId: string): Promise<string | null> {
  const normalized = normalize(imageName);
  const product = await prisma.product.findFirst({
    where: { 
      orgId,
      normalizedName: normalized,
    },
    select: { id: true },
  });
  return product?.id || null;
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const orgId = session.user.orgId!;

    // Parse multipart form data
    const formData = await req.formData();
    const files = formData.getAll('images') as File[];

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const storage = getStorage();
    const results = [];

    for (const file of files) {
      // Validate file
      if (!file.type.startsWith('image/')) {
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB
        continue;
      }

      // Convert to buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Get format
      const format = file.type.split('/')[1];

      // Optimize image
      const optimized = await optimizeImage({
        orgId,
        productName: file.name,
        originalBuffer: buffer,
        originalFormat: format,
      });

      // Match por nome (sem IA)
      const productId = await matchByName(file.name, orgId);

      // Save to database
      const image = await prisma.image.create({
        data: {
          orgId,
          productId,
          originalName: file.name,
          normalizedName: normalize(file.name),
          format,
          size: optimized.size,
          width: optimized.width,
          height: optimized.height,
          paths: {
            original: optimized.original,
            optimized: optimized.optimized,
            thumb: optimized.thumb,
          },
          urls: {
            original: storage.getUrl(optimized.original),
            optimized: storage.getUrl(optimized.optimized),
            thumb: storage.getUrl(optimized.thumb),
          },
          matched: !!productId,
          matchMethod: productId ? 'exact' : 'none',
        },
      });

      results.push({
        image,
        matchedProduct: productId
          ? await prisma.product.findUnique({ where: { id: productId } })
          : null,
      });
    }

    return NextResponse.json({ results }, { status: 201 });
  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Failed to upload images' }, { status: 500 });
  }
}
