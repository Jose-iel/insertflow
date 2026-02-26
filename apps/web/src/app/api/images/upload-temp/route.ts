import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { getStorage } from '@insertflow/lib';

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    
    const tempPath = `org-${session.user.orgId}/temp/${Date.now()}-${file.name}`;
    await storage.upload(buffer, tempPath, file.type);
    
    const url = await storage.getUrl(tempPath);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[Upload Temp] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
