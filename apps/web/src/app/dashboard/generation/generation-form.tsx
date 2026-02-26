'use client';

import { useState, useEffect } from 'react';
import { Button } from '@insertflow/ui';
import { useRouter } from 'next/navigation';
import { Search, Pencil, Check, X, Zap, Upload } from 'lucide-react';
import { VariableDetector, CustomVariable } from '@/lib/generation/variable-detector';
import { ProductDivider } from '@/lib/generation/product-divider';

interface Product {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface TemplateAllocation {
  template: any;
  productIds: string[];
  customVariables: CustomVariable[];
  customValues: Record<string, string>;
  highlightProductIds: string[];
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
  const [step, setStep] = useState<'select' | 'configure'>('select');
  const [allocations, setAllocations] = useState<TemplateAllocation[]>([]);
  const [uploadingVar, setUploadingVar] = useState<string | null>(null);

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

  async function calculateAllocations() {
    if (!selectedFolder || selectedProducts.length === 0) {
      alert('Selecione uma pasta e pelo menos um produto');
      return;
    }

    try {
      const res = await fetch(`/api/folders/${selectedFolder}/templates?format=${selectedFormat}`);
      const data = await res.json();
      const templates = data.templates || [];

      console.log('Templates encontrados:', templates);

      if (templates.length === 0) {
        alert('Nenhum template encontrado nesta pasta para o formato selecionado');
        return;
      }

      const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));
      console.log('Produtos selecionados:', selectedProductsData);

      const divider = new ProductDivider();
      const rawAllocations = divider.divide(selectedProductsData, templates);

      console.log('Alocações calculadas:', rawAllocations);

      const detector = new VariableDetector();
      const templateAllocations: TemplateAllocation[] = rawAllocations.map((alloc) => {
        const customVariables = detector.detect(alloc.template.data);
        
        return {
          template: alloc.template,
          productIds: alloc.products.map(p => p.id),
          customVariables,
          customValues: {},
          highlightProductIds: [],
        };
      });

      setAllocations(templateAllocations);
      setStep('configure');
    } catch (error: any) {
      console.error('Failed to calculate allocations:', error);
      alert(`Erro ao calcular divisão de produtos: ${error.message || error}`);
    }
  }

  async function handleGenerate() {
    if (step === 'select') {
      await calculateAllocations();
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
          allocations: allocations.map(alloc => ({
            templateId: alloc.template.id,
            productIds: alloc.productIds,
            customValues: alloc.customValues,
            highlightProductIds: alloc.highlightProductIds,
          })),
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert(`Geração iniciada! Job ID: ${data.jobId}`);
        router.refresh();
        setStep('select');
        setAllocations([]);
        setSelectedProducts([]);
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

  async function handleVariableImageUpload(allocIndex: number, varName: string, file: File) {
    setUploadingVar(`${allocIndex}-${varName}`);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const res = await fetch('/api/images/upload-temp', {
        method: 'POST',
        body: formData,
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setAllocations(allocations.map((alloc, i) => 
          i === allocIndex 
            ? { ...alloc, customValues: { ...alloc.customValues, [varName]: data.url } }
            : alloc
        ));
      } else {
        alert('Erro ao fazer upload da imagem');
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      alert('Erro ao fazer upload');
    } finally {
      setUploadingVar(null);
    }
  }

  function updateCustomValue(allocIndex: number, varName: string, value: string) {
    setAllocations(allocations.map((alloc, i) => 
      i === allocIndex 
        ? { ...alloc, customValues: { ...alloc.customValues, [varName]: value } }
        : alloc
    ));
  }

  function toggleHighlightProduct(allocIndex: number, productId: string) {
    setAllocations(allocations.map((alloc, i) => {
      if (i !== allocIndex) return alloc;
      
      const isSelected = alloc.highlightProductIds.includes(productId);
      const maxHighlights = alloc.template.highlightSlots || 0;
      
      if (isSelected) {
        return {
          ...alloc,
          highlightProductIds: alloc.highlightProductIds.filter(id => id !== productId),
        };
      } else {
        if (alloc.highlightProductIds.length >= maxHighlights) {
          alert(`Este template suporta no máximo ${maxHighlights} produto(s) em destaque`);
          return alloc;
        }
        return {
          ...alloc,
          highlightProductIds: [...alloc.highlightProductIds, productId],
        };
      }
    }));
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

        {step === 'configure' && allocations.length > 0 && (
          <div className="space-y-6 border-t pt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Configuração dos Encartes</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStep('select');
                  setAllocations([]);
                }}
              >
                ← Voltar
              </Button>
            </div>

            <p className="text-sm text-gray-600">
              Seus {selectedProducts.length} produtos serão divididos em {allocations.length} encarte(s). 
              Configure cada um abaixo:
            </p>

            {allocations.map((alloc, allocIndex) => (
              <div key={allocIndex} className="border rounded-lg p-4 bg-gray-50">
                <h4 className="font-medium mb-3">
                  Encarte {allocIndex + 1} - {alloc.template.name}
                </h4>
                
                <p className="text-sm text-gray-600 mb-4">
                  {alloc.productIds.length} produto(s): {alloc.productIds.map(id => 
                    products.find(p => p.id === id)?.name
                  ).join(', ')}
                </p>

                {alloc.template.highlightSlots > 0 && (
                  <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded">
                    <label className="block text-sm font-medium mb-2">
                      Produtos em Destaque ({alloc.highlightProductIds.length}/{alloc.template.highlightSlots})
                    </label>
                    <p className="text-xs text-gray-600 mb-2">
                      Selecione até {alloc.template.highlightSlots} produto(s) para posições de destaque:
                    </p>
                    <div className="space-y-1">
                      {alloc.productIds.map(productId => {
                        const product = products.find(p => p.id === productId);
                        if (!product) return null;
                        
                        return (
                          <label key={productId} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={alloc.highlightProductIds.includes(productId)}
                              onChange={() => toggleHighlightProduct(allocIndex, productId)}
                              className="rounded text-amber-600"
                            />
                            <span className="text-sm">{product.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {alloc.customVariables.length > 0 && (
                  <div className="space-y-3">
                    <label className="block text-sm font-medium">
                      Campos Customizados
                    </label>
                    
                    {alloc.customVariables.map((variable) => (
                      <div key={variable.name}>
                        <label className="block text-sm text-gray-700 mb-1">
                          {variable.placeholder}
                        </label>
                        
                        {variable.type === 'text' ? (
                          <input
                            type="text"
                            value={alloc.customValues[variable.name] || ''}
                            onChange={(e) => updateCustomValue(allocIndex, variable.name, e.target.value)}
                            placeholder={`Digite ${(variable.placeholder || variable.name).toLowerCase()}`}
                            className="w-full rounded border px-3 py-2 text-sm"
                          />
                        ) : (
                          <div className="flex items-center gap-2">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleVariableImageUpload(allocIndex, variable.name, file);
                              }}
                              className="hidden"
                              id={`upload-${allocIndex}-${variable.name}`}
                              disabled={uploadingVar === `${allocIndex}-${variable.name}`}
                            />
                            <label
                              htmlFor={`upload-${allocIndex}-${variable.name}`}
                              className="flex items-center gap-2 px-3 py-2 bg-white border rounded cursor-pointer hover:bg-gray-50 text-sm"
                            >
                              <Upload className="h-4 w-4" />
                              <span>
                                {uploadingVar === `${allocIndex}-${variable.name}` 
                                  ? 'Enviando...' 
                                  : alloc.customValues[variable.name]
                                  ? 'Trocar imagem'
                                  : 'Escolher imagem'
                                }
                              </span>
                            </label>
                            
                            {alloc.customValues[variable.name] && (
                              <button
                                onClick={() => updateCustomValue(allocIndex, variable.name, '')}
                                className="p-2 text-red-600 hover:text-red-800"
                                title="Remover imagem"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        )}
                        
                        {!alloc.customValues[variable.name] && (
                          <p className="text-xs text-gray-500 mt-1">
                            Opcional - deixe vazio para gerar em branco
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {alloc.customVariables.length === 0 && alloc.template.highlightSlots === 0 && (
                  <p className="text-sm text-gray-500 italic">
                    Nenhuma configuração adicional necessária para este template
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        <Button 
          onClick={handleGenerate} 
          disabled={generating || selectedProducts.length === 0 || !selectedFolder} 
          className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white py-3 text-base font-medium"
        >
          <Zap className="h-5 w-5" />
          <span>
            {generating 
              ? 'Gerando...' 
              : step === 'select'
              ? `Continuar com ${selectedProducts.length} Produto(s)`
              : `Gerar ${allocations.length} Encarte(s)`
            }
          </span>
        </Button>
      </div>
    </div>
  );
}
