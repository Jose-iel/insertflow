import { requireAdmin } from '@/lib/auth-helpers';
import { UsersList } from './users-list';
import { CreateUserButton } from './create-user-button';

export default async function UsersPage() {
  await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold">Usuários</h1>
          <CreateUserButton />
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <UsersList />
      </main>
    </div>
  );
}
