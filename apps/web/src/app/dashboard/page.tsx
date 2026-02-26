import { requireOrg } from '@/lib/auth-helpers';
import { Package, FolderOpen, Layout, Image } from 'lucide-react';
import Link from 'next/link';

export default async function DashboardPage() {
  const session = await requireOrg();

  const quickLinks = [
    { href: '/dashboard/products', label: 'Produtos', icon: Package, color: 'bg-blue-500' },
    { href: '/dashboard/folders', label: 'Pastas', icon: FolderOpen, color: 'bg-yellow-500' },
    { href: '/dashboard/templates', label: 'Templates', icon: Layout, color: 'bg-green-500' },
    { href: '/dashboard/images', label: 'Imagens', icon: Image, color: 'bg-purple-500' },
  ];

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Olá, {session.user.name}!
        </h1>
        <p className="text-gray-600 mt-1">
          Bem-vindo ao InsertFlow. O que você gostaria de fazer hoje?
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block p-6 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
          >
            <div className={`w-12 h-12 ${link.color} rounded-lg flex items-center justify-center mb-4`}>
              <link.icon className="h-6 w-6 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{link.label}</h3>
          </Link>
        ))}
      </div>

      {session.user.role === 'admin' && (
        <div className="mt-8 p-4 bg-purple-50 rounded-lg border border-purple-200">
          <p className="text-purple-800">
            Você é um administrador.{' '}
            <Link href="/admin" className="font-semibold underline">
              Acessar painel administrativo
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
