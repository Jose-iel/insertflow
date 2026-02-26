# TEMP_PRD - Sistema de Templates Dinâmicos e Produtos Destaque

**Data:** 2026-02-26  
**Agente:** SEARCH  
**Status:** Pesquisa Completa

---

## 1. Resumo do Pedido

O usuário solicitou 4 features principais distribuídas em 3 telas diferentes:

---

## TELA 1: Editor de Templates (`/dashboard/templates/[id]/editor`)

### Feature 1: Campo de Variável de Imagem → Texto Livre

**Localização:** Properties Panel → Seção "Variável de Imagem do Produto"

**Mudança:**
- Converter campo `<select>` para `<input type="text">`
- Remover opções fixas (imagem_produto_1 até imagem_produto_8)
- Permitir texto livre seguindo padrão `{{nome_variavel}}`

**Objetivo:**
- Permitir variáveis customizadas além das padrão
- Exemplo: `{{imagem_destaque}}`, `{{logo_marca}}`, `{{banner_promocao}}`

**Comportamento:**
- Variáveis customizadas são salvas no template
- Aparecem para preenchimento na tela de geração

---

### Feature 3A: Agrupar Elementos e Marcar como Destaque

**Localização:** Editor de Template (Canvas)

**Funcionalidade:**
- Criar sistema de agrupamento de elementos
- Permitir marcar grupo como "destaque"
- Exemplo: Agrupar (imagem + título + preço) → Marcar como "Produto Destaque"

**Dados Salvos no Template:**
- Grupos de elementos com flag `isHighlight: true`
- Contagem de quantos grupos destaque o template tem
- Metadado `highlightSlots: number` no template

**UI Sugerida:**
- Botão "Criar Grupo" ou "Agrupar Selecionados"
- Checkbox "Marcar como Destaque" no grupo
- Visual diferenciado para grupos destaque (borda colorida?)

---

## TELA 2: Geração de Encartes (`/dashboard/generation`)

### Fluxo Atual (Existente):
1. Seleciona pasta de templates
2. Seleciona formato (feed/stories)
3. Seleciona produtos
4. Clica em "Gerar"

### Novo Fluxo (Com Features 2 e 3B):

**Etapa 1-3:** Igual ao atual

**Etapa 4:** Sistema busca templates e sugere divisão
- Exemplo: 10 produtos → Sugere template de 6 + template de 4
- Se não houver templates suficientes → Informa usuário (desmarcar produtos ou criar template)

**Etapa 5 (NOVA):** Configuração por Template
- **Para cada template sugerido**, mostrar seção separada com:
  
  **Template 1 (6 produtos):**
  
  1. **Feature 3B - Seleção de Produtos Destaque** (se `highlightSlots > 0`)
     - Exemplo: "Este template tem 2 posições destaque. Selecione os produtos:"
     - UI: Dropdown ou checkboxes dos 6 produtos alocados para este template
     - Validação: Máximo de seleções = `highlightSlots`
  
  2. **Feature 2 - Campos de Variáveis Customizadas** (se houver variáveis não-padrão)
     - Sistema detecta automaticamente variáveis customizadas no template
     - Exemplo: Template tem `{{imagem_destaque}}` e `{{texto_promocao}}`
     - Mostra campos:
       - "Imagem Destaque" → Upload de arquivo ou URL
       - "Texto Promoção" → Input de texto
     - **Se não preencher:** Gera em branco (sem erro)
  
  **Template 2 (4 produtos):**
  - Mesma lógica, mas para os 4 produtos alocados
  - Campos de destaque e variáveis customizadas específicos deste template

**Importante:** Ambas as features (destaque + variáveis) aparecem **juntas** na mesma tela, separadas por template.

**Etapa 6:** Clica em "Gerar Encartes"

---

## TELA 3: Galeria de Imagens (`/dashboard/images`)

### Feature 4: Redimensionamento Automático 800x900

**Localização:** Upload de Imagens

**Comportamento:**
- **Automático** ao fazer upload
- Antes de salvar, redimensiona para 800x900
- Mantém proporção da imagem original
- Adiciona fundo branco se necessário para completar dimensões

**Especificações Técnicas:**
- Dimensão final: 800x900 pixels
- Fundo: Branco (#FFFFFF)
- Método: `fit: contain` + `background: white`
- Centralização: Imagem centralizada no canvas 800x900

**Exemplo:**
- Upload de 1200x800 → Reduz para 800x533 → Adiciona padding branco (top/bottom) → Resultado: 800x900
- Upload de 600x1200 → Reduz para 450x900 → Adiciona padding branco (left/right) → Resultado: 800x900

---

## 2. Contexto Atual da Codebase

### 2.1 Editor de Templates (Canvas)

**Arquivo Principal:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx:410-450`

```tsx
{/* Image specific */}
{element.type === 'image' && (
  <div className="space-y-2">
    <label className="text-sm font-medium">Variável de Imagem do Produto</label>
    <select
      value={element.variable || ''}
      onChange={(e) => onUpdate({ variable: e.target.value || null })}
      className="w-full rounded border px-2 py-1.5 text-sm bg-white"
    >
      <option value="">Imagem fixa (sem variável)</option>
      <option value="{{imagem_produto_1}}">Imagem Produto 1</option>
      <option value="{{imagem_produto_2}}">Imagem Produto 2</option>
      <option value="{{imagem_produto_3}}">Imagem Produto 3</option>
      <option value="{{imagem_produto_4}}">Imagem Produto 4</option>
      <option value="{{imagem_produto_5}}">Imagem Produto 5</option>
      <option value="{{imagem_produto_6}}">Imagem Produto 6</option>
      <option value="{{imagem_produto_7}}">Imagem Produto 7</option>
      <option value="{{imagem_produto_8}}">Imagem Produto 8</option>
    </select>
  </div>
)}
```

**Estrutura de Dados:** `@/Users/josehenrique/Pessoal/insertflow/packages/lib/src/template-types.ts:81-85`

```typescript
export interface ImageElement extends BaseElement {
  type: 'image';
  src: string | null; // URL da imagem fixa ou null
  variable: string | null; // {{imagem_produto_1}} ou null
}
```

**Componentes Relacionados:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx` - Editor principal
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/canvas-element.tsx` - Renderização de elementos
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/editor-canvas.tsx` - Canvas Konva

### 2.2 Sistema de Geração de Encartes

**Tela de Geração:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/generation/generation-form.tsx`

**Fluxo Atual:**
1. Seleciona pasta de templates
2. Seleciona formato (feed/stories)
3. Seleciona produtos
4. Clica em "Gerar"

**API de Geração:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/api/generation/start/route.ts`

```typescript
// Adicionar job na fila
const job = await generationQueue.add('generate', {
  jobId: generationJob.id,
  orgId: session.user.orgId!,
  userId: session.user.id,
  folderId: body.folderId,
  format: body.format,
  productIds: body.productIds,
  globalData: body.globalData,
});
```

**Divisão de Produtos:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/lib/generation/product-divider.ts`

```typescript
export class ProductDivider {
  divide(products: Product[], templates: Template[]): EncarteAllocation[] {
    // Ordenar templates por productSlots (maior primeiro)
    const sortedTemplates = [...templates].sort((a, b) => b.productSlots - a.productSlots);
    
    // Garantir que existe template de 1 produto (fallback)
    const hasSingleSlot = sortedTemplates.some((t) => t.productSlots === 1);
    
    const allocations: EncarteAllocation[] = [];
    const remaining = [...products];
    
    while (remaining.length > 0) {
      // Encontrar maior template que cabe
      const template = sortedTemplates.find((t) => t.productSlots <= remaining.length) ||
                       sortedTemplates[sortedTemplates.length - 1];
      
      // Alocar produtos
      const allocated = remaining.splice(0, template.productSlots);
      allocations.push({ template, products: allocated });
    }
    
    return allocations;
  }
}
```

**Injeção de Variáveis:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/lib/generation/variable-injector.ts:16-73`

```typescript
export class VariableInjector {
  inject(templateData: TemplateData, products: Product[], globalData: GlobalData = {}): TemplateData {
    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => this.injectElement(element, products, globalData)),
    };
    return injected;
  }

  private injectElement(element: TemplateElement, products: Product[], globalData: GlobalData): TemplateElement {
    const injected = { ...element };

    // Text elements
    if (element.type === 'text') {
      let content = element.content;
      products.forEach((product, index) => {
        const n = index + 1;
        content = content
          .replace(new RegExp(`{{nome_produto_${n}}}`, 'g'), product.name)
          .replace(new RegExp(`{{preco_produto_${n}}}`, 'g'), formatPrice(product.price));
      });
      (injected as any).content = content;
    }

    // Image elements
    if (element.type === 'image' && element.variable) {
      products.forEach((product, index) => {
        const n = index + 1;
        if (element.variable === `{{imagem_produto_${n}}}`) {
          (injected as any).src = product.imagePath || null;
        }
      });
    }

    return injected;
  }
}
```

### 2.3 Sistema de Upload de Imagens

**Galeria:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/images/image-gallery.tsx`

**Upload:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/images/image-uploader.tsx`

**API de Upload:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/api/images/upload/route.ts`

**Otimização Atual:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/lib/image-optimizer.ts:27-46`

```typescript
// 2. Create optimized version (WebP, max 2000x2000)
const optimizedBuffer = await sharp(originalBuffer)
  .resize(2000, 2000, {
    fit: 'inside',
    withoutEnlargement: true,
  })
  .webp({ quality: 85 })
  .toBuffer();

// 3. Create thumbnail (200x200)
const thumbBuffer = await sharp(originalBuffer)
  .resize(200, 200, { fit: 'cover' })
  .webp({ quality: 80 })
  .toBuffer();
```

**Dimensões Atuais:**
- Original: Mantém dimensão original
- Optimized: Max 2000x2000 (fit: inside)
- Thumbnail: 200x200 (fit: cover)

**Formatos Aceitos:**
- JPG/JPEG
- PNG
- WebP
- Tamanho máximo: 10MB

---

## 3. Regras de Negócio

### 3.1 Variáveis de Template

**Variáveis Padrão Existentes:**

**Texto:**
- `{{nome_produto_N}}` - Nome do produto N
- `{{preco_produto_N}}` - Preço do produto N
- `{{data_validade}}` - Data de validade global
- `{{header}}` - Cabeçalho global

**Imagem:**
- `{{imagem_produto_N}}` - Imagem do produto N (N = 1-8)

**Nova Regra - Variáveis Customizadas:**
- Devem seguir o padrão `{{nome_variavel}}`
- São detectadas automaticamente ao escanear elementos do template
- **Detecção:**
  - Em elementos de texto: Regex para encontrar padrão `{{...}}`
  - Em elementos de imagem: Campo `variable` com valor não-padrão
- Aparecem para preenchimento na tela de geração, **por template**
- **Se não preenchidas:** Geram em branco (string vazia ou null)
- **Tipos suportados:**
  - Texto: Input de texto simples
  - Imagem: Upload de arquivo ou URL

### 3.2 Sistema de Sugestão de Templates

**Algoritmo Atual:**
1. Ordena templates por `productSlots` (maior primeiro)
2. Aloca produtos usando o maior template possível
3. Fallback para template de 1 produto se necessário
4. Requer pelo menos 1 template com `productSlots = 1`

**Nova Regra:**
- Se não houver templates suficientes para todos os produtos, informar usuário
- Sugerir desmarcar produtos OU criar templates adicionais
- Priorizar templates maiores para otimizar número de encartes

### 3.3 Produtos Destaque

**Nova Funcionalidade:**
- Templates podem ter **grupos de elementos** marcados como "destaque"
- Cada template define quantos destaques suporta via metadado `highlightSlots`
- Na geração, usuário seleciona produtos específicos para posições de destaque
- Produtos não-destaque preenchem posições normais do template

**Regras de Agrupamento:**
- Agrupamento de elementos (título + imagem + preço) pode ser marcado como destaque
- Destaque é uma propriedade do grupo de elementos (`isHighlight: true`)
- Sistema conta automaticamente quantos grupos destaque existem no template
- Salva contagem em `template.highlightSlots`

**Regras de Seleção (Tela de Geração):**
- Validação: número de produtos destaque selecionados ≤ `highlightSlots`
- Produtos destaque são selecionados **dos produtos já alocados** para aquele template
- Exemplo: Template de 6 produtos com 2 destaques → usuário escolhe 2 dos 6 produtos alocados

**Injeção de Dados:**
- Produtos marcados como destaque usam variáveis dos grupos destaque
- Produtos normais usam variáveis das posições normais
- Sistema mapeia: produto destaque → grupo destaque → variáveis do grupo

### 3.4 Redimensionamento de Imagens

**Novo Padrão:**
- Dimensão: 800x900 pixels
- Fundo: Branco (#FFFFFF)
- Método: Resize mantendo proporção + padding branco

**Comportamento:**
- Aplicado automaticamente no upload
- Imagem original é redimensionada para caber em 800x900
- Se proporção diferente, adiciona fundo branco para completar
- Mantém centralização da imagem

---

## 4. Histórico Relevante

### SPEC_04_TEMPLATE_EDITOR.md

**Decisões Arquiteturais:**
- Editor usa Konva.js + react-konva
- Elementos são serializados em JSON
- Variáveis usam padrão `{{nome_variavel}}`
- Sistema de layers para z-index
- Properties panel para edição de propriedades

**Tipos de Elementos:**
- text, image, rect, circle, triangle, line, star
- Cada elemento tem: id, type, x, y, width, height, rotation, layer, locked, opacity

**Variáveis de Imagem:**
- Campo `variable` no ImageElement
- Aceita valores como `{{imagem_produto_1}}`
- Se `variable` é null, usa `src` (imagem fixa)

### SPEC_05_GENERATION_ENGINE.md

**Decisões Arquiteturais:**
- BullMQ para processamento assíncrono
- Puppeteer para renderização HTML→PNG
- Sharp para pós-processamento (300 DPI)
- ProductDivider para divisão inteligente de produtos
- VariableInjector para substituição de variáveis

**Fluxo de Geração:**
1. Criar job no banco
2. Buscar produtos
3. Buscar templates da pasta + formato
4. Dividir produtos entre templates
5. Para cada alocação:
   - Injetar variáveis
   - Renderizar HTML
   - Gerar PNG
   - Salvar no banco
6. Marcar produtos como processados

**Metadados de Template:**
- `productSlots`: Número de produtos que o template suporta
- Usado pelo algoritmo de divisão

### SPEC_03_IMAGE_MANAGEMENT.md

**Decisões Arquiteturais:**
- Sharp para otimização
- Storage abstraction layer (local/R2/MinIO)
- 3 versões: original, optimized, thumb
- Match automático (exato + IA)

**Otimização Atual:**
- Original: Mantém como está
- Optimized: Max 2000x2000, WebP 85%
- Thumb: 200x200 cover, WebP 80%

---

## 5. Padrões de Testes do Projeto

### Framework de Testes

**Configuração:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/jest.config.js`

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**Estrutura:**
- Framework: Jest + ts-jest
- Ambiente: Node
- Localização: `src/__tests__/**/*.test.ts`
- Alias: `@/` → `src/`

**Scripts de Teste:**
```json
"test": "jest",
"test:watch": "jest --watch"
```

**Exemplo Existente:** `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/__tests__/auth.test.ts`

### Padrão de Nomenclatura

- Arquivos: `*.test.ts`
- Localização: `src/__tests__/`
- Estrutura: Testes unitários para lógica de negócio

### Como Rodar Testes

```bash
npm test              # Roda todos os testes
npm run test:watch    # Modo watch
```

---

## 6. Referências Externas

### Bibliotecas Utilizadas

**Canvas/Editor:**
- [Konva.js](https://konvajs.org/) - Canvas 2D library
- [react-konva](https://konvajs.org/docs/react/) - React bindings para Konva

**Upload/Processamento:**
- [react-dropzone](https://react-dropzone.js.org/) - Drag-and-drop upload
- [Sharp](https://sharp.pixelplumbing.com/) - Image processing
  - [Resize API](https://sharp.pixelplumbing.com/api-resize)
  - [Extend API](https://sharp.pixelplumbing.com/api-operation#extend) - Para adicionar padding/fundo

**Geração:**
- [Puppeteer](https://pptr.dev/) - Headless browser
- [BullMQ](https://docs.bullmq.io/) - Queue system

### Padrões de Design

**Template Pattern:**
- Variáveis dinâmicas usando `{{variavel}}`
- Substituição em tempo de geração
- Suporte a variáveis customizadas

**Strategy Pattern:**
- Storage abstraction (local/R2/MinIO)
- Match strategies (exact/AI)

**Builder Pattern:**
- ProductDivider para construir alocações
- VariableInjector para construir dados injetados

---

## 7. Mapeamento de Arquivos

### Feature 1: Campo de Variável de Imagem → Texto Livre

**Arquivos Impactados:**

1. **Properties Panel** (MODIFICAR)
   - `apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx:410-450`
   - Trocar `<select>` por `<input type="text">`
   - Manter validação de formato `{{variavel}}`

2. **Template Types** (SEM ALTERAÇÃO)
   - `packages/lib/src/template-types.ts:81-85`
   - Interface `ImageElement` já suporta `variable: string | null`

3. **Variable Injector** (MODIFICAR)
   - `apps/web/src/lib/generation/variable-injector.ts:60-68`
   - Expandir lógica para detectar variáveis customizadas
   - Adicionar suporte a variáveis não-padrão

### Feature 2: Tags Dinâmicas (Texto/Imagem Livres)

**Arquivos Impactados:**

1. **Generation Form** (MODIFICAR)
   - `apps/web/src/app/dashboard/generation/generation-form.tsx`
   - Adicionar etapa de preenchimento de campos dinâmicos
   - Mostrar campos por template após sugestão

2. **API de Geração** (MODIFICAR)
   - `apps/web/src/app/api/generation/start/route.ts`
   - Aceitar dados de campos dinâmicos no body
   - Passar para worker

3. **Variable Injector** (MODIFICAR)
   - `apps/web/src/lib/generation/variable-injector.ts`
   - Detectar variáveis customizadas em elementos
   - Injetar valores fornecidos pelo usuário
   - Se não fornecido, deixar em branco

4. **Product Divider** (ANALISAR)
   - `apps/web/src/lib/generation/product-divider.ts`
   - Verificar se precisa retornar metadados de variáveis customizadas

### Feature 3: Produtos Destaque

**Arquivos Impactados:**

1. **Template Types** (CRIAR NOVO)
   - `packages/lib/src/template-types.ts`
   - Adicionar interface para grupos de elementos
   - Adicionar propriedade `isHighlight` ou similar
   - Adicionar metadado `highlightSlots` no template

2. **Properties Panel** (MODIFICAR)
   - `apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx`
   - Adicionar opção para marcar grupo como destaque
   - UI para agrupar elementos

3. **Template Editor** (MODIFICAR)
   - `apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx`
   - Lógica para criar/gerenciar grupos
   - Salvar grupos no JSON do template

4. **Generation Form** (MODIFICAR)
   - `apps/web/src/app/dashboard/generation/generation-form.tsx`
   - Adicionar etapa de seleção de produtos destaque
   - Mostrar por template após sugestão
   - Validar número de destaques selecionados

5. **Variable Injector** (MODIFICAR)
   - `apps/web/src/lib/generation/variable-injector.ts`
   - Injetar produtos destaque em posições específicas
   - Injetar produtos normais em posições normais

6. **API de Geração** (MODIFICAR)
   - `apps/web/src/app/api/generation/start/route.ts`
   - Aceitar mapeamento de produtos destaque

### Feature 4: Redimensionamento de Imagem na Galeria

**Arquivos Impactados:**

1. **Image Optimizer** (MODIFICAR)
   - `apps/web/src/lib/image-optimizer.ts:27-46`
   - Adicionar lógica de redimensionamento 800x900
   - Usar Sharp extend para adicionar fundo branco
   - Aplicar antes de salvar

2. **Upload API** (SEM ALTERAÇÃO SIGNIFICATIVA)
   - `apps/web/src/app/api/images/upload/route.ts`
   - Já chama `optimizeImage`, apenas passa parâmetros

**Exemplo de Código Sharp:**
```typescript
const resizedBuffer = await sharp(originalBuffer)
  .resize(800, 900, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 1 }
  })
  .toBuffer();
```

### Dependências Entre Componentes

```
Template Editor (Canvas)
  ↓ salva JSON
Template Data (DB)
  ↓ lido por
Generation Form
  ↓ envia para
Generation API
  ↓ adiciona job
BullMQ Worker
  ↓ usa
Product Divider + Variable Injector
  ↓ gera
PNG Files
```

---

## 8. Pontos de Integração

### 8.1 Canvas → Geração

**Fluxo:**
1. Usuário edita template no Canvas
2. Template salvo com variáveis customizadas
3. Na geração, sistema detecta variáveis
4. Mostra campos para preenchimento
5. Injeta valores na renderização

**Dados Transferidos:**
- `template.data.elements[]` - Lista de elementos
- `element.variable` - Variável de imagem
- `element.content` - Conteúdo de texto (pode ter variáveis)

### 8.2 Geração → Renderização

**Fluxo:**
1. ProductDivider aloca produtos
2. VariableInjector substitui variáveis
3. TemplateRenderer gera HTML
4. Puppeteer renderiza PNG

**Dados Transferidos:**
- `EncarteAllocation[]` - Templates + produtos alocados
- `GlobalData` - Dados globais (validUntil, header)
- **NOVO:** `CustomVariables` - Valores de variáveis customizadas
- **NOVO:** `HighlightMapping` - Mapeamento de produtos destaque

### 8.3 Upload → Otimização

**Fluxo:**
1. Usuário faz upload
2. API recebe arquivo
3. Image Optimizer processa
4. Salva 3 versões
5. Retorna URLs

**Dados Transferidos:**
- `Buffer` - Arquivo original
- `OptimizeImageOptions` - Configurações
- **NOVO:** Dimensão padrão 800x900

---

## LEMBRE-SE: O SPEC vai usar este documento para arquitetar a solução. Quanto mais completo, melhor o plano.
