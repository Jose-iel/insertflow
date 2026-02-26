'use client';

import { useState, useEffect } from 'react';
import { Button } from '@insertflow/ui';
import { useRouter } from 'next/navigation';
import { Search, Pencil, Check, X, Zap } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  price: number;
}

export function GenerationForm() {
  const router = useRouter();
  const [folders, setFolders] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedFolder, setSelectedFolder] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<'feed' | 'stories'>('feed');
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  useEffect(() => {
    fetchFolders();
    fetchProducts();
  }, []);

  async function fetchFolders() {
    const res = await fetch('/api/folders');
    const data = await res.json();
    setFolders(data.folders || []);
  }

  async function fetchProducts() {
    const res = await fetch('/api/products');
    const data = await res.json();
    setProducts(data.products || []);
  }

  async function handleGenerate() {
    if (!selectedFolder || selectedProducts.length === 0) {
      alert('Selecione uma pasta e pelo menos um produto');
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch('/api/generation/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folderId: selectedFolder,
          format: selectedFormat,
          productIds: selectedProducts,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Geração iniciada! Job ID: ${data.jobId}`);
        router.refresh();
      } else {
        alert(`Erro: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to start generation:', error);
      alert('Erro ao iniciar geração');
    } finally {
      setGenerating(false);
    }
  }

  function selectAllFiltered() {
    const filteredIds = filteredProducts.map((p) => p.id);
    setSelectedProducts([...new Set([...selectedProducts, ...filteredIds])]);
  }

  function deselectAllProducts() {
    setSelectedProducts([]);
  }

  function startEditing(product: Product) {
    setEditingProduct(product.id);
    setEditName(product.name);
    setEditPrice(String(product.price));
  }

  function cancelEditing() {
    setEditingProduct(null);
    setEditName('');
    setEditPrice('');
  }

  async function saveEdit(productId: string) {
    try {
      await fetch(`/api/products/${productId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          price: parseFloat(editPrice),
        }),
      });
      
      setProducts(products.map(p => 
        p.id === productId 
          ? { ...p, name: editName.trim(), price: parseFloat(editPrice) }
          : p
      ));
      cancelEditing();
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Erro ao atualizar produto');
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <h2 className="text-lg font-semibold mb-4">Nova Geração</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2">Pasta de Templates</label>
          <select
            value={selectedFolder}
            onChange={(e) => setSelectedFolder(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >
            <option value="">Selecione uma pasta</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Formato</label>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="feed"
                checked={selectedFormat === 'feed'}
                onChange={(e) => setSelectedFormat(e.target.value as 'feed')}
                className="text-blue-600"
              />
              <span>Feed (3:4)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="stories"
                checked={selectedFormat === 'stories'}
                onChange={(e) => setSelectedFormat(e.target.value as 'stories')}
                className="text-blue-600"
              />
              <span>Stories (9:16)</span>
            </label>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium">
              Produtos ({selectedProducts.length} selecionados)
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs text-blue-600 hover:underline"
              >
                Selecionar filtrados
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={deselectAllProducts}
                className="text-xs text-gray-600 hover:underline"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar produtos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-md border border-gray-300 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-72 overflow-y-auto border rounded-md">
            {filteredProducts.length === 0 ? (
              <p className="text-sm text-gray-500 p-4 text-center">
                {products.length === 0 ? 'Nenhum produto pendente encontrado' : 'Nenhum produto encontrado para a busca'}
              </p>
            ) : (
              filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 px-3 py-2 border-b last:border-b-0 ${
                    selectedProducts.includes(product.id) ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedProducts.includes(product.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProducts([...selectedProducts, product.id]);
                      } else {
                        setSelectedProducts(selectedProducts.filter((id) => id !== product.id));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  
                  {editingProduct === product.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 px-2 py-1 text-sm border rounded"
                        autoFocus
                      />
                      <span className="text-sm text-gray-500">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(e.target.value)}
                        className="w-20 px-2 py-1 text-sm border rounded"
                      />
                      <button
                        onClick={() => saveEdit(product.id)}
                        className="p-1 text-green-600 hover:text-green-800"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditing}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm">{product.name}</span>
                      <span className="text-sm text-gray-600 font-medium">
                        R$ {Number(product.price).toFixed(2)}
                      </span>
                      <button
                        onClick={() => startEditing(product)}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Editar produto"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        <Button 
          onClick={handleGenerate} 
          disabled={generating || selectedProducts.length === 0 || !selectedFolder} 
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium"
        >
          <Zap className="h-5 w-5" />
          <span>{generating ? 'Gerando...' : `Gerar ${selectedProducts.length} Encarte(s)`}</span>
        </Button>
      </div>
    </div>
  );
}
