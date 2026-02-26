import { NextResponse } from 'next/server';
import { getStorage } from '@insertflow/lib';

export async function GET(req: Request, { params }: { params: { path: string[] } }) {
  try {
    const storage = getStorage();
    const filePath = params.path.join('/');

    const buffer = await storage.download(filePath);

    // Determine content type from extension
    const ext = filePath.split('.').pop()?.toLowerCase();
    const contentType =
      ext === 'webp'
        ? 'image/webp'
        : ext === 'png'
        ? 'image/png'
        : ext === 'jpg' || ext === 'jpeg'
        ? 'image/jpeg'
        : 'application/octet-stream';

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 });
  }
}
