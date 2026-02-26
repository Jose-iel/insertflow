# SPEC_08_GERACAO_DINAMICA_IMAGENS - Geração Dinâmica e Otimização de Imagens

**Data:** 2026-02-26  
**Autor:** Agente SPEC  
**PRD Base:** TEMP_PRD.md (Features 2, 3B e 4)  
**Depende de:** SPEC_07_EDITOR_VARIAVEIS_GRUPOS, SPEC_05_GENERATION_ENGINE, SPEC_03_IMAGE_MANAGEMENT

---

## Visão Geral

Implementar três funcionalidades relacionadas à geração de encartes e processamento de imagens:
1. **Feature 2** - Detecção e preenchimento de variáveis customizadas na tela de geração
2. **Feature 3B** - Seleção de produtos destaque durante a geração
3. **Feature 4** - Redimensionamento automático de imagens para 800x900 no upload

## Análise do Estado Atual

### Descobertas Principais:

**Fluxo de Geração Atual:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/generation/generation-form.tsx:44-77` - Formulário envia apenas `folderId`, `format`, `productIds`
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/api/generation/start/route.ts:36-44` - API aceita `globalData` mas não é usado no form
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/lib/generation/product-divider.ts:20-56` - Divide produtos entre templates
- Não existe etapa de configuração por template após divisão

**Variable Injector:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/lib/generation/variable-injector.ts:38-68` - Suporta apenas variáveis padrão (`{{nome_produto_N}}`, `{{preco_produto_N}}`, `{{imagem_produto_N}}`)
- Não detecta variáveis customizadas
- Não suporta injeção de valores customizados

**Image Optimizer:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/lib/image-optimizer.ts:27-46` - Cria 3 versões: original, optimized (2000x2000), thumb (200x200)
- Usa Sharp com `fit: 'inside'` para optimized
- Não adiciona fundo branco, apenas redimensiona

**Estrutura de Dados:**
- `EncarteAllocation` contém apenas `template` e `products[]`
- Não há campo para produtos destaque
- Não há campo para valores de variáveis customizadas

## Estado Final Desejado

### Feature 2 - Variáveis Customizadas:
- Sistema detecta variáveis customizadas em templates automaticamente
- Tela de geração mostra campos para preencher variáveis customizadas
- Campos agrupados por template
- Se não preencher, gera em branco (sem erro)
- Suporta variáveis de texto e imagem

### Feature 3B - Produtos Destaque:
- Tela de geração mostra seleção de produtos destaque por template
- Apenas para templates com `highlightSlots > 0`
- Validação: máximo de seleções = `highlightSlots`
- Produtos destaque são selecionados dos produtos já alocados
- Injeção diferenciada para produtos destaque vs normais

### Feature 4 - Redimensionamento 800x900:
- Upload de imagem redimensiona automaticamente para 800x900
- Mantém proporção + adiciona fundo branco
- Imagem centralizada no canvas
- Aplicado na versão "optimized"

### Verificação:
- Criar template com `{{imagem_destaque}}` e grupo destaque
- Iniciar geração com 10 produtos
- Ver sugestão de divisão
- Ver campos de variável customizada
- Ver seleção de produtos destaque
- Preencher campos
- Gerar encartes
- Verificar que variáveis foram injetadas corretamente
- Upload de imagem 1200x800 → resultado 800x900 com fundo branco

## O Que NÃO Estamos Fazendo

- ❌ Validação de tipo de variável (texto vs imagem) - aceita qualquer valor
- ❌ Preview de como ficará o encarte antes de gerar
- ❌ Edição de produtos destaque após geração iniciada
- ❌ Múltiplos valores para mesma variável customizada em templates diferentes
- ❌ Redimensionamento com outros fundos além de branco
- ❌ Opção de desabilitar redimensionamento automático

## Abordagem de Implementação

### Estratégia Geral:
1. **Feature 4 primeiro** - É independente e mais simples (modificar image-optimizer)
2. **Feature 2 depois** - Detecção de variáveis e UI de preenchimento
3. **Feature 3B por último** - Depende da estrutura criada na Feature 2

### Fluxo da Geração Modificado:
1. Usuário seleciona pasta, formato, produtos (igual)
2. **NOVO:** Sistema busca templates e divide produtos
3. **NOVO:** Para cada alocação, detecta variáveis customizadas e highlightSlots
4. **NOVO:** Mostra UI de configuração por template
5. **NOVO:** Usuário preenche variáveis customizadas e seleciona produtos destaque
6. Clica "Gerar Encartes"
7. **NOVO:** API recebe dados customizados e mapeamento de destaque
8. Worker injeta valores customizados e produtos destaque

---

## Fase 1: Feature 4 - Redimensionamento 800x900

### Visão Geral
Modificar image-optimizer para redimensionar imagens para 800x900 com fundo branco.

### Mudanças Necessárias:

#### 1. Image Optimizer - Adicionar Redimensionamento 800x900

**Arquivo**: `apps/web/src/lib/image-optimizer.ts`

**Mudanças**: Modificar criação da versão optimized (linhas 27-34)

```typescript
// Modificar a seção "2. Create optimized version"
// ANTES: resize(2000, 2000, { fit: 'inside' })
// DEPOIS: resize 800x900 com fundo branco

// 2. Create optimized version (800x900 com fundo branco)
const optimizedBuffer = await sharp(originalBuffer)
  .resize(800, 900, {
    fit: 'contain', // Mantém proporção dentro de 800x900
    background: { r: 255, g: 255, b: 255, alpha: 1 }, // Fundo branco
  })
  .webp({ quality: 85 })
  .toBuffer();
```

**Explicação:**
- `fit: 'contain'` - Redimensiona mantendo proporção, imagem cabe dentro de 800x900
- `background: white` - Preenche espaço vazio com branco
- Imagem é automaticamente centralizada pelo Sharp

### Critérios de Sucesso:

#### Verificação Automatizada:
- [x] Type checking passa: `npm run typecheck`
- [x] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Upload de imagem 1200x800 (landscape) → resultado 800x600 centralizado em 800x900 com padding branco top/bottom
- [ ] Upload de imagem 600x1200 (portrait) → resultado 450x900 centralizado em 800x900 com padding branco left/right
- [ ] Upload de imagem 800x900 (exato) → mantém 800x900 sem padding
- [ ] Upload de imagem 400x450 (menor) → não aumenta, adiciona padding branco
- [ ] Verificar dimensões finais: sempre 800x900
- [ ] Verificar que fundo é branco (#FFFFFF)

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 2: Feature 2 - Detecção de Variáveis Customizadas

### Visão Geral
Criar função para detectar variáveis customizadas em templates.

### Mudanças Necessárias:

#### 1. Variable Detector - Nova Classe

**Arquivo**: `apps/web/src/lib/generation/variable-detector.ts` (CRIAR NOVO)

```typescript
import { TemplateData, TemplateElement } from '@insertflow/lib';

export interface CustomVariable {
  name: string; // Ex: "imagem_destaque"
  type: 'text' | 'image';
  placeholder?: string;
}

export class VariableDetector {
  /**
   * Detecta todas as variáveis customizadas em um template
   * Exclui variáveis padrão conhecidas
   */
  detect(templateData: TemplateData): CustomVariable[] {
    const variables = new Map<string, CustomVariable>();
    
    // Variáveis padrão a ignorar
    const standardVariables = new Set([
      'nome_produto_1', 'nome_produto_2', 'nome_produto_3', 'nome_produto_4',
      'nome_produto_5', 'nome_produto_6', 'nome_produto_7', 'nome_produto_8',
      'preco_produto_1', 'preco_produto_2', 'preco_produto_3', 'preco_produto_4',
      'preco_produto_5', 'preco_produto_6', 'preco_produto_7', 'preco_produto_8',
      'imagem_produto_1', 'imagem_produto_2', 'imagem_produto_3', 'imagem_produto_4',
      'imagem_produto_5', 'imagem_produto_6', 'imagem_produto_7', 'imagem_produto_8',
      'data_validade',
      'header',
    ]);

    // Detectar em elementos de texto
    templateData.elements.forEach((element) => {
      if (element.type === 'text') {
        const matches = element.content.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
        for (const match of matches) {
          const varName = match[1];
          if (!standardVariables.has(varName) && !variables.has(varName)) {
            variables.set(varName, {
              name: varName,
              type: 'text',
              placeholder: this.generatePlaceholder(varName),
            });
          }
        }
      }
    });

    // Detectar em elementos de imagem
    templateData.elements.forEach((element) => {
      if (element.type === 'image' && element.variable) {
        const match = element.variable.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
        if (match) {
          const varName = match[1];
          if (!standardVariables.has(varName) && !variables.has(varName)) {
            variables.set(varName, {
              name: varName,
              type: 'image',
              placeholder: this.generatePlaceholder(varName),
            });
          }
        }
      }
    });

    return Array.from(variables.values());
  }

  /**
   * Gera placeholder amigável baseado no nome da variável
   */
  private generatePlaceholder(varName: string): string {
    // Converter snake_case para Title Case
    return varName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
```

#### 2. Testes para Variable Detector

**Arquivo**: `apps/web/src/__tests__/variable-detector.test.ts` (CRIAR NOVO)

```typescript
import { VariableDetector } from '@/lib/generation/variable-detector';
import type { TemplateData } from '@insertflow/lib';

describe('VariableDetector', () => {
  const detector = new VariableDetector();

  it('detecta variáveis customizadas em texto', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: 'Promoção: {{texto_promocao}} válida até {{data_especial}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(2);
    expect(variables.find(v => v.name === 'texto_promocao')).toEqual({
      name: 'texto_promocao',
      type: 'text',
      placeholder: 'Texto Promocao',
    });
    expect(variables.find(v => v.name === 'data_especial')).toEqual({
      name: 'data_especial',
      type: 'text',
      placeholder: 'Data Especial',
    });
  });

  it('detecta variáveis customizadas em imagens', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'image',
          src: null,
          variable: '{{imagem_destaque}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
        {
          id: 'e2',
          type: 'image',
          src: null,
          variable: '{{logo_marca}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(2);
    expect(variables.find(v => v.name === 'imagem_destaque')?.type).toBe('image');
    expect(variables.find(v => v.name === 'logo_marca')?.type).toBe('image');
  });

  it('ignora variáveis padrão', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: '{{nome_produto_1}} - R$ {{preco_produto_1}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
        {
          id: 'e2',
          type: 'image',
          src: null,
          variable: '{{imagem_produto_1}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(0);
  });

  it('não duplica variáveis que aparecem múltiplas vezes', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: '{{titulo}} - {{titulo}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(1);
  });
});
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [x] Testes unitários passam: `npm test variable-detector`
- [x] Type checking passa: `npm run typecheck`
- [x] Build completa: `npm run build`

#### Verificação Manual:
- [x] Função detecta variáveis customizadas corretamente
- [x] Ignora variáveis padrão
- [x] Não duplica variáveis

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 3: Feature 2 - UI de Preenchimento de Variáveis

### Visão Geral
Modificar tela de geração para mostrar campos de variáveis customizadas após seleção de produtos.

### Mudanças Necessárias:

#### 1. Generation Form - Adicionar Etapa de Configuração

**Arquivo**: `apps/web/src/app/dashboard/generation/generation-form.tsx`

**Mudanças**: Adicionar estado e lógica de configuração por template

```tsx
// Adicionar imports
import { VariableDetector, CustomVariable } from '@/lib/generation/variable-detector';
import { ProductDivider } from '@/lib/generation/product-divider';
import { Upload, X } from 'lucide-react';

// Adicionar interfaces (após linha 12)
interface TemplateAllocation {
  template: any;
  productIds: string[];
  customVariables: CustomVariable[];
  customValues: Record<string, string>; // varName -> value
  highlightProductIds: string[]; // IDs dos produtos destaque
}

// Adicionar estados (após linha 25)
const [step, setStep] = useState<'select' | 'configure'>('select');
const [allocations, setAllocations] = useState<TemplateAllocation[]>([]);
const [uploadingVar, setUploadingVar] = useState<string | null>(null);

// Adicionar função para calcular alocações (após linha 42)
async function calculateAllocations() {
  if (!selectedFolder || selectedProducts.length === 0) {
    alert('Selecione uma pasta e pelo menos um produto');
    return;
  }

  try {
    // Buscar templates da pasta
    const res = await fetch(`/api/folders/${selectedFolder}/templates?format=${selectedFormat}`);
    const data = await res.json();
    const templates = data.templates || [];

    if (templates.length === 0) {
      alert('Nenhum template encontrado nesta pasta para o formato selecionado');
      return;
    }

    // Buscar dados completos dos produtos selecionados
    const selectedProductsData = products.filter(p => selectedProducts.includes(p.id));

    // Dividir produtos entre templates
    const divider = new ProductDivider();
    const rawAllocations = divider.divide(selectedProductsData, templates);

    // Detectar variáveis customizadas em cada template
    const detector = new VariableDetector();
    const templateAllocations: TemplateAllocation[] = rawAllocations.map((alloc) => {
      const customVariables = detector.detect(alloc.template.data);
      
      return {
        template: alloc.template,
        productIds: alloc.products.map(p => p.id),
        customVariables,
        customValues: {}, // Inicialmente vazio
        highlightProductIds: [], // Inicialmente vazio
      };
    });

    setAllocations(templateAllocations);
    setStep('configure');
  } catch (error) {
    console.error('Failed to calculate allocations:', error);
    alert('Erro ao calcular divisão de produtos');
  }
}

// Modificar handleGenerate (linha 44-77)
async function handleGenerate() {
  if (step === 'select') {
    // Primeira etapa: calcular alocações
    await calculateAllocations();
    return;
  }

  // Segunda etapa: gerar encartes
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
      // Reset
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

// Adicionar função para upload de imagem de variável customizada
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
      // Atualizar valor da variável com URL da imagem
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

// Adicionar função para atualizar valor de variável de texto
function updateCustomValue(allocIndex: number, varName: string, value: string) {
  setAllocations(allocations.map((alloc, i) => 
    i === allocIndex 
      ? { ...alloc, customValues: { ...alloc.customValues, [varName]: value } }
      : alloc
  ));
}

// Adicionar função para alternar produto destaque
function toggleHighlightProduct(allocIndex: number, productId: string) {
  setAllocations(allocations.map((alloc, i) => {
    if (i !== allocIndex) return alloc;
    
    const isSelected = alloc.highlightProductIds.includes(productId);
    const maxHighlights = alloc.template.highlightSlots || 0;
    
    if (isSelected) {
      // Remover
      return {
        ...alloc,
        highlightProductIds: alloc.highlightProductIds.filter(id => id !== productId),
      };
    } else {
      // Adicionar (se não exceder limite)
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

// Modificar JSX do botão (linha 287-294)
// ANTES: Gerar {selectedProducts.length} Encarte(s)
// DEPOIS:

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

// Adicionar seção de configuração ANTES do botão de gerar (linha ~286)
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

        {/* Produtos Destaque */}
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

        {/* Variáveis Customizadas */}
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
                    placeholder={`Digite ${variable.placeholder.toLowerCase()}`}
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
```

#### 2. API Temporária de Upload de Imagem

**Arquivo**: `apps/web/src/app/api/images/upload-temp/route.ts` (CRIAR NOVO)

```typescript
import { NextResponse } from 'next/server';
import { requireOrg } from '@/lib/auth-helpers';
import { getStorage } from '@insertflow/lib';

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const formData = await req.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const storage = getStorage();
    
    // Salvar em pasta temporária
    const tempPath = `org-${session.user.orgId}/temp/${Date.now()}-${file.name}`;
    await storage.upload(buffer, tempPath, file.type);
    
    const url = await storage.getUrl(tempPath);

    return NextResponse.json({ url });
  } catch (error: any) {
    console.error('[Upload Temp] Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [x] Type checking passa: `npm run typecheck`
- [x] Linting passa: `npm run lint`
- [x] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Selecionar produtos e clicar "Continuar" mostra tela de configuração
- [ ] Divisão de produtos está correta
- [ ] Templates com variáveis customizadas mostram campos
- [ ] Templates com highlightSlots mostram seleção de destaque
- [ ] Upload de imagem para variável customizada funciona
- [ ] Validação de máximo de produtos destaque funciona
- [ ] Botão "Voltar" retorna para seleção
- [ ] Campos opcionais podem ficar vazios

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 4: Feature 2 e 3B - API e Injeção de Variáveis

### Visão Geral
Atualizar API de geração e Variable Injector para suportar variáveis customizadas e produtos destaque.

### Mudanças Necessárias:

#### 1. API de Geração - Aceitar Allocations

**Arquivo**: `apps/web/src/app/api/generation/start/route.ts`

**Mudanças**: Aceitar e passar allocations para worker (linhas 14-44)

```typescript
// Modificar validação (linha 14-17)
if (!body.folderId || !body.format || !body.productIds?.length) {
  return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
}

// Validar allocations se fornecido
if (body.allocations && !Array.isArray(body.allocations)) {
  return NextResponse.json({ error: 'Invalid allocations format' }, { status: 400 });
}

// Modificar metadata (linha 28-31)
metadata: {
  productIds: body.productIds,
  globalData: body.globalData,
  allocations: body.allocations, // ADICIONAR
},

// Modificar job data (linha 36-44)
const job = await generationQueue.add('generate', {
  jobId: generationJob.id,
  orgId: session.user.orgId!,
  userId: session.user.id,
  folderId: body.folderId,
  format: body.format,
  productIds: body.productIds,
  globalData: body.globalData,
  allocations: body.allocations, // ADICIONAR
});
```

#### 2. Variable Injector - Suportar Variáveis Customizadas

**Arquivo**: `apps/web/src/lib/generation/variable-injector.ts`

**Mudanças**: Adicionar suporte a custom values e produtos destaque

```typescript
// Adicionar interface (após linha 14)
interface CustomValues {
  [varName: string]: string; // varName -> value
}

interface HighlightMapping {
  highlightProductIds: string[];
  normalProductIds: string[];
}

// Modificar método inject (linha 16-28)
export class VariableInjector {
  inject(
    templateData: TemplateData,
    products: Product[],
    globalData: GlobalData = {},
    customValues: CustomValues = {}, // ADICIONAR
    highlightMapping?: HighlightMapping // ADICIONAR
  ): TemplateData {
    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => 
        this.injectElement(element, products, globalData, customValues, highlightMapping)
      ),
    };

    return injected;
  }

  private injectElement(
    element: TemplateElement,
    products: Product[],
    globalData: GlobalData,
    customValues: CustomValues, // ADICIONAR
    highlightMapping?: HighlightMapping // ADICIONAR
  ): TemplateElement {
    const injected = { ...element };

    // Text elements
    if (element.type === 'text') {
      let content = element.content;

      // Substituir variáveis de produtos
      products.forEach((product, index) => {
        const n = index + 1;
        content = content
          .replace(new RegExp(`{{nome_produto_${n}}}`, 'g'), product.name)
          .replace(new RegExp(`{{preco_produto_${n}}}`, 'g'), formatPrice(product.price));
      });

      // Substituir variáveis globais
      if (globalData.validUntil) {
        content = content.replace(/{{data_validade}}/g, globalData.validUntil);
      }
      if (globalData.header) {
        content = content.replace(/{{header}}/g, globalData.header);
      }

      // NOVO: Substituir variáveis customizadas
      Object.entries(customValues).forEach(([varName, value]) => {
        const regex = new RegExp(`{{${varName}}}`, 'g');
        content = content.replace(regex, value || ''); // Se vazio, substitui por string vazia
      });

      (injected as any).content = content;
    }

    // Image elements
    if (element.type === 'image' && element.variable) {
      // Variáveis padrão de produtos
      products.forEach((product, index) => {
        const n = index + 1;
        if (element.variable === `{{imagem_produto_${n}}}`) {
          (injected as any).src = product.imagePath || null;
        }
      });

      // NOVO: Variáveis customizadas de imagem
      const match = element.variable.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
      if (match) {
        const varName = match[1];
        if (customValues[varName]) {
          (injected as any).src = customValues[varName];
        }
      }
    }

    return injected;
  }
}
```

#### 3. Worker de Geração - Usar Allocations

**Arquivo**: `apps/workers/src/services/generation-service.ts`

**Mudanças**: Usar allocations se fornecido, senão usar divisão automática

```typescript
// Localizar método de geração (provavelmente linha ~50-150)
// Modificar para usar allocations se fornecido

async generate(jobData: any) {
  const { jobId, orgId, folderId, format, productIds, globalData, allocations } = jobData;
  
  // ... código existente de buscar produtos e templates ...
  
  let encarteAllocations;
  
  if (allocations && allocations.length > 0) {
    // NOVO: Usar allocations fornecidas pelo frontend
    encarteAllocations = allocations.map((alloc: any) => {
      const template = templates.find((t: any) => t.id === alloc.templateId);
      const allocProducts = products.filter((p: any) => alloc.productIds.includes(p.id));
      
      return {
        template,
        products: allocProducts,
        customValues: alloc.customValues || {},
        highlightMapping: {
          highlightProductIds: alloc.highlightProductIds || [],
          normalProductIds: allocProducts
            .filter((p: any) => !alloc.highlightProductIds?.includes(p.id))
            .map((p: any) => p.id),
        },
      };
    });
  } else {
    // Fallback: divisão automática (comportamento antigo)
    const divider = new ProductDivider();
    encarteAllocations = divider.divide(products, templates).map(alloc => ({
      ...alloc,
      customValues: {},
      highlightMapping: undefined,
    }));
  }
  
  // Para cada alocação, injetar variáveis e gerar
  for (const alloc of encarteAllocations) {
    const injector = new VariableInjector();
    const injectedData = injector.inject(
      alloc.template.data,
      alloc.products,
      globalData,
      alloc.customValues, // ADICIONAR
      alloc.highlightMapping // ADICIONAR
    );
    
    // ... resto do código de renderização ...
  }
}
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [x] Type checking passa: `npm run typecheck`
- [x] Build completa: `npm run build`
- [x] Testes unitários passam: `npm test`

#### Verificação Manual:
- [ ] Gerar encarte com variável customizada de texto → valor aparece no encarte
- [ ] Gerar encarte com variável customizada de imagem → imagem aparece no encarte
- [ ] Deixar variável customizada vazia → gera em branco (sem erro)
- [ ] Selecionar produtos destaque → produtos corretos aparecem em posições destaque
- [ ] Geração sem allocations (fallback) ainda funciona

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir.

---

## Estratégia de Testes

### Testes Unitários:

Já criados na Fase 2 para `VariableDetector`.

**Adicionar testes para Variable Injector:**

**Arquivo:** `apps/web/src/__tests__/variable-injector.test.ts`

```typescript
import { VariableInjector } from '@/lib/generation/variable-injector';
import type { TemplateData } from '@insertflow/lib';

describe('VariableInjector - Custom Variables', () => {
  const injector = new VariableInjector();

  it('injeta variáveis customizadas de texto', () => {
    const templateData: TemplateData = {
      background: { type: 'color', value: '#fff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: 'Promoção: {{texto_promocao}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
      ],
    };

    const customValues = { texto_promocao: 'Desconto de 50%' };
    const result = injector.inject(templateData, [], {}, customValues);

    expect(result.elements[0].content).toBe('Promoção: Desconto de 50%');
  });

  it('injeta variáveis customizadas de imagem', () => {
    const templateData: TemplateData = {
      background: { type: 'color', value: '#fff' },
      elements: [
        {
          id: 'e1',
          type: 'image',
          src: null,
          variable: '{{logo_marca}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
      ],
    };

    const customValues = { logo_marca: 'https://example.com/logo.png' };
    const result = injector.inject(templateData, [], {}, customValues);

    expect(result.elements[0].src).toBe('https://example.com/logo.png');
  });

  it('substitui por string vazia quando variável customizada não é fornecida', () => {
    const templateData: TemplateData = {
      background: { type: 'color', value: '#fff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: 'Texto: {{variavel_vazia}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
      ],
    };

    const result = injector.inject(templateData, [], {}, {});

    expect(result.elements[0].content).toBe('Texto: ');
  });
});
```

### Passos de Teste Manual:

#### Feature 2 - Variáveis Customizadas:
1. Criar template com variável `{{texto_promocao}}` em elemento de texto
2. Criar template com variável `{{imagem_destaque}}` em elemento de imagem
3. Ir para tela de geração
4. Selecionar pasta, formato, produtos
5. Clicar "Continuar"
6. Verificar que campos de variáveis customizadas aparecem
7. Preencher "Texto Promoção" com "Desconto de 50%"
8. Fazer upload de imagem para "Imagem Destaque"
9. Gerar encartes
10. Verificar que texto e imagem aparecem corretamente no encarte gerado

#### Feature 3B - Produtos Destaque:
1. Criar template com grupo destaque (highlightSlots = 2)
2. Ir para tela de geração
3. Selecionar 6 produtos
4. Clicar "Continuar"
5. Verificar que aparece seleção de produtos destaque (máximo 2)
6. Selecionar 2 produtos como destaque
7. Tentar selecionar 3º produto → deve mostrar alerta
8. Gerar encartes
9. Verificar que produtos destaque aparecem nas posições corretas

#### Feature 4 - Redimensionamento 800x900:
1. Ir para galeria de imagens
2. Fazer upload de imagem 1200x800 (landscape)
3. Verificar que imagem foi redimensionada para 800x900
4. Baixar imagem e verificar dimensões exatas
5. Verificar que há padding branco top/bottom
6. Fazer upload de imagem 600x1200 (portrait)
7. Verificar padding branco left/right
8. Verificar que imagem está centralizada

## Considerações de Performance

- Detecção de variáveis customizadas é feita apenas uma vez por template na tela de geração
- Upload de imagens temporárias pode ser otimizado com compressão
- Injeção de variáveis customizadas adiciona overhead mínimo ao processo de geração

## Notas de Migração

- Templates sem variáveis customizadas continuam funcionando normalmente
- Templates sem highlightSlots continuam funcionando (valor padrão 0)
- Geração sem allocations usa fallback de divisão automática
- Imagens já existentes não são redimensionadas retroativamente

## Documentação e Assistente IA

**IMPORTANTE:** A atualização do assistente IA (Nexo) com informações sobre variáveis customizadas e produtos destaque já está coberta no **SPEC_07 - Fase 7**.

O prompt do sistema do assistente será atualizado para incluir:
- Como usar variáveis customizadas na geração
- Como selecionar produtos destaque
- Exemplos práticos de uso
- Perguntas frequentes sobre essas funcionalidades

Não é necessário duplicar essas mudanças neste SPEC.

## Referências

- PRD Original: `TEMP_PRD.md`
- Specs Relacionadas: `SPEC_07_EDITOR_VARIAVEIS_GRUPOS.md`, `SPEC_05_GENERATION_ENGINE.md`, `SPEC_03_IMAGE_MANAGEMENT.md`
- Sharp Resize: https://sharp.pixelplumbing.com/api-resize
- Sharp Extend: https://sharp.pixelplumbing.com/api-operation#extend
