'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, Download, Eye, Trash2 } from 'lucide-react';
import { Button } from '@insertflow/ui';

interface GenerationJob {
  id: string;
  format: string;
  status: string;
  progress: number;
  createdAt: string;
  completedAt: string | null;
  encartes: {
    id: string;
    fileUrl: string;
    products: any[];
  }[];
}

export function GenerationHistory() {
  const [jobs, setJobs] = useState<GenerationJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<GenerationJob | null>(null);

  useEffect(() => {
    fetchJobs();
    
    // Auto-refresh a cada 5 segundos
    const interval = setInterval(() => {
      fetchJobs(false);
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);

  async function fetchJobs(showLoading = true) {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch('/api/generation/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  async function handleDeleteEncarte(encarteId: string) {
    if (!confirm('Tem certeza que deseja deletar este encarte?')) return;

    try {
      const res = await fetch(`/api/generation/encartes/${encarteId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Atualizar a lista
        fetchJobs(false);
        // Se o job selecionado tinha esse encarte, atualizar
        if (selectedJob) {
          const updatedEncartes = selectedJob.encartes.filter(e => e.id !== encarteId);
          if (updatedEncartes.length === 0) {
            setSelectedJob(null);
          } else {
            setSelectedJob({ ...selectedJob, encartes: updatedEncartes });
          }
        }
      } else {
        alert('Erro ao deletar encarte');
      }
    } catch (error) {
      console.error('Delete error:', error);
      alert('Erro ao deletar encarte');
    }
  }

  function getStatusBadge(status: string) {
    const styles: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800',
    };

    const labels: Record<string, string> = {
      pending: 'Pendente',
      processing: 'Processando',
      completed: 'Concluído',
      failed: 'Falhou',
    };

    return (
      <span className={`rounded-full px-2 py-1 text-xs ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
        {labels[status] || status}
      </span>
    );
  }

  if (loading) {
    return <div className="text-center py-12">Carregando histórico...</div>;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Histórico de Gerações</h2>
        <Button size="sm" variant="ghost" onClick={() => fetchJobs()}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {jobs.length === 0 ? (
        <p className="text-sm text-gray-500">Nenhuma geração encontrada</p>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div key={job.id} className="border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(job.status)}
                    <span className="text-sm font-medium">
                      {job.format === 'feed' ? 'Feed' : 'Stories'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(job.createdAt).toLocaleString('pt-BR')}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {job.status === 'processing' && (
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 transition-all"
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{job.progress}%</span>
                    </div>
                  )}

                  {job.status === 'completed' && job.encartes.length > 0 && (
                    <Button size="sm" variant="ghost" onClick={() => setSelectedJob(job)}>
                      <Eye className="h-4 w-4 mr-1" />
                      Ver ({job.encartes.length})
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de visualização */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-lg bg-white p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                Encartes Gerados ({selectedJob.encartes.length})
              </h3>
              <Button variant="ghost" onClick={() => setSelectedJob(null)}>
                Fechar
              </Button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {selectedJob.encartes.map((encarte, index) => (
                <div key={encarte.id} className="border rounded-lg overflow-hidden">
                  <img
                    src={encarte.fileUrl}
                    alt={`Encarte ${index + 1}`}
                    className="w-full h-auto"
                  />
                  <div className="p-2 bg-gray-50 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-500">
                        {encarte.products.length} produto(s)
                      </p>
                      <a
                        href={encarte.fileUrl}
                        download
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Download className="h-3 w-3" />
                        Download
                      </a>
                    </div>
                    <button
                      onClick={() => handleDeleteEncarte(encarte.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Deletar encarte"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
