'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, FolderOpen, FileText } from 'lucide-react';
import Link from 'next/link';

interface Folder {
  id: string;
  name: string;
  _count: {
    templates: number;
  };
}

export function FoldersList() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFolders();
  }, []);

  async function fetchFolders() {
    setLoading(true);
    try {
      const res = await fetch('/api/folders');
      const data = await res.json();
      setFolders(data.folders);
    } catch (error) {
      console.error('Failed to fetch folders:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteFolder(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta pasta? Os templates serão desvinculados.')) return;
    
    try {
      await fetch(`/api/folders/${id}`, { method: 'DELETE' });
      fetchFolders();
    } catch (error) {
      console.error('Failed to delete folder:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {folders.map((folder) => (
        <div
          key={folder.id}
          className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-8 w-8 text-yellow-500" />
              <div>
                <h3 className="font-semibold text-gray-900">{folder.name}</h3>
                <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                  <FileText className="h-4 w-4" />
                  {folder._count.templates} template(s)
                </p>
              </div>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost">
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => deleteFolder(folder.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="mt-4">
            <Link href={`/dashboard/folders/${folder.id}`}>
              <Button variant="outline" size="sm" className="w-full flex items-center justify-center gap-2">
                <FolderOpen className="h-4 w-4" />
                <span>Abrir Pasta</span>
              </Button>
            </Link>
          </div>
        </div>
      ))}

      {folders.length === 0 && (
        <div className="col-span-full py-12 text-center text-gray-500">
          Nenhuma pasta encontrada
        </div>
      )}
    </div>
  );
}
