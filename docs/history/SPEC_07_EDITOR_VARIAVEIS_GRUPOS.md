# SPEC_07_EDITOR_VARIAVEIS_GRUPOS - Variáveis Customizadas e Agrupamento de Elementos

**Data:** 2026-02-26  
**Autor:** Agente SPEC  
**PRD Base:** TEMP_PRD.md (Features 1 e 3A)  
**Depende de:** SPEC_04_TEMPLATE_EDITOR

---

## Visão Geral

Expandir o editor de templates com duas funcionalidades principais:
1. **Variáveis customizadas de imagem** - Permitir texto livre no campo de variável de imagem (não apenas opções fixas)
2. **Agrupamento de elementos** - Criar grupos de elementos e marcar como "destaque" para produtos em evidência

## Análise do Estado Atual

### Descobertas Principais:

**Sistema de Seleção Múltipla:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx:171` - Já existe `selectedIds: string[]` para múltipla seleção
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx:410-426` - Função `handleSelectElement` suporta Shift+Click para seleção múltipla
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx:254-278` - Já existe `duplicateSelectedElements()` que trabalha com múltiplos elementos

**Campo de Variável de Imagem:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx:413-442` - Campo atual é `<select>` com opções fixas (imagem_produto_1 até imagem_produto_8)
- `@/Users/josehenrique/Pessoal/insertflow/packages/lib/src/template-types.ts:81-85` - Interface `ImageElement` já suporta `variable: string | null` (qualquer string)

**Estrutura de Dados:**
- `@/Users/josehenrique/Pessoal/insertflow/packages/lib/src/template-types.ts:132-135` - `TemplateData` contém apenas `background` e `elements[]`
- Não existe conceito de grupos atualmente
- Sistema de layers usa propriedade `layer: number` em cada elemento

**Editor Konva:**
- `@/Users/josehenrique/Pessoal/insertflow/apps/web/src/app/dashboard/templates/[id]/editor/editor-canvas.tsx:76-91` - Usa `react-konva` com `Stage` e `Layer`
- Konva.js suporta nativamente `Group` para agrupar elementos
- Elementos são renderizados individualmente via `CanvasElement`

## Estado Final Desejado

Após implementação:

### Feature 1 - Variáveis Customizadas:
- Campo de variável de imagem aceita texto livre
- Validação de formato `{{nome_variavel}}`
- Exemplos: `{{imagem_destaque}}`, `{{logo_marca}}`, `{{banner_promocao}}`
- Variáveis customizadas são salvas no template normalmente

### Feature 3A - Agrupamento:
- Botão "Criar Grupo" na toolbar ou properties panel
- Agrupar elementos selecionados em um grupo
- Checkbox "Marcar como Destaque" para grupos
- Visual diferenciado para grupos destaque (borda colorida)
- Metadado `highlightSlots` calculado automaticamente no template
- Grupos podem ser desagrupados
- Grupos aparecem no Layers Panel

### Verificação:
- Criar template com variável customizada `{{imagem_destaque}}`
- Criar grupo de 3 elementos (imagem + texto + preço)
- Marcar grupo como destaque
- Salvar template
- Verificar JSON: grupo existe com `isHighlight: true`
- Verificar metadado: `template.highlightSlots = 1`

## O Que NÃO Estamos Fazendo

- ❌ Implementação da detecção de variáveis customizadas na geração (isso é SPEC_08)
- ❌ Seleção de produtos destaque na tela de geração (isso é SPEC_08)
- ❌ Injeção de valores de variáveis customizadas (isso é SPEC_08)
- ❌ Grupos aninhados (grupo dentro de grupo)
- ❌ Transformações de grupo (rotação/escala do grupo inteiro)
- ❌ Snap to grid ou alinhamento automático

## Abordagem de Implementação

### Estratégia para Feature 1:
Simples: trocar `<select>` por `<input>`, adicionar validação de formato.

### Estratégia para Feature 3A:
1. Adicionar novo tipo `ElementGroup` ao schema de tipos
2. Modificar `TemplateData` para suportar grupos
3. Adicionar lógica de agrupamento/desagrupamento no editor
4. Renderizar grupos no canvas com visual diferenciado
5. Calcular `highlightSlots` ao salvar template

---

## Fase 1: Atualizar Types e Schema

### Visão Geral
Adicionar suporte a grupos na estrutura de dados do template.

### Mudanças Necessárias:

#### 1. Template Types - Adicionar Grupos

**Arquivo**: `packages/lib/src/template-types.ts`

**Mudanças**: Adicionar interface de grupo e atualizar TemplateData

```typescript
// Adicionar após a linha 85 (após ImageElement)

export interface ElementGroup {
  id: string;
  type: 'group';
  elementIds: string[]; // IDs dos elementos que compõem o grupo
  isHighlight: boolean; // Se é um grupo destaque
  name: string; // Nome do grupo (ex: "Produto Destaque 1")
}

// Modificar TemplateData (linha 132-135)
export interface TemplateData {
  background: TemplateBackground;
  elements: TemplateElement[];
  groups?: ElementGroup[]; // Opcional para compatibilidade retroativa
}

// Adicionar helper para calcular highlightSlots
export function calculateHighlightSlots(data: TemplateData): number {
  if (!data.groups) return 0;
  return data.groups.filter(g => g.isHighlight).length;
}
```

**Exportar função helper**:
```typescript
// Adicionar ao final do arquivo
export { calculateHighlightSlots };
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Tipos compilam sem erros
- [ ] Interface `ElementGroup` está disponível para importação

---

## Fase 2: Feature 1 - Campo de Variável Customizada

### Visão Geral
Converter campo de variável de imagem de `<select>` para `<input type="text">` com validação.

### Mudanças Necessárias:

#### 1. Properties Panel - Trocar Select por Input

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx`

**Mudanças**: Substituir select por input (linhas 413-442)

```tsx
{/* Image specific */}
{element.type === 'image' && (
  <div className="space-y-2">
    <label className="text-sm font-medium">Variável de Imagem</label>
    <input
      type="text"
      value={element.variable || ''}
      onChange={(e) => {
        const value = e.target.value.trim();
        onUpdate({ variable: value || null });
      }}
      placeholder="Ex: {{imagem_produto_1}} ou {{imagem_destaque}}"
      className="w-full rounded border px-2 py-1.5 text-sm bg-white"
    />
    
    {/* Validação de formato */}
    {element.variable && !element.variable.match(/^\{\{[a-zA-Z0-9_]+\}\}$/) && (
      <p className="text-xs text-red-600">
        ⚠️ Formato inválido. Use: {{nome_variavel}}
      </p>
    )}
    
    {/* Mensagens de ajuda */}
    {element.variable && element.variable.match(/^\{\{[a-zA-Z0-9_]+\}\}$/) && (
      <p className="text-xs text-green-600">
        ✓ Esta imagem será substituída na geração
      </p>
    )}
    
    {!element.variable && (
      <p className="text-xs text-gray-500">
        Deixe vazio para imagem fixa ou use variável customizada
      </p>
    )}
    
    {/* Sugestões comuns */}
    <div className="text-xs text-gray-600">
      <p className="font-medium mb-1">Sugestões:</p>
      <div className="flex flex-wrap gap-1">
        {['{{imagem_produto_1}}', '{{imagem_produto_2}}', '{{imagem_destaque}}', '{{logo_marca}}'].map((suggestion) => (
          <button
            key={suggestion}
            onClick={() => onUpdate({ variable: suggestion })}
            className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs"
          >
            {suggestion}
          </button>
        ))}
      </div>
    </div>
  </div>
)}
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Linting passa: `npm run lint`
- [ ] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Campo aceita texto livre
- [ ] Validação mostra erro para formato inválido (ex: `{imagem}` ou `{{imagem produto}}`)
- [ ] Validação aceita formato válido (ex: `{{imagem_destaque}}`)
- [ ] Botões de sugestão funcionam
- [ ] Valor é salvo corretamente no template

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 3: Feature 3A - Sistema de Agrupamento (UI)

### Visão Geral
Adicionar botões e lógica para criar/desagrupar elementos.

### Mudanças Necessárias:

#### 1. Template Editor - Adicionar Estado de Grupos

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx`

**Mudanças**: Adicionar estado e funções de grupo

```tsx
// Adicionar após linha 172 (após selectedIds)
const [groups, setGroups] = useState<ElementGroup[]>(template.data.groups || []);

// Adicionar função para criar grupo (após linha 309)
function createGroup() {
  if (selectedIds.length < 2) {
    alert('Selecione pelo menos 2 elementos para criar um grupo');
    return;
  }

  const groupId = `group-${Date.now()}`;
  const newGroup: ElementGroup = {
    id: groupId,
    type: 'group',
    elementIds: [...selectedIds],
    isHighlight: false,
    name: `Grupo ${groups.length + 1}`,
  };

  setGroups([...groups, newGroup]);
  setSelectedIds([]); // Deselecionar elementos após agrupar
}

// Adicionar função para desagrupar
function ungroupElements(groupId: string) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;

  setGroups(groups.filter(g => g.id !== groupId));
  setSelectedIds(group.elementIds); // Selecionar elementos do grupo desfeito
}

// Adicionar função para alternar destaque
function toggleGroupHighlight(groupId: string) {
  setGroups(groups.map(g => 
    g.id === groupId ? { ...g, isHighlight: !g.isHighlight } : g
  ));
}

// Adicionar função para renomear grupo
function renameGroup(groupId: string, newName: string) {
  setGroups(groups.map(g => 
    g.id === groupId ? { ...g, name: newName } : g
  ));
}

// Modificar função deleteSelectedElements (linha 219-223)
function deleteSelectedElements() {
  if (selectedIds.length === 0) return;
  
  // Remover elementos
  setElements(elements.filter((el) => !selectedIds.includes(el.id)));
  
  // Remover grupos que contêm elementos deletados
  setGroups(groups.filter(g => 
    !g.elementIds.some(id => selectedIds.includes(id))
  ));
  
  setSelectedIds([]);
}

// Modificar função saveTemplate (linha 380-404) para incluir groups
async function saveTemplate() {
  setSaving(true);
  try {
    const res = await fetch(`/api/templates/${template.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: {
          background,
          elements,
          groups, // Adicionar grupos
        },
        highlightSlots: groups.filter(g => g.isHighlight).length, // Calcular highlightSlots
      }),
    });

    if (res.ok) {
      alert('Template salvo com sucesso!');
      router.refresh();
    }
  } catch (error) {
    console.error('Failed to save template:', error);
    alert('Erro ao salvar template');
  } finally {
    setSaving(false);
  }
}
```

#### 2. Properties Panel - Adicionar Seção de Grupos

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx`

**Mudanças**: Adicionar props e seção de grupos

```tsx
// Modificar interface PropertiesPanelProps (linha 13-18)
interface PropertiesPanelProps {
  element: TemplateElement | null;
  selectedCount: number;
  groups: ElementGroup[]; // ADICIONAR
  selectedIds: string[]; // ADICIONAR
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete: () => void;
  onCreateGroup: () => void; // ADICIONAR
  onToggleHighlight: (groupId: string) => void; // ADICIONAR
  onRenameGroup: (groupId: string, name: string) => void; // ADICIONAR
  onUngroup: (groupId: string) => void; // ADICIONAR
}

// Modificar função PropertiesPanel (linha 20)
export function PropertiesPanel({ 
  element, 
  selectedCount, 
  groups,
  selectedIds,
  onUpdate, 
  onDelete,
  onCreateGroup,
  onToggleHighlight,
  onRenameGroup,
  onUngroup,
}: PropertiesPanelProps) {
  
  // Adicionar helper para verificar se seleção faz parte de um grupo
  const selectedGroup = groups.find(g => 
    selectedIds.length > 0 && selectedIds.every(id => g.elementIds.includes(id))
  );

  // Adicionar seção de agrupamento ANTES da seção "Multiple elements selected" (antes da linha 26)
  
  // Seção de Agrupamento
  if (selectedCount >= 2 && !selectedGroup) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Múltiplos Elementos ({selectedCount})</h3>
        
        <div className="space-y-3">
          <Button
            onClick={onCreateGroup}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            Criar Grupo
          </Button>
          
          <p className="text-xs text-gray-500">
            Agrupe elementos para marcá-los como destaque na geração
          </p>
        </div>
        
        <div className="border-t mt-4 pt-4">
          <Button
            onClick={onDelete}
            variant="destructive"
            className="w-full"
          >
            Excluir Selecionados
          </Button>
        </div>
      </div>
    );
  }
  
  // Seção de Grupo Selecionado
  if (selectedGroup) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Grupo: {selectedGroup.name}</h3>
        
        <div className="space-y-3">
          {/* Nome do grupo */}
          <div>
            <label className="text-sm font-medium">Nome do Grupo</label>
            <input
              type="text"
              value={selectedGroup.name}
              onChange={(e) => onRenameGroup(selectedGroup.id, e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white mt-1"
            />
          </div>
          
          {/* Checkbox destaque */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="highlight-checkbox"
              checked={selectedGroup.isHighlight}
              onChange={() => onToggleHighlight(selectedGroup.id)}
              className="rounded"
            />
            <label htmlFor="highlight-checkbox" className="text-sm font-medium">
              Marcar como Destaque
            </label>
          </div>
          
          {selectedGroup.isHighlight && (
            <p className="text-xs text-green-600">
              ✓ Este grupo será usado para produtos em destaque na geração
            </p>
          )}
          
          {/* Info do grupo */}
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <p><strong>Elementos:</strong> {selectedGroup.elementIds.length}</p>
            <p><strong>IDs:</strong> {selectedGroup.elementIds.join(', ')}</p>
          </div>
          
          {/* Desagrupar */}
          <Button
            onClick={() => onUngroup(selectedGroup.id)}
            variant="outline"
            className="w-full"
          >
            Desagrupar
          </Button>
        </div>
      </div>
    );
  }
  
  // Resto do código existente...
```

#### 3. Template Editor - Passar Props para Properties Panel

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx`

**Mudanças**: Atualizar chamada do PropertiesPanel (linha 479-484)

```tsx
<PropertiesPanel
  element={selectedElement}
  selectedCount={selectedIds.length}
  groups={groups}
  selectedIds={selectedIds}
  onUpdate={(updates: Partial<TemplateElement>) => selectedElement && updateElement(selectedElement.id, updates)}
  onDelete={() => selectedIds.length > 0 && deleteSelectedElements()}
  onCreateGroup={createGroup}
  onToggleHighlight={toggleGroupHighlight}
  onRenameGroup={renameGroup}
  onUngroup={ungroupElements}
/>
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Linting passa: `npm run lint`
- [ ] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Selecionar 2+ elementos mostra botão "Criar Grupo"
- [ ] Clicar "Criar Grupo" cria grupo e deseleciona elementos
- [ ] Selecionar todos elementos de um grupo mostra painel de grupo
- [ ] Checkbox "Marcar como Destaque" funciona
- [ ] Renomear grupo funciona
- [ ] Desagrupar funciona e seleciona elementos
- [ ] Deletar elementos remove grupos relacionados

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 4: Feature 3A - Visual de Grupos no Canvas

### Visão Geral
Adicionar indicação visual de grupos no canvas (borda colorida para grupos destaque).

### Mudanças Necessárias:

#### 1. Editor Canvas - Renderizar Bordas de Grupos

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/editor-canvas.tsx`

**Mudanças**: Adicionar props e renderização de grupos

```tsx
// Adicionar import
import { Rect } from 'react-konva';
import type { ElementGroup } from '@insertflow/lib/template-types';

// Modificar interface (linha 8-17)
interface EditorCanvasProps {
  elements: TemplateElement[];
  selectedIds: string[];
  groups: ElementGroup[]; // ADICIONAR
  dimensions: { width: number; height: number };
  scale: number;
  background: TemplateBackground;
  onSelectElement: (id: string | null, shiftKey?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void;
  onMoveSelected: (deltaX: number, deltaY: number) => void;
}

// Modificar função (linha 19-28)
export default function EditorCanvas({
  elements,
  selectedIds,
  groups, // ADICIONAR
  dimensions,
  scale,
  background,
  onSelectElement,
  onUpdateElement,
  onMoveSelected,
}: EditorCanvasProps) {
  
  // Adicionar helper para calcular bounding box de um grupo
  function getGroupBoundingBox(group: ElementGroup) {
    const groupElements = elements.filter(el => group.elementIds.includes(el.id));
    if (groupElements.length === 0) return null;
    
    const xs = groupElements.map(el => el.x);
    const ys = groupElements.map(el => el.y);
    const rights = groupElements.map(el => el.x + el.width);
    const bottoms = groupElements.map(el => el.y + el.height);
    
    const minX = Math.min(...xs);
    const minY = Math.min(...ys);
    const maxX = Math.max(...rights);
    const maxY = Math.max(...bottoms);
    
    return {
      x: minX - 5, // Padding
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10,
    };
  }
  
  // Modificar JSX (dentro do <Layer>, antes dos elementos - linha 76)
  return (
    <div ...>
      ...
      <Stage ...>
        <Layer>
          
          {/* Bordas de Grupos */}
          {groups.map((group) => {
            const bbox = getGroupBoundingBox(group);
            if (!bbox) return null;
            
            return (
              <Rect
                key={`group-border-${group.id}`}
                x={bbox.x}
                y={bbox.y}
                width={bbox.width}
                height={bbox.height}
                stroke={group.isHighlight ? '#f59e0b' : '#3b82f6'} // Laranja para destaque, azul para normal
                strokeWidth={2}
                dash={[5, 5]}
                listening={false} // Não intercepta eventos
                opacity={0.6}
              />
            );
          })}

          {/* Elements */}
          {elements
            .sort((a, b) => a.layer - b.layer)
            .map((element) => (
              <CanvasElement
                key={element.id}
                element={element}
                isSelected={selectedIds.includes(element.id)}
                onSelect={(shiftKey) => onSelectElement(element.id, shiftKey)}
                onChange={(updates) => onUpdateElement(element.id, updates)}
                onDragMove={selectedIds.length > 1 && selectedIds.includes(element.id) ? onMoveSelected : undefined}
              />
            ))}
        </Layer>
      </Stage>
    </div>
  );
}
```

#### 2. Template Editor - Passar Groups para Canvas

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx`

**Mudanças**: Atualizar chamada do EditorCanvas (linha 462-471)

```tsx
<EditorCanvas
  elements={elements}
  selectedIds={selectedIds}
  groups={groups} // ADICIONAR
  dimensions={dimensions}
  scale={scale}
  background={background}
  onSelectElement={handleSelectElement}
  onUpdateElement={updateElement}
  onMoveSelected={moveSelectedElements}
/>
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Linting passa: `npm run lint`
- [ ] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Grupos normais têm borda azul tracejada
- [ ] Grupos destaque têm borda laranja tracejada
- [ ] Borda se ajusta ao mover elementos do grupo
- [ ] Borda não intercepta cliques (elementos ainda são selecionáveis)

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 5: Layers Panel - Mostrar Grupos

### Visão Geral
Adicionar grupos ao painel de camadas para melhor visualização.

### Mudanças Necessárias:

#### 1. Layers Panel - Adicionar Seção de Grupos

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/layers-panel.tsx`

**Mudanças**: Adicionar props e renderização de grupos

```tsx
// Adicionar import
import { FolderOpen, Star } from 'lucide-react';
import type { ElementGroup } from '@insertflow/lib/template-types';

// Modificar interface (linha 7-14)
interface LayersPanelProps {
  elements: TemplateElement[];
  selectedIds: string[];
  groups: ElementGroup[]; // ADICIONAR
  onSelect: (id: string, shiftKey?: boolean) => void;
  onSelectGroup: (groupId: string) => void; // ADICIONAR
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

// Modificar função (linha 16-23)
export function LayersPanel({
  elements,
  selectedIds,
  groups, // ADICIONAR
  onSelect,
  onSelectGroup, // ADICIONAR
  onMoveLayer,
  onDelete,
  onDuplicate,
}: LayersPanelProps) {
  const sortedElements = [...elements].sort((a, b) => b.layer - a.layer);

  return (
    <div className="p-4 h-64 flex flex-col"> {/* Aumentar altura para 64 */}
      <h3 className="font-semibold mb-2 flex-shrink-0">Camadas</h3>
      <div className="space-y-2 overflow-y-auto flex-1">
        
        {/* Seção de Grupos */}
        {groups.length > 0 && (
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-1">GRUPOS</p>
            {groups.map((group) => (
              <div
                key={group.id}
                className="flex items-center gap-2 p-2 rounded cursor-pointer bg-blue-50 hover:bg-blue-100 border border-blue-200 mb-1"
                onClick={() => onSelectGroup(group.id)}
              >
                <FolderOpen className="h-4 w-4 text-blue-600" />
                <span className="flex-1 text-sm font-medium">
                  {group.name}
                </span>
                {group.isHighlight && (
                  <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                )}
                <span className="text-xs text-gray-500">
                  {group.elementIds.length} itens
                </span>
              </div>
            ))}
          </div>
        )}
        
        {/* Seção de Elementos */}
        <p className="text-xs font-medium text-gray-500 mb-1">ELEMENTOS</p>
        {sortedElements.map((element) => (
          <div
            key={element.id}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
              selectedIds.includes(element.id) ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-100'
            }`}
            onClick={(e) => onSelect(element.id, e.shiftKey)}
          >
            <span className="flex-1 text-sm truncate">
              {element.type === 'text'
                ? element.content.substring(0, 20)
                : element.type.charAt(0).toUpperCase() + element.type.slice(1)}
            </span>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveLayer(element.id, 'up');
                }}
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveLayer(element.id, 'down');
                }}
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicate(element.id);
                }}
                title="Duplicar (Ctrl+D)"
              >
                <Copy className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(element.id);
                }}
                title="Excluir (Delete)"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

#### 2. Template Editor - Adicionar Função de Seleção de Grupo

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx`

**Mudanças**: Adicionar função e atualizar LayersPanel

```tsx
// Adicionar função após handleSelectElement (linha 426)
function handleSelectGroup(groupId: string) {
  const group = groups.find(g => g.id === groupId);
  if (!group) return;
  
  // Selecionar todos os elementos do grupo
  setSelectedIds(group.elementIds);
}

// Modificar chamada do LayersPanel (linha 488-495)
<LayersPanel
  elements={elements}
  selectedIds={selectedIds}
  groups={groups} // ADICIONAR
  onSelect={handleSelectElement}
  onSelectGroup={handleSelectGroup} // ADICIONAR
  onMoveLayer={moveLayer}
  onDelete={deleteElement}
  onDuplicate={duplicateElement}
/>
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Linting passa: `npm run lint`
- [ ] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Grupos aparecem no topo do Layers Panel
- [ ] Ícone de estrela aparece para grupos destaque
- [ ] Clicar em grupo seleciona todos seus elementos
- [ ] Contagem de itens está correta

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 6: API - Salvar highlightSlots no Banco

### Visão Geral
Atualizar API de templates para aceitar e salvar o campo `highlightSlots`.

### Mudanças Necessárias:

#### 1. API de Update de Template

**Arquivo**: `apps/web/src/app/api/templates/[id]/route.ts`

**Mudanças**: Aceitar highlightSlots no body

```typescript
// Localizar a função PATCH (provavelmente linha ~30-60)
// Modificar para aceitar highlightSlots

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const session = await requireOrg();
  const body = await req.json();

  // Validar body
  const { name, data, highlightSlots } = body; // ADICIONAR highlightSlots

  const template = await prisma.template.update({
    where: {
      id: params.id,
      orgId: session.user.orgId!,
    },
    data: {
      ...(name && { name }),
      ...(data && { data }),
      ...(highlightSlots !== undefined && { highlightSlots }), // ADICIONAR
    },
  });

  return NextResponse.json(template);
}
```

#### 2. Verificar Schema do Prisma

**Arquivo**: `packages/database/prisma/schema.prisma`

**Verificação**: Confirmar que campo `highlightSlots` existe no modelo Template

```prisma
model Template {
  id            String   @id @default(cuid())
  name          String
  orgId         String
  folderId      String?
  format        String   // 'feed' | 'stories'
  width         Int
  height        Int
  productSlots  Int
  highlightSlots Int     @default(0) // DEVE EXISTIR
  data          Json
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt
  
  // Relations...
}
```

**Se o campo não existir**, criar migration:

```bash
# Adicionar ao schema.prisma
highlightSlots Int @default(0)

# Gerar migration
npx prisma migrate dev --name add_highlight_slots
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Build completa: `npm run build`
- [ ] Migration roda sem erros (se necessário)

#### Verificação Manual:
- [ ] Salvar template com grupos destaque salva `highlightSlots` correto
- [ ] Verificar no banco: `highlightSlots` está correto
- [ ] Recarregar template mantém grupos e highlightSlots

**Nota de Implementação**: Após completar esta fase e toda verificação automatizada passar, pause aqui para confirmação manual do humano antes de prosseguir para a próxima fase.

---

## Fase 7: Atualizar Documentação e Assistente IA

### Visão Geral
Atualizar o HelpTooltip do editor e o prompt do assistente IA para incluir informações sobre grupos e destaques.

### Mudanças Necessárias:

#### 1. Help Tooltip - Adicionar Seção de Grupos

**Arquivo**: `apps/web/src/app/dashboard/templates/[id]/editor/help-tooltip.tsx`

**Mudanças**: Adicionar nova seção sobre grupos e destaques (após linha 71, antes da seção "Background")

```tsx
{/* Grupos e Destaques */}
<section>
  <h3 className="font-semibold text-blue-600 mb-2">👥 Grupos e Produtos Destaque</h3>
  <p className="text-sm text-gray-600 mb-2">
    Você pode agrupar elementos (imagem + texto + preço) e marcá-los como <strong>destaque</strong> 
    para produtos em evidência:
  </p>
  <div className="bg-gray-50 rounded p-3 text-sm space-y-2">
    <div>
      <strong>Como criar um grupo:</strong>
      <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
        <li>Selecione 2 ou mais elementos (Shift+Click)</li>
        <li>Clique em "Criar Grupo" no painel de propriedades</li>
        <li>Marque "Marcar como Destaque" se for um produto em evidência</li>
      </ol>
    </div>
    <div>
      <strong>Visual no canvas:</strong>
      <ul className="list-disc list-inside ml-2 mt-1">
        <li>Grupos normais: borda azul tracejada</li>
        <li>Grupos destaque: borda laranja tracejada</li>
      </ul>
    </div>
    <div className="bg-amber-50 border border-amber-200 rounded p-2 mt-2">
      <p className="text-xs text-amber-800">
        <strong>💡 Dica:</strong> Na geração de encartes, você poderá escolher quais produtos 
        vão nas posições de destaque!
      </p>
    </div>
  </div>
</section>
```

**Mudanças**: Atualizar seção de Variáveis de Imagem (linha 63-71)

```tsx
{/* Imagens */}
<section>
  <h3 className="font-semibold text-blue-600 mb-2">🖼️ Variáveis de Imagem</h3>
  <p className="text-sm text-gray-600 mb-2">
    Para elementos de imagem, use o campo "Variável de Imagem" no painel de propriedades:
  </p>
  <div className="bg-gray-50 rounded p-3 text-sm space-y-1">
    <div><code className="bg-green-100 px-1 rounded">{'{{imagem_produto_N}}'}</code> → Imagem do produto N</div>
    <div><code className="bg-green-100 px-1 rounded">{'{{imagem_destaque}}'}</code> → Imagem customizada</div>
    <div><code className="bg-green-100 px-1 rounded">{'{{logo_marca}}'}</code> → Logo customizada</div>
  </div>
  <p className="text-xs text-gray-500 mt-2">
    Você pode usar variáveis padrão (imagem_produto_1, imagem_produto_2...) ou criar suas próprias 
    variáveis customizadas seguindo o padrão <code>{'{{nome_variavel}}'}</code>
  </p>
</section>
```

**Mudanças**: Atualizar seção de Dicas (linha 93-102)

```tsx
{/* Dicas */}
<section className="bg-yellow-50 rounded p-3">
  <h3 className="font-semibold text-yellow-700 mb-2">💡 Dicas</h3>
  <ul className="text-sm text-yellow-800 space-y-1 list-disc list-inside">
    <li>Use os botões de variáveis abaixo do campo de texto para inserir rapidamente</li>
    <li>Você pode combinar texto fixo com variáveis: "Apenas R$ {'{{preco_produto_1}}'}"</li>
    <li>Variáveis customizadas permitem campos livres como {'{{texto_promocao}}'}</li>
    <li>Agrupe elementos relacionados (imagem + nome + preço) para melhor organização</li>
    <li>Marque grupos como destaque para produtos em evidência na geração</li>
    <li>As réguas nas laterais ajudam no posicionamento preciso</li>
    <li>Use o painel de camadas para reordenar elementos e visualizar grupos</li>
    <li>Shift+Click para selecionar múltiplos elementos</li>
  </ul>
</section>
```

#### 2. Assistente IA - Atualizar Prompt do Sistema

**Arquivo**: `apps/web/src/app/api/assistant/route.ts`

**Mudanças**: Adicionar seção sobre grupos e variáveis customizadas no SYSTEM_PROMPT (após linha 173, antes da seção "GERAR ENCARTES")

```typescript
// Adicionar após a seção de variáveis (linha ~173)

### 👥 GRUPOS E PRODUTOS DESTAQUE

**O que são grupos?**
Grupos permitem agrupar elementos relacionados (ex: imagem + nome + preço de um produto) e marcá-los como "destaque" para produtos em evidência.

**Como criar um grupo:**
1. No editor de templates, selecione 2 ou mais elementos (use Shift+Click)
2. No painel de propriedades (direita), clique em "Criar Grupo"
3. Dê um nome ao grupo (ex: "Produto Destaque 1")
4. Marque a opção "Marcar como Destaque" se for um produto em evidência

**Visual dos grupos:**
- Grupos normais: borda azul tracejada no canvas
- Grupos destaque: borda laranja tracejada no canvas
- Grupos aparecem no painel de camadas com ícone de pasta

**Como usar na geração:**
Quando você gera encartes com templates que têm grupos destaque:
1. O sistema mostra quantas posições de destaque o template tem
2. Você seleciona quais produtos vão nas posições de destaque
3. Os produtos destaque aparecem nos grupos marcados como destaque
4. Os demais produtos preenchem as posições normais

**Exemplo prático:**
- Template com 6 produtos e 2 grupos destaque
- Na geração, você seleciona 2 dos 6 produtos como destaque
- Esses 2 produtos aparecem nos grupos destaque (com borda laranja)
- Os outros 4 produtos preenchem as posições normais

---

### 🔤 VARIÁVEIS CUSTOMIZADAS

Além das variáveis padrão, você pode criar suas próprias variáveis customizadas.

**Variáveis padrão:**
- {{nome_produto_1}}, {{nome_produto_2}}, etc.
- {{preco_produto_1}}, {{preco_produto_2}}, etc.
- {{imagem_produto_1}}, {{imagem_produto_2}}, etc.

**Variáveis customizadas:**
Você pode criar variáveis com qualquer nome seguindo o padrão {{nome_variavel}}

**Exemplos de variáveis customizadas:**
- {{texto_promocao}} → Para textos livres como "SUPER OFERTA"
- {{imagem_destaque}} → Para imagens customizadas
- {{logo_marca}} → Para logo da marca
- {{data_especial}} → Para datas específicas
- {{banner_promocao}} → Para banners promocionais

**Como usar variáveis customizadas:**

**No editor de templates:**
- Para texto: Digite {{nome_variavel}} no campo de texto
- Para imagem: No campo "Variável de Imagem", digite {{nome_variavel}}
- O sistema valida o formato (deve ter {{ e }})

**Na geração de encartes:**
- O sistema detecta automaticamente as variáveis customizadas
- Mostra campos para você preencher cada variável
- Para texto: campo de texto livre
- Para imagem: upload de arquivo
- Se não preencher, gera em branco (sem erro)

**Exemplo completo:**
1. Crie um template com texto {{texto_promocao}}
2. Adicione uma imagem com variável {{logo_marca}}
3. Na geração, o sistema mostra:
   - Campo "Texto Promoção" → você digita "SUPER OFERTA"
   - Campo "Logo Marca" → você faz upload da logo
4. O encarte é gerado com seus valores customizados

---
```

**Mudanças**: Atualizar seção de EDITOR DE TEMPLATES (linha ~114-140) para incluir grupos

```typescript
### ✏️ EDITOR DE TEMPLATES

O editor é onde você monta visualmente o template.

**Barra de ferramentas (topo):**
- Texto: Adiciona caixa de texto
- Imagem: Adiciona elemento de imagem
- Retângulo, Círculo, Triângulo, Linha, Estrela: Formas geométricas

**Painel de propriedades (direita):**
Quando você seleciona um elemento, pode editar suas propriedades:
- Posição (X, Y)
- Tamanho (Largura, Altura)
- Rotação
- Opacidade
- Propriedades específicas do tipo de elemento

**Quando seleciona múltiplos elementos:**
- Botão "Criar Grupo" aparece
- Permite agrupar elementos relacionados
- Pode marcar grupo como "Destaque"

**Painel de camadas (direita, abaixo):**
Mostra todos os elementos e grupos:
- Grupos aparecem com ícone de pasta
- Grupos destaque têm ícone de estrela
- Permite reordenar elementos (quem fica na frente/trás)
- Clicar em um grupo seleciona todos seus elementos

**Painel de background (direita, topo):**
Define o fundo do template:
- Cor sólida: Uma cor única
- Gradiente: Transição entre cores
- Imagem: Uma imagem de fundo
```

**Mudanças**: Atualizar seção de VARIÁVEIS (linha ~142-173)

```typescript
### 🔤 VARIÁVEIS (muito importante!)

Variáveis são textos especiais que serão substituídos pelos dados reais dos produtos na geração.

**Variáveis padrão de texto:**
- {{nome_produto_1}} → Nome do produto 1
- {{nome_produto_2}} → Nome do produto 2
- {{preco_produto_1}} → Preço do produto 1 (apenas o valor, ex: "12,99")
- {{preco_produto_2}} → Preço do produto 2

**Variáveis padrão de imagem:**
Para elementos de imagem, no campo "Variável de Imagem":
- {{imagem_produto_1}} → Será substituída pela foto do produto 1
- {{imagem_produto_2}} → Será substituída pela foto do produto 2
- E assim por diante...

**Variáveis customizadas:**
Você pode criar suas próprias variáveis seguindo o padrão {{nome_variavel}}:
- {{texto_promocao}} → Texto livre que você define na geração
- {{imagem_destaque}} → Imagem customizada que você faz upload na geração
- {{logo_marca}} → Logo da marca
- {{data_especial}} → Data específica

**Como usar variáveis customizadas:**
1. No editor, digite a variável no formato {{nome_variavel}}
2. Na geração, o sistema detecta automaticamente
3. Mostra campos para você preencher
4. Se não preencher, gera em branco

**IMPORTANTE sobre preços:**
- A variável {{preco_produto_1}} retorna APENAS o valor numérico (ex: "12,99")
- O símbolo "R$" deve ser um texto FIXO no template, não faz parte da variável
- Exemplo: Crie um texto "R$" fixo e ao lado um texto com {{preco_produto_1}}

**Exemplo de template de 2 produtos com destaque:**
- Grupo Destaque 1 (borda laranja):
  - Imagem com variável: {{imagem_produto_1}}
  - Texto com variável: {{nome_produto_1}}
  - Texto fixo: "R$"
  - Texto com variável: {{preco_produto_1}}
- Produto Normal:
  - Imagem com variável: {{imagem_produto_2}}
  - Texto com variável: {{nome_produto_2}}
  - Texto fixo: "R$"
  - Texto com variável: {{preco_produto_2}}
- Texto customizado: {{texto_promocao}}
- Imagem customizada: {{logo_marca}}
```

**Mudanças**: Atualizar seção GERAR ENCARTES (linha ~176-200)

```typescript
### ⚡ GERAR ENCARTES

**Como funciona?**
1. Acesse Sidebar > Gerar Encartes
2. Selecione a Pasta (ex: "Mercado Maré")
3. Selecione o Formato (Feed ou Stories)
4. Selecione os Produtos que deseja incluir
5. Clique em "Continuar"
6. **NOVO:** Configure cada encarte:
   - Preencha variáveis customizadas (se houver)
   - Selecione produtos destaque (se o template tiver)
7. Clique em "Gerar Encartes"

**Configuração de variáveis customizadas:**
Se o template tiver variáveis customizadas (ex: {{texto_promocao}}):
- O sistema mostra campos para preencher
- Campos de texto: digite o valor
- Campos de imagem: faça upload
- Campos são opcionais (pode deixar vazio)

**Seleção de produtos destaque:**
Se o template tiver grupos marcados como destaque:
- O sistema mostra quantas posições de destaque existem
- Você seleciona quais produtos vão nas posições de destaque
- Exemplo: Template com 2 destaques → selecione 2 produtos
- Os produtos destaque aparecem nos grupos com borda laranja

**O que acontece na geração?**
O sistema pega os produtos selecionados e distribui nos templates disponíveis:
- Se você tem 10 produtos e um template de 4 slots → 3 encartes (4+4+2)
- Se você tem 6 produtos e um template de 6 slots → 1 encarte
- Se você tem 12 produtos e templates de 4 e 6 slots → o sistema escolhe a melhor combinação

**Histórico de gerações:**
- Mostra todas as gerações realizadas
- Status: Pendente, Processando, Concluído, Falhou
- Atualiza automaticamente a cada 5 segundos
- Clique em "Ver Encartes" para visualizar e baixar

**Download:**
- Clique no botão de download para baixar o encarte em PNG
- A imagem está em alta resolução (2x) para impressão
```

**Mudanças**: Adicionar novas perguntas frequentes (após linha 287)

```typescript
**P: O que são grupos destaque?**
R: Grupos destaque são conjuntos de elementos (imagem + texto + preço) marcados para produtos em evidência. Na geração, você escolhe quais produtos vão nessas posições especiais. Eles aparecem com borda laranja no editor.

**P: Como criar variáveis customizadas?**
R: No editor, digite {{nome_variavel}} em campos de texto ou no campo "Variável de Imagem". Na geração, o sistema detecta automaticamente e mostra campos para você preencher. Exemplos: {{texto_promocao}}, {{logo_marca}}.

**P: Posso deixar variáveis customizadas vazias?**
R: Sim! Se você não preencher uma variável customizada na geração, ela aparece em branco no encarte (sem erro). Isso é útil para campos opcionais.

**P: Quantos produtos destaque posso ter em um template?**
R: Depende de quantos grupos você marcar como destaque. Cada grupo destaque = 1 posição de destaque. Na geração, você seleciona quais produtos vão nessas posições.

**P: Como sei se um grupo é destaque?**
R: No editor, grupos destaque têm borda laranja tracejada. Grupos normais têm borda azul. No painel de camadas, grupos destaque têm ícone de estrela.
```

### Critérios de Sucesso:

#### Verificação Automatizada:
- [ ] Type checking passa: `npm run typecheck`
- [ ] Build completa: `npm run build`

#### Verificação Manual:
- [ ] Abrir HelpTooltip no editor → nova seção sobre grupos aparece
- [ ] Informações sobre variáveis customizadas estão atualizadas
- [ ] Perguntar ao assistente IA "Como criar grupos?" → responde corretamente
- [ ] Perguntar "O que são variáveis customizadas?" → responde corretamente
- [ ] Perguntar "Como usar produtos destaque?" → responde corretamente

---

## Estratégia de Testes

### Testes Unitários:

**Arquivo:** `apps/web/src/__tests__/template-groups.test.ts`

```typescript
import { calculateHighlightSlots } from '@insertflow/lib/template-types';
import type { TemplateData, ElementGroup } from '@insertflow/lib/template-types';

describe('Template Groups', () => {
  it('calcula highlightSlots corretamente', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [],
      groups: [
        { id: 'g1', type: 'group', elementIds: ['e1', 'e2'], isHighlight: true, name: 'Grupo 1' },
        { id: 'g2', type: 'group', elementIds: ['e3', 'e4'], isHighlight: false, name: 'Grupo 2' },
        { id: 'g3', type: 'group', elementIds: ['e5'], isHighlight: true, name: 'Grupo 3' },
      ],
    };

    expect(calculateHighlightSlots(data)).toBe(2);
  });

  it('retorna 0 quando não há grupos', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [],
    };

    expect(calculateHighlightSlots(data)).toBe(0);
  });

  it('retorna 0 quando nenhum grupo é destaque', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [],
      groups: [
        { id: 'g1', type: 'group', elementIds: ['e1'], isHighlight: false, name: 'Grupo 1' },
      ],
    };

    expect(calculateHighlightSlots(data)).toBe(0);
  });
});
```

### Passos de Teste Manual:

#### Feature 1 - Variáveis Customizadas:
1. Abrir editor de template
2. Adicionar elemento de imagem
3. No Properties Panel, clicar no campo de variável
4. Digitar `{{imagem_destaque}}`
5. Verificar que validação aceita
6. Digitar `{imagem}` (inválido)
7. Verificar que validação mostra erro
8. Salvar template
9. Recarregar página
10. Verificar que variável customizada foi mantida

#### Feature 3A - Agrupamento:
1. Abrir editor de template
2. Adicionar 3 elementos (imagem, texto, retângulo)
3. Selecionar os 3 elementos (Shift+Click)
4. Verificar botão "Criar Grupo" aparece
5. Clicar "Criar Grupo"
6. Verificar que grupo aparece no Layers Panel
7. Verificar borda azul tracejada no canvas
8. Clicar no grupo no Layers Panel
9. Verificar que todos elementos são selecionados
10. Marcar checkbox "Marcar como Destaque"
11. Verificar borda muda para laranja
12. Verificar ícone de estrela no Layers Panel
13. Salvar template
14. Verificar no banco: `highlightSlots = 1`
15. Recarregar página
16. Verificar que grupo e destaque foram mantidos
17. Desagrupar
18. Verificar que elementos voltam a ser independentes

## Considerações de Performance

- Cálculo de bounding box de grupos é feito a cada render - considerar memoização se houver muitos grupos
- Validação de regex de variável é executada a cada keystroke - performance aceitável para strings curtas

## Notas de Migração

- Templates existentes sem campo `groups` continuam funcionando (campo é opcional)
- Templates existentes terão `highlightSlots = 0` por padrão
- Não é necessário migração de dados existentes

## Referências

- PRD Original: `TEMP_PRD.md`
- Spec Relacionada: `SPEC_04_TEMPLATE_EDITOR.md`
- Konva Groups: https://konvajs.org/docs/groups_and_layers/Groups.html
- React Konva: https://konvajs.org/docs/react/
