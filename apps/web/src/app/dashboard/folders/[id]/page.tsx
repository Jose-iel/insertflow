import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { FolderDetails } from './folder-details';

interface Props {
  params: { id: string };
}

export default async function FolderPage({ params }: Props) {
  const session = await requireOrg();
  
  const folder = await prisma.folder.findFirst({
    where: {
      id: params.id,
      orgId: session.user.orgId!,
    },
    include: {
      templates: {
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!folder) {
    notFound();
  }

  // Buscar encartes gerados para esta pasta
  const generationJobs = await prisma.generationJob.findMany({
    where: {
      folderId: folder.id,
      orgId: session.user.orgId!,
      status: { in: ['completed', 'completed_partial'] },
    },
    include: {
      encartes: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard/folders" 
              className="text-gray-500 hover:text-gray-700"
            >
              ← Voltar
            </Link>
            <h1 className="text-3xl font-bold">{folder.name}</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <FolderDetails 
          folder={folder} 
          templates={folder.templates}
          generationJobs={generationJobs}
        />
      </main>
    </div>
  );
}
