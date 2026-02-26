'use client';

import { useState, useEffect } from 'react';
import { Button } from '@insertflow/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Folder {
  id: string;
  name: string;
}

export function CreateTemplateButton() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [name, setName] = useState('');
  const [format, setFormat] = useState<'feed' | 'stories'>('feed');
  const [folderId, setFolderId] = useState('');
  const [productSlots, setProductSlots] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchFolders();
    }
  }, [isOpen]);

  async function fetchFolders() {
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          format,
          folderId: folderId || null,
          productSlots: parseInt(productSlots),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setIsOpen(false);
        setName('');
        setFormat('feed');
        setFolderId('');
        setProductSlots('1');
        router.push(`/dashboard/templates/${data.template.id}/editor`);
      } else {
        const data = await res.json();
        setError(data.error || 'Erro ao criar template');
      }
    } catch (error) {
      setError('Erro ao criar template');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Button 
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
      >
        <Plus className="h-4 w-4" />
        <span>Novo Template</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-white p-6">
            <h2 className="text-xl font-bold">Novo Template</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              {error && (
                <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Formato
                </label>
                <select
                  value={format}
                  onChange={(e) => setFormat(e.target.value as 'feed' | 'stories')}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="feed">Feed (1080x1440 - 3:4)</option>
                  <option value="stories">Stories (1080x1920 - 9:16)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Pasta
                </label>
                <select
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  <option value="">Sem pasta</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantidade de Produtos
                </label>
                <select
                  value={productSlots}
                  onChange={(e) => setProductSlots(e.target.value)}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10, 12].map((n) => (
                    <option key={n} value={n}>
                      {n} produto(s)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-2">
                <Button 
                  type="submit" 
                  disabled={loading} 
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Criando...' : 'Criar e Editar'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
