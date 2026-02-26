'use client';

import { useEffect, useState } from 'react';
import { Trash2, Link as LinkIcon, Pencil, Check, X } from 'lucide-react';
import { Button } from '@insertflow/ui';

interface Image {
  id: string;
  originalName: string;
  urls: { thumb: string; optimized: string };
  matched: boolean;
  matchMethod: string | null;
  product: { id: string; name: string } | null;
}

export function ImageGallery() {
  const [images, setImages] = useState<Image[]>([]);
  const [filter, setFilter] = useState<'all' | 'matched' | 'unmatched'>('all');
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    fetchImages();
  }, [filter]);

  async function fetchImages() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === 'matched') params.set('matched', 'true');
      if (filter === 'unmatched') params.set('matched', 'false');

      const res = await fetch(`/api/images?${params}`);
      const data = await res.json();
      setImages(data.images);
    } catch (error) {
      console.error('Failed to fetch images:', error);
    } finally {
      setLoading(false);
    }
  }

  async function deleteImage(id: string) {
    if (!confirm('Tem certeza que deseja deletar esta imagem?')) return;

    try {
      await fetch(`/api/images/${id}`, { method: 'DELETE' });
      fetchImages();
    } catch (error) {
      console.error('Failed to delete image:', error);
    }
  }

  function startEditing(image: Image) {
    setEditingId(image.id);
    setEditingName(image.originalName);
  }

  function cancelEditing() {
    setEditingId(null);
    setEditingName('');
  }

  async function saveRename(id: string) {
    if (!editingName.trim()) return;

    try {
      await fetch(`/api/images/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalName: editingName.trim() }),
      });
      setEditingId(null);
      setEditingName('');
      fetchImages();
    } catch (error) {
      console.error('Failed to rename image:', error);
    }
  }

  if (loading) {
    return <div className="text-center py-12">Carregando...</div>;
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Galeria</h2>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={filter === 'all' ? 'default' : 'outline'}
            className={filter === 'all' ? 'text-white' : ''}
            onClick={() => setFilter('all')}
          >
            Todas
          </Button>
          <Button
            size="sm"
            variant={filter === 'matched' ? 'default' : 'outline'}
            className={filter === 'matched' ? 'text-white' : ''}
            onClick={() => setFilter('matched')}
          >
            Com Match
          </Button>
          <Button
            size="sm"
            variant={filter === 'unmatched' ? 'default' : 'outline'}
            className={filter === 'unmatched' ? 'text-white' : ''}
            onClick={() => setFilter('unmatched')}
          >
            Sem Match
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {images.map((image) => (
          <div key={image.id} className="group relative rounded-lg border overflow-hidden">
            <img
              src={image.urls.thumb}
              alt={image.originalName}
              className="w-full h-48 object-cover"
            />
            <div className="p-2">
              {editingId === image.id ? (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 text-xs border rounded px-1 py-0.5"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') saveRename(image.id);
                      if (e.key === 'Escape') cancelEditing();
                    }}
                  />
                  <button
                    onClick={() => saveRename(image.id)}
                    className="text-green-600 hover:text-green-800"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={cancelEditing}
                    className="text-red-600 hover:text-red-800"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <p className="text-xs font-medium truncate flex-1">{image.originalName}</p>
                  <button
                    onClick={() => startEditing(image)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-gray-600 transition-opacity"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                </div>
              )}
              {image.product ? (
                <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                  <LinkIcon className="h-3 w-3" />
                  {image.product.name}
                  {image.matchMethod === 'ai' && ' (IA)'}
                </p>
              ) : (
                <p className="text-xs text-red-600 mt-1">Sem match</p>
              )}
            </div>
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => deleteImage(image.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      {images.length === 0 && (
        <div className="py-12 text-center text-gray-500">Nenhuma imagem encontrada</div>
      )}
    </div>
  );
}
