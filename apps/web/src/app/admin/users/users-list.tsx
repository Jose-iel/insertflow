'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, Shield, User } from 'lucide-react';

interface UserData {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  organization: {
    id: string;
    name: string;
  } | null;
}

export function UsersList() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users);
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteUser(id: string) {
    if (!confirm('Tem certeza que deseja deletar este usuário?')) return;
    
    try {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
    }
  }

  async function toggleActive(id: string, active: boolean) {
    try {
      await fetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !active }),
      });
      fetchUsers();
    } catch (error) {
      console.error('Failed to update user:', error);
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
              Usuário
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Email
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Organização
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Papel
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
          {users.map((user) => (
            <tr key={user.id}>
              <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900">
                {user.name}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.email}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                {user.organization?.name || '-'}
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <span className="flex items-center gap-1">
                  {user.role === 'admin' ? (
                    <>
                      <Shield className="h-4 w-4 text-purple-600" />
                      Admin
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4 text-gray-400" />
                      Usuário
                    </>
                  )}
                </span>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                <button
                  onClick={() => toggleActive(user.id, user.active)}
                  className={`rounded-full px-2 py-1 text-xs ${
                    user.active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {user.active ? 'Ativo' : 'Inativo'}
                </button>
              </td>
              <td className="whitespace-nowrap px-6 py-4 text-right text-sm font-medium">
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteUser(user.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && (
        <div className="py-12 text-center text-gray-500">
          Nenhum usuário encontrado
        </div>
      )}
    </div>
  );
}
