import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { getStorage } from '@insertflow/lib';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireOrg();
    const orgId = session.user.orgId!;

    // Buscar o encarte com o job para verificar permissão
    const encarte = await prisma.generatedEncarte.findUnique({
      where: { id: params.id },
      include: {
        job: {
          select: { orgId: true },
        },
      },
    });

    if (!encarte) {
      return NextResponse.json({ error: 'Encarte não encontrado' }, { status: 404 });
    }

    if (encarte.job.orgId !== orgId) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
    }

    // Deletar arquivo do storage
    const storage = getStorage();
    try {
      await storage.delete(encarte.filePath);
    } catch (error) {
      console.error('Erro ao deletar arquivo:', error);
    }

    const jobId = encarte.jobId;

    // Deletar registro do banco
    await prisma.generatedEncarte.delete({
      where: { id: params.id },
    });

    // Verificar se o job ainda tem encartes
    const remainingEncartes = await prisma.generatedEncarte.count({
      where: { jobId },
    });

    // Se não tiver mais encartes, deletar o job também
    if (remainingEncartes === 0) {
      await prisma.generationJob.delete({
        where: { id: jobId },
      });
    }

    return NextResponse.json({ success: true, jobDeleted: remainingEncartes === 0 });
  } catch (error: any) {
    console.error('Delete encarte error:', error);
    return NextResponse.json({ error: 'Erro ao deletar encarte' }, { status: 500 });
  }
}
