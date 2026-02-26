'use client';

import { useEffect, useState } from 'react';
import { Button } from '@insertflow/ui';
import { Plus, ImageIcon, ChevronDown, ChevronUp } from 'lucide-react';

interface UnmatchedImage {
  id: string;
  originalName: string;
  urls: { thumb: string; optimized: string };
}

interface ProductSuggestion {
  imageId: string;
  imageName: string;
  imageUrl: string;
  suggestedName: string;
  price: string;
  selected: boolean;
}

interface UnmatchedImagesPanelProps {
  onProductsCreated: () => void;
}

export function UnmatchedImagesPanel({ onProductsCreated }: UnmatchedImagesPanelProps) {
  const [images, setImages] = useState<UnmatchedImage[]>([]);
  const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    fetchUnmatchedImages();
  }, []);

  async function fetchUnmatchedImages() {
    setLoading(true);
    try {
      const res = await fetch('/api/images?matched=false');
      const data = await res.json();
      setImages(data.images || []);
      
      // Filtrar imagens de background
      const filteredImages = (data.images || []).filter((img: UnmatchedImage) => {
        const name = img.originalName.toLowerCase();
        return !name.includes('bg') && 
               !name.includes('background') && 
               !name.includes('fundo') &&
               !name.includes('backdrop');
      });
      
      setImages(filteredImages);
      
      const newSuggestions: ProductSuggestion[] = filteredImages.map((img: UnmatchedImage) => ({
        imageId: img.id,
        imageName: img.originalName,
        imageUrl: img.urls.thumb,
        suggestedName: extractProductName(img.originalName),
        price: '',
        selected: true,
      }));
      setSuggestions(newSuggestions);
    } catch (error) {
      console.error('Failed to fetch unmatched images:', error);
    } finally {
      setLoading(false);
    }
  }

  function extractProductName(filename: string): string {
    return filename
      .replace(/\.[^/.]+$/, '')
      .replace(/[-_]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function updateSuggestion(imageId: string, field: 'suggestedName' | 'price' | 'selected', value: string | boolean) {
    setSuggestions(prev => 
      prev.map(s => 
        s.imageId === imageId ? { ...s, [field]: value } : s
      )
    );
  }

  function toggleAll(selected: boolean) {
    setSuggestions(prev => prev.map(s => ({ ...s, selected })));
  }

  async function createSelectedProducts() {
    const toCreate = suggestions.filter(s => s.selected && s.suggestedName.trim() && s.price);
    
    if (toCreate.length === 0) {
      alert('Preencha nome e preço dos produtos selecionados');
      return;
    }

    setCreating(true);
    try {
      for (const suggestion of toCreate) {
        const productRes = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: suggestion.suggestedName.trim(),
            price: parseFloat(suggestion.price),
          }),
        });

        if (productRes.ok) {
          const { product } = await productRes.json();
          
          await fetch(`/api/images/${suggestion.imageId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: product.id,
              matched: true,
              matchMethod: 'manual',
            }),
          });
        }
      }

      alert(`${toCreate.length} produto(s) criado(s) com sucesso!`);
      onProductsCreated();
      fetchUnmatchedImages();
    } catch (error) {
      console.error('Failed to create products:', error);
      alert('Erro ao criar produtos');
    } finally {
      setCreating(false);
    }
  }

  if (loading || images.length === 0) {
    return null;
  }

  const validCount = suggestions.filter(s => s.selected && s.suggestedName.trim() && s.price).length;

  return (
    <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 shadow-sm">
      {/* Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-blue-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-200">
            <ImageIcon className="h-5 w-5 text-blue-700" />
          </div>
          <div>
            <p className="font-semibold text-blue-900">
              {images.length} imagem(ns) sem produto
            </p>
            <p className="text-sm text-blue-700">
              Clique para criar produtos rapidamente
            </p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-blue-600" />
        ) : (
          <ChevronDown className="h-5 w-5 text-blue-600" />
        )}
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-blue-200 bg-white rounded-b-lg">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
              >
                Selecionar todos
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={() => toggleAll(false)}
                className="text-sm text-gray-500 hover:text-gray-700 hover:underline"
              >
                Limpar seleção
              </button>
            </div>
            <Button
              onClick={createSelectedProducts}
              disabled={creating || validCount === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-2"
            >
              <Plus className="h-5 w-5" />
              <span className="font-medium">{creating ? 'Criando...' : `Criar ${validCount} produto(s)`}</span>
            </Button>
          </div>

          {/* List */}
          <div className="max-h-[400px] overflow-y-auto">
            {suggestions.map((suggestion, index) => (
              <div
                key={suggestion.imageId}
                className={`flex items-center gap-4 px-4 py-3 ${
                  index !== suggestions.length - 1 ? 'border-b border-gray-100' : ''
                } ${suggestion.selected ? 'bg-blue-50/50' : 'bg-gray-50/50'}`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={suggestion.selected}
                  onChange={(e) => updateSuggestion(suggestion.imageId, 'selected', e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                
                {/* Image */}
                <img
                  src={suggestion.imageUrl}
                  alt={suggestion.imageName}
                  className="h-12 w-12 object-cover rounded-md border border-gray-200"
                />

                {/* Form Fields */}
                <div className="flex-1 flex items-center gap-3">
                  <input
                    type="text"
                    value={suggestion.suggestedName}
                    onChange={(e) => updateSuggestion(suggestion.imageId, 'suggestedName', e.target.value)}
                    placeholder="Nome do produto"
                    className="w-48 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                    disabled={!suggestion.selected}
                  />
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 font-medium">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      value={suggestion.price}
                      onChange={(e) => updateSuggestion(suggestion.imageId, 'price', e.target.value)}
                      placeholder="0,00"
                      className="w-32 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      disabled={!suggestion.selected}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
