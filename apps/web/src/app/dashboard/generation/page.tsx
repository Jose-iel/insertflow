import { requireOrg } from '@/lib/auth-helpers';
import { GenerationForm } from './generation-form';
import { GenerationHistory } from './generation-history';

export default async function GenerationPage() {
  await requireOrg();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Gerar Encartes</h1>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 space-y-6">
        <GenerationForm />
        <GenerationHistory />
      </main>
    </div>
  );
}
