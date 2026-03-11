import { NextResponse } from 'next/server';
import { prisma } from '@insertflow/database';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  const session = await getServerSession(authOptions);

  // Apenas admins podem executar migração
  if (!session?.user?.email || session.user.email !== 'admin@insertflow.com') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const templates = await prisma.template.findMany({
      select: {
        id: true,
        data: true,
      },
    });

    let migratedCount = 0;

    for (const template of templates) {
      let needsMigration = false;
      const data = template.data as any;

      if (!data.elements) continue;

      data.elements = data.elements.map((element: any) => {
        if (element.type !== 'text') return element;
        if (element.previewText !== undefined) return element;

        needsMigration = true;

        const hasVariable = /{{.*?}}/.test(element.content);

        return {
          ...element,
          previewText: element.content,
          variable: hasVariable ? element.content : null,
        };
      });

      if (needsMigration) {
        await prisma.template.update({
          where: { id: template.id },
          data: { data },
        });
        migratedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      migratedCount,
      totalTemplates: templates.length,
    });
  } catch (error) {
    console.error('Erro na migração:', error);
    return NextResponse.json(
      { error: 'Erro ao migrar templates' },
      { status: 500 }
    );
  }
}
