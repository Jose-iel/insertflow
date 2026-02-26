import { requireAdmin } from '@/lib/auth-helpers';
import { Building2, Users } from 'lucide-react';
import Link from 'next/link';

export default async function AdminPage() {
  await requireAdmin();

  const adminLinks = [
    { href: '/admin/organizations', label: 'Organizações', icon: Building2, description: 'Gerenciar organizações do sistema' },
    { href: '/admin/users', label: 'Usuários', icon: Users, description: 'Gerenciar usuários e permissões' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Painel Administrativo</h1>
        <p className="text-gray-600 mt-1">
          Gerencie organizações e usuários do sistema.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {adminLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className="w-12 h-12 bg-purple-500 rounded-lg flex items-center justify-center mb-4">
              <link.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{link.label}</h3>
            <p className="text-gray-600 mt-1">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
