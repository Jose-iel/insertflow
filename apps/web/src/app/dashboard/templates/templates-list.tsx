'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Trash2, Edit, Copy, Layout } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Template {
  id: string;
  name: string;
  format: 'feed' | 'stories';
  productSlots: number;
  folder: {
    id: string;
    name: string;
  } | null;
}

export function TemplatesList() {
  const searchParams = useSearchParams();
  const folderId = searchParams.get('folderId');
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'feed' | 'stories'>('all');

  useEffect(() => {
    fetchTemplates();
  }, [folderId, filter]);

  async function fetchTemplates() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (folderId) params.set('folderId', folderId);
      if (filter !== 'all') params.set('format', filter);
      
      const res = await fetch(`/api/templates?${params}`);
      const data = await res.json();
      setTemplates(data.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteTemplate(id: string) {
    if (!confirm('Tem certeza que deseja deletar este template?')) return;
    
    try {
      await fetch(`/api/templates/${id}`, { method: 'DELETE' });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to delete template:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Button
          size="sm"
          variant={filter === 'all' ? 'default' : 'outline'}
          onClick={() => setFilter('all')}
          className={filter === 'all' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          Todos
        </Button>
        <Button
          size="sm"
          variant={filter === 'feed' ? 'default' : 'outline'}
          onClick={() => setFilter('feed')}
          className={filter === 'feed' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          Feed (3:4)
        </Button>
        <Button
          size="sm"
          variant={filter === 'stories' ? 'default' : 'outline'}
          onClick={() => setFilter('stories')}
          className={filter === 'stories' ? 'bg-blue-600 hover:bg-blue-700 text-white' : ''}
        >
          Stories (9:16)
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => (
          <div
            key={template.id}
            className="rounded-lg bg-white p-6 shadow hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <Layout className="h-8 w-8 text-blue-500" />
                <div>
                  <h3 className="font-semibold text-gray-900">{template.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {template.format === 'feed' ? 'Feed (3:4)' : 'Stories (9:16)'}
                    {' • '}
                    {template.productSlots} produto(s)
                  </p>
                  {template.folder && (
                    <p className="text-xs text-gray-400 mt-1">
                      📁 {template.folder.name}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" title="Duplicar">
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => deleteTemplate(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Link href={`/dashboard/templates/${template.id}/editor`}>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full flex items-center justify-center gap-2 border-blue-600 text-blue-600 hover:bg-blue-50"
                >
                  <Edit className="h-4 w-4" />
                  <span>Editar Template</span>
                </Button>
              </Link>
            </div>
          </div>
        ))}

        {templates.length === 0 && (
          <div className="col-span-full py-12 text-center text-gray-500">
            Nenhum template encontrado
          </div>
        )}
      </div>
    </div>
  );
}
