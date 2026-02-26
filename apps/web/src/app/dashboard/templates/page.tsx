import { requireOrg } from '@/lib/auth-helpers';
import { TemplatesList } from './templates-list';
import { CreateTemplateButton } from './create-template-button';

export default async function TemplatesPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Templates</h1>
          <CreateTemplateButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <TemplatesList />
      </main>
    </div>
  );
}
