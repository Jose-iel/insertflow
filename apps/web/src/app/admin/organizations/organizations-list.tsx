'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, Users, Package } from 'lucide-react';
import Link from 'next/link';

interface Organization {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  _count: {
    users: number;
    products: number;
    templates: number;
  };
}

export function OrganizationsList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  async function fetchOrganizations() {
    setLoading(true);
    try {
      const res = await fetch('/api/organizations');
      const data = await res.json();
      setOrganizations(data.organizations);
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteOrganization(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta organização? Todos os dados serão perdidos.')) return;
    
    try {
      await fetch(`/api/organizations/${id}`, { method: 'DELETE' });
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to delete organization:', error);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await fetch(`/api/organizations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      fetchOrganizations();
    } catch (error) {
      console.error('Failed to update organization:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="rounded-lg bg-white shadow overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organização
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Slug
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Usuários
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Produtos
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {organizations.map((org) => (
            <tr key={org.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {org.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {org.slug}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  {org._count.users}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  <Package className="h-4 w-4" />
                  {org._count.products}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <button
                  onClick={() => toggleActive(org.id, org.active)}
                  className={`rounded-full px-2 py-1 text-xs ${
                    org.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {org.active ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/organizations/${org.id}`}>
                    <Button size="sm" variant="ghost">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteOrganization(org.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {organizations.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          Nenhuma organização encontrada
        </div>
      )}
    </div>
  );
}
