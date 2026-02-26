'use client';

import { useState } from 'react';
import { Button } from '@insertflow/ui';
import { Layout, Image as ImageIcon, Edit, Download, Eye, X, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Template {
  id: string;
  name: string;
  format: 'feed' | 'stories';
  productSlots: number;
  createdAt: Date;
}

interface Encarte {
  id: string;
  fileUrl: string;
  products: any[];
  createdAt: Date;
}

interface GenerationJob {
  id: string;
  format: string;
  status: string;
  createdAt: Date;
  encartes: Encarte[];
}

interface Folder {
  id: string;
  name: string;
}

interface FolderDetailsProps {
  folder: Folder;
  templates: Template[];
  generationJobs: GenerationJob[];
}

export function FolderDetails({ folder, templates, generationJobs }: FolderDetailsProps) {
  const [activeTab, setActiveTab] = useState<'templates' | 'encartes'>('templates');
  const [selectedEncarte, setSelectedEncarte] = useState<Encarte | null>(null);
  const [encartesList, setEncartesList] = useState(() => 
    generationJobs.flatMap(job => 
      job.encartes.map(e => ({ ...e, jobFormat: job.format, jobDate: job.createdAt }))
    )
  );
  const router = useRouter();

  async function handleDeleteEncarte(encarteId: string) {
    if (!confirm('Tem certeza que deseja deletar este encarte?')) return;

    try {
      const res = await fetch(`/api/generation/encartes/${encarteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setEncartesList(prev => prev.filter(e => e.id !== encarteId));
        if (selectedEncarte?.id === encarteId) {
          setSelectedEncarte(null);
        }
      } else {
        alert('Erro ao deletar encarte');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erro ao deletar encarte');
    }
  }

  const allEncartes = encartesList;

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b">
        <button
          onClick={() => setActiveTab('templates')}
          className={`pb-3 px-1 font-medium ${
            activeTab === 'templates'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Layout className="inline h-4 w-4 mr-2" />
          Templates ({templates.length})
        </button>
        <button
          onClick={() => setActiveTab('encartes')}
          className={`pb-3 px-1 font-medium ${
            activeTab === 'encartes'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ImageIcon className="inline h-4 w-4 mr-2" />
          Encartes Gerados ({allEncartes.length})
        </button>
      </div>

      {/* Templates Tab */}
      {activeTab === 'templates' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Templates da Pasta</h2>
            <Link href={`/dashboard/templates?folderId=${folder.id}`}>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                Gerenciar Templates
              </Button>
            </Link>
          </div>

          {templates.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <Layout className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum template nesta pasta</p>
              <Link href={`/dashboard/templates?folderId=${folder.id}`}>
                <Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Criar Template
                </Button>
              </Link>
            </div>
          ) : (
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
                      </div>
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
                        <span>Editar</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Encartes Tab */}
      {activeTab === 'encartes' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Encartes Gerados</h2>
            <Link href="/dashboard/generation">
              <Button className="bg-green-600 hover:bg-green-700 text-white">
                Gerar Novos Encartes
              </Button>
            </Link>
          </div>

          {allEncartes.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow">
              <ImageIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum encarte gerado para esta pasta</p>
              <Link href="/dashboard/generation">
                <Button className="mt-4 bg-green-600 hover:bg-green-700 text-white">
                  Gerar Encartes
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {allEncartes.map((encarte) => (
                <div
                  key={encarte.id}
                  className="rounded-lg bg-white shadow overflow-hidden group"
                >
                  <div className="relative">
                    <img
                      src={encarte.fileUrl}
                      alt="Encarte"
                      className="w-full h-auto"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => setSelectedEncarte(encarte)}
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                        title="Visualizar"
                      >
                        <Eye className="h-5 w-5 text-gray-700" />
                      </button>
                      <a
                        href={encarte.fileUrl}
                        download
                        className="p-2 bg-white rounded-full hover:bg-gray-100"
                        title="Download"
                      >
                        <Download className="h-5 w-5 text-gray-700" />
                      </a>
                      <button
                        onClick={() => handleDeleteEncarte(encarte.id)}
                        className="p-2 bg-white rounded-full hover:bg-red-100"
                        title="Deletar"
                      >
                        <Trash2 className="h-5 w-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-gray-500">
                      {encarte.products.length} produto(s)
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(encarte.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal de visualização */}
      {selectedEncarte && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="relative max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setSelectedEncarte(null)}
              className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 z-10"
            >
              <X className="h-6 w-6" />
            </button>
            <img
              src={selectedEncarte.fileUrl}
              alt="Encarte"
              className="max-w-full max-h-[85vh] object-contain"
            />
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
              <a
                href={selectedEncarte.fileUrl}
                download
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg hover:bg-gray-100 shadow"
              >
                <Download className="h-5 w-5" />
                Download
              </a>
              <button
                onClick={() => handleDeleteEncarte(selectedEncarte.id)}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 shadow"
              >
                <Trash2 className="h-5 w-5" />
                Deletar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
