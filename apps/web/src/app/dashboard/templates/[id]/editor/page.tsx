import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TemplateEditor } from './template-editor';

export default async function EditorPage({ params }: { params: { id: string } }) {
  const session = await requireOrg();

  const template = await prisma.template.findFirst({
    where: {
      id: params.id,
      orgId: session.user.orgId!,
    },
  });

  if (!template) {
    notFound();
  }

  return <TemplateEditor template={template} />;
}
