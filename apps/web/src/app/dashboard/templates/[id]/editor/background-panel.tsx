'use client';

import { useState, useEffect } from 'react';
import { TemplateBackground } from '@insertflow/lib/template-types';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

interface GalleryImage {
  id: string;
  urls: { thumb: string; optimized: string };
  originalName: string;
}

interface BackgroundPanelProps {
  background: TemplateBackground;
  onUpdate: (background: TemplateBackground) => void;
}

const PRESET_COLORS = [
  '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6',
  '#000000', '#212529', '#343a40', '#495057',
  '#dc3545', '#fd7e14', '#ffc107', '#28a745',
  '#17a2b8', '#007bff', '#6610f2', '#e83e8c',
];

export function BackgroundPanel({ background, onUpdate }: BackgroundPanelProps) {
  const [showGallery, setShowGallery] = useState(false);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadGalleryImages() {
    setLoading(true);
    try {
      const res = await fetch('/api/images');
      if (res.ok) {
        const data = await res.json();
        setImages(data.images || []);
      }
    } catch (error) {
      console.error('Failed to load images:', error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (showGallery && images.length === 0) {
      loadGalleryImages();
    }
  }, [showGallery]);

  return (
    <div className="p-4 border-b">
      <h3 className="font-semibold mb-3">Fundo do Template</h3>

      <div className="space-y-3">
        {/* Tipo de fundo */}
        <div>
          <label className="text-sm font-medium">Tipo</label>
          <select
            value={background.type}
            onChange={(e) => onUpdate({ 
              type: e.target.value as TemplateBackground['type'], 
              value: background.value 
            })}
            className="w-full rounded border px-2 py-1.5 text-sm bg-white mt-1"
          >
            <option value="color">Cor Sólida</option>
            <option value="gradient">Gradiente</option>
            <option value="image">Imagem</option>
          </select>
        </div>

        {/* Cor sólida */}
        {background.type === 'color' && (
          <>
            <div>
              <label className="text-sm font-medium">Cor</label>
              <input
                type="color"
                value={background.value}
                onChange={(e) => onUpdate({ type: 'color', value: e.target.value })}
                className="w-full h-10 rounded border mt-1"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Cores rápidas:</label>
              <div className="grid grid-cols-8 gap-1">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => onUpdate({ type: 'color', value: color })}
                    className={`w-6 h-6 rounded border ${
                      background.value === color ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
          </>
        )}

        {/* Gradiente */}
        {background.type === 'gradient' && (
          <div>
            <label className="text-sm font-medium">CSS Gradiente</label>
            <input
              type="text"
              value={background.value}
              onChange={(e) => onUpdate({ type: 'gradient', value: e.target.value })}
              placeholder="linear-gradient(45deg, #ff0000, #0000ff)"
              className="w-full rounded border px-2 py-1 text-sm mt-1"
            />
            <div className="mt-2">
              <label className="text-xs text-gray-500 mb-1 block">Gradientes prontos:</label>
              <div className="grid grid-cols-4 gap-1">
                {[
                  'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                  'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                  'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                  'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                  'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                  'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                  'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
                ].map((gradient, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => onUpdate({ type: 'gradient', value: gradient })}
                    className={`w-full h-8 rounded border ${
                      background.value === gradient ? 'ring-2 ring-blue-500' : ''
                    }`}
                    style={{ background: gradient }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Imagem */}
        {background.type === 'image' && (
          <div className="space-y-2">
            <div>
              <label className="text-sm font-medium">URL da Imagem</label>
              <input
                type="text"
                value={background.value}
                onChange={(e) => onUpdate({ type: 'image', value: e.target.value })}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full rounded border px-2 py-1 text-sm mt-1"
              />
            </div>

            <div>
              <button
                type="button"
                onClick={() => setShowGallery(!showGallery)}
                className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800"
              >
                <ImageIcon className="h-4 w-4" />
                {showGallery ? 'Fechar galeria' : 'Selecionar da galeria'}
              </button>
            </div>

            {showGallery && (
              <div className="border rounded p-2 bg-gray-50 max-h-48 overflow-y-auto">
                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                  </div>
                ) : images.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center py-4">
                    Nenhuma imagem na galeria
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-1">
                    {images.map((img) => (
                      <button
                        key={img.id}
                        type="button"
                        onClick={() => {
                          onUpdate({ type: 'image', value: img.urls.optimized });
                          setShowGallery(false);
                        }}
                        className={`aspect-square rounded overflow-hidden border-2 hover:border-blue-500 ${
                          background.value === img.urls.optimized ? 'border-blue-500' : 'border-transparent'
                        }`}
                        title={img.originalName}
                      >
                        <img
                          src={img.urls.thumb}
                          alt={img.originalName}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <p className="text-xs text-gray-500">
              Ou use variável: <code className="bg-gray-100 px-1 rounded">{'{{fundo_produto_1}}'}</code>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
