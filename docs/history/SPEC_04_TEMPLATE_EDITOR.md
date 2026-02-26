# SPEC_04_TEMPLATE_EDITOR - Editor Visual de Templates

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_02_EDITOR  
**Depende de:** SPEC_00_FUNDACAO, SPEC_01_AUTH_MULTITENANCY, SPEC_02_CRUD_CORE

---

## Visão Geral

Editor visual de templates usando Konva.js + react-konva. Permite criar layouts de encartes com drag-and-drop, elementos visuais (textos, imagens, formas), variáveis de produtos e serialização JSON para o banco de dados.

## Estado Final Desejado

- ✅ Canvas interativo com Konva.js (1080x1440 ou 1080x1920)
- ✅ Toolbar com elementos arrastáveis (texto, imagem, retângulo, círculo)
- ✅ Properties panel para editar propriedades
- ✅ Layers panel para gerenciar z-index
- ✅ Sistema de variáveis ({{nome_produto_N}}, {{preco_produto_N}}, {{imagem_produto_N}})
- ✅ Serialização/deserialização JSON
- ✅ Salvar/carregar templates do banco
- ✅ Clonagem de templates

## O Que NÃO Estamos Fazendo

- ❌ Undo/Redo (pode ser adicionado depois)
- ❌ Grupos de elementos
- ❌ Alinhamento automático (snap to grid)
- ❌ Preview em tempo real da geração

---

## Fase 1: Types e Schema JSON

### Arquivo: `packages/lib/src/template-types.ts`

```typescript
export type TemplateFormat = 'feed' | 'stories';

export interface TemplateMetadata {
  id: string;
  name: string;
  orgId: string;
  folderId: string | null;
  format: TemplateFormat;
  width: number;
  height: number;
  productSlots: number;
}

export interface TemplateBackground {
  type: 'color' | 'gradient' | 'image';
  value: string; // hex color, gradient CSS, or image URL
}

export type ElementType = 'text' | 'image' | 'rect' | 'circle';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: number;
  locked: boolean;
}

export interface TextElement extends BaseElement {
  type: 'text';
  content: string; // pode conter variáveis: {{nome_produto_1}}
  fontSize: number;
  fontFamily: string;
  color: string;
  bold: boolean;
  italic: boolean;
  align: 'left' | 'center' | 'right';
}

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string | null; // URL da imagem fixa ou null
  variable: string | null; // {{imagem_produto_1}} ou null
}

export interface RectElement extends BaseElement {
  type: 'rect';
  fill: string;
  stroke: string;
  strokeWidth: number;
  cornerRadius: number;
}

export interface CircleElement extends BaseElement {
  type: 'circle';
  radius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
}

export type TemplateElement = TextElement | ImageElement | RectElement | CircleElement;

export interface TemplateData {
  background: TemplateBackground;
  elements: TemplateElement[];
}

export interface Template extends TemplateMetadata {
  data: TemplateData;
  createdAt: Date;
  updatedAt: Date;
}

// Dimensões por formato
export const TEMPLATE_DIMENSIONS = {
  feed: { width: 1080, height: 1440 }, // 3:4
  stories: { width: 1080, height: 1920 }, // 9:16
} as const;
```

---

## Fase 2: Template Editor Core (Konva)

### Arquivo: `apps/web/src/app/dashboard/templates/[id]/editor/page.tsx`

```typescript
import { requireOrg } from '@/lib/auth-helpers';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { TemplateEditor } from './template-editor';

export default async function EditorPage({ params }: { params: { id: string } }) {
  const session = await requireOrg();

  const template = await prisma.template.findFirst({
    where: {
      id: params.id,
      orgId: session.user.orgId!,
    },
  });

  if (!template) {
    notFound();
  }

  return <TemplateEditor template={template} />;
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/[id]/editor/template-editor.tsx`

```typescript
'use client';

import { useState } from 'react';
import { Stage, Layer } from 'react-konva';
import { Template, TemplateElement, TEMPLATE_DIMENSIONS } from '@insertflow/lib/template-types';
import { Toolbar } from './toolbar';
import { PropertiesPanel } from './properties-panel';
import { LayersPanel } from './layers-panel';
import { CanvasElement } from './canvas-element';
import { Button } from '@insertflow/ui';
import { Save } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TemplateEditorProps {
  template: any;
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const [elements, setElements] = useState<TemplateElement[]>(template.data.elements || []);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const dimensions = TEMPLATE_DIMENSIONS[template.format as 'feed' | 'stories'];
  const scale = 0.5; // 50% para caber na tela

  function addElement(type: 'text' | 'image' | 'rect' | 'circle') {
    const newElement: TemplateElement = {
      id: `el-${Date.now()}`,
      type,
      x: 100,
      y: 100,
      width: type === 'text' ? 200 : 150,
      height: type === 'text' ? 50 : 150,
      rotation: 0,
      layer: elements.length,
      locked: false,
      ...(type === 'text' && {
        content: 'Texto',
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        bold: false,
        italic: false,
        align: 'left',
      }),
      ...(type === 'image' && {
        src: null,
        variable: null,
      }),
      ...(type === 'rect' && {
        fill: '#cccccc',
        stroke: '#000000',
        strokeWidth: 0,
        cornerRadius: 0,
      }),
      ...(type === 'circle' && {
        radius: 75,
        fill: '#cccccc',
        stroke: '#000000',
        strokeWidth: 0,
      }),
    } as TemplateElement;

    setElements([...elements, newElement]);
    setSelectedId(newElement.id);
  }

  function updateElement(id: string, updates: Partial<TemplateElement>) {
    setElements(elements.map((el) => (el.id === id ? { ...el, ...updates } : el)));
  }

  function deleteElement(id: string) {
    setElements(elements.filter((el) => el.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  function moveLayer(id: string, direction: 'up' | 'down') {
    const index = elements.findIndex((el) => el.id === id);
    if (index === -1) return;

    const newElements = [...elements];
    const targetIndex = direction === 'up' ? index + 1 : index - 1;

    if (targetIndex < 0 || targetIndex >= elements.length) return;

    [newElements[index], newElements[targetIndex]] = [
      newElements[targetIndex],
      newElements[index],
    ];

    // Update layer numbers
    newElements.forEach((el, i) => {
      el.layer = i;
    });

    setElements(newElements);
  }

  async function saveTemplate() {
    setSaving(true);
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: {
            background: template.data.background,
            elements,
          },
        }),
      });

      if (res.ok) {
        alert('Template salvo com sucesso!');
      }
    } catch (error) {
      console.error('Failed to save template:', error);
      alert('Erro ao salvar template');
    } finally {
      setSaving(false);
    }
  }

  const selectedElement = elements.find((el) => el.id === selectedId);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="w-20 bg-white border-r">
        <Toolbar onAddElement={addElement} />
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">{template.name}</h1>
          <Button onClick={saveTemplate} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>

        <div className="flex-1 overflow-auto flex items-center justify-center p-8">
          <div
            className="bg-white shadow-lg"
            style={{
              width: dimensions.width * scale,
              height: dimensions.height * scale,
            }}
          >
            <Stage
              width={dimensions.width * scale}
              height={dimensions.height * scale}
              scaleX={scale}
              scaleY={scale}
              onClick={(e) => {
                if (e.target === e.target.getStage()) {
                  setSelectedId(null);
                }
              }}
            >
              <Layer>
                {/* Background */}
                <CanvasElement
                  key="background"
                  element={{
                    id: 'background',
                    type: 'rect',
                    x: 0,
                    y: 0,
                    width: dimensions.width,
                    height: dimensions.height,
                    rotation: 0,
                    layer: -1,
                    locked: true,
                    fill: template.data.background.value || '#ffffff',
                    stroke: '',
                    strokeWidth: 0,
                    cornerRadius: 0,
                  }}
                  isSelected={false}
                  onSelect={() => {}}
                  onChange={() => {}}
                />

                {/* Elements */}
                {elements
                  .sort((a, b) => a.layer - b.layer)
                  .map((element) => (
                    <CanvasElement
                      key={element.id}
                      element={element}
                      isSelected={element.id === selectedId}
                      onSelect={() => setSelectedId(element.id)}
                      onChange={(updates) => updateElement(element.id, updates)}
                    />
                  ))}
              </Layer>
            </Stage>
          </div>
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="flex-1 overflow-auto">
          <PropertiesPanel
            element={selectedElement}
            onUpdate={(updates) => selectedElement && updateElement(selectedElement.id, updates)}
            onDelete={() => selectedElement && deleteElement(selectedElement.id)}
          />
        </div>

        <div className="border-t">
          <LayersPanel
            elements={elements}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onMoveLayer={moveLayer}
            onDelete={deleteElement}
          />
        </div>
      </div>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/[id]/editor/canvas-element.tsx`

```typescript
'use client';

import { Rect, Circle, Text as KonvaText, Transformer } from 'react-konva';
import { useRef, useEffect } from 'react';
import { TemplateElement } from '@insertflow/lib/template-types';

interface CanvasElementProps {
  element: TemplateElement;
  isSelected: boolean;
  onSelect: () => void;
  onChange: (updates: Partial<TemplateElement>) => void;
}

export function CanvasElement({ element, isSelected, onSelect, onChange }: CanvasElementProps) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);

  useEffect(() => {
    if (isSelected && trRef.current && shapeRef.current) {
      trRef.current.nodes([shapeRef.current]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const commonProps = {
    ref: shapeRef,
    x: element.x,
    y: element.y,
    rotation: element.rotation,
    draggable: !element.locked,
    onClick: onSelect,
    onTap: onSelect,
    onDragEnd: (e: any) => {
      onChange({
        x: e.target.x(),
        y: e.target.y(),
      });
    },
    onTransformEnd: () => {
      const node = shapeRef.current;
      if (!node) return;

      const scaleX = node.scaleX();
      const scaleY = node.scaleY();

      node.scaleX(1);
      node.scaleY(1);

      onChange({
        x: node.x(),
        y: node.y(),
        width: Math.max(5, node.width() * scaleX),
        height: Math.max(5, node.height() * scaleY),
        rotation: node.rotation(),
      });
    },
  };

  let shape = null;

  switch (element.type) {
    case 'rect':
      shape = (
        <Rect
          {...commonProps}
          width={element.width}
          height={element.height}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          cornerRadius={element.cornerRadius}
        />
      );
      break;

    case 'circle':
      shape = (
        <Circle
          {...commonProps}
          radius={element.radius}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
        />
      );
      break;

    case 'text':
      shape = (
        <KonvaText
          {...commonProps}
          text={element.content}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fill={element.color}
          fontStyle={`${element.bold ? 'bold' : ''} ${element.italic ? 'italic' : ''}`.trim()}
          align={element.align}
          width={element.width}
        />
      );
      break;

    case 'image':
      // Placeholder para imagens (implementação completa requer useImage hook)
      shape = (
        <Rect
          {...commonProps}
          width={element.width}
          height={element.height}
          fill="#e0e0e0"
          stroke="#999"
          strokeWidth={2}
          dash={[5, 5]}
        />
      );
      break;
  }

  return (
    <>
      {shape}
      {isSelected && <Transformer ref={trRef} />}
    </>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/[id]/editor/toolbar.tsx`

```typescript
'use client';

import { Type, Image, Square, Circle } from 'lucide-react';
import { Button } from '@insertflow/ui';

interface ToolbarProps {
  onAddElement: (type: 'text' | 'image' | 'rect' | 'circle') => void;
}

export function Toolbar({ onAddElement }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-2 p-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('text')}
        title="Adicionar Texto"
      >
        <Type className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('image')}
        title="Adicionar Imagem"
      >
        <Image className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('rect')}
        title="Adicionar Retângulo"
      >
        <Square className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('circle')}
        title="Adicionar Círculo"
      >
        <Circle className="h-5 w-5" />
      </Button>
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/[id]/editor/properties-panel.tsx`

```typescript
'use client';

import { TemplateElement } from '@insertflow/lib/template-types';
import { Button } from '@insertflow/ui';
import { Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  element: TemplateElement | undefined;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete: () => void;
}

export function PropertiesPanel({ element, onUpdate, onDelete }: PropertiesPanelProps) {
  if (!element) {
    return (
      <div className="p-4 text-center text-gray-500">
        Selecione um elemento para editar
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Propriedades</h3>
        <Button variant="ghost" size="sm" onClick={onDelete}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Position */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Posição</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">X</label>
            <input
              type="number"
              value={Math.round(element.x)}
              onChange={(e) => onUpdate({ x: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Y</label>
            <input
              type="number"
              value={Math.round(element.y)}
              onChange={(e) => onUpdate({ y: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Tamanho</label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-gray-600">Largura</label>
            <input
              type="number"
              value={Math.round(element.width)}
              onChange={(e) => onUpdate({ width: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
          <div>
            <label className="text-xs text-gray-600">Altura</label>
            <input
              type="number"
              value={Math.round(element.height)}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Text specific */}
      {element.type === 'text' && (
        <>
          <div>
            <label className="text-sm font-medium">Texto</label>
            <textarea
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
              rows={3}
              placeholder="Use {{nome_produto_1}}, {{preco_produto_1}}, etc."
            />
          </div>

          <div>
            <label className="text-sm font-medium">Tamanho da Fonte</label>
            <input
              type="number"
              value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Cor</label>
            <input
              type="color"
              value={element.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-full h-10 rounded border"
            />
          </div>

          <div className="flex gap-2">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.bold}
                onChange={(e) => onUpdate({ bold: e.target.checked })}
              />
              <span className="text-sm">Negrito</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.italic}
                onChange={(e) => onUpdate({ italic: e.target.checked })}
              />
              <span className="text-sm">Itálico</span>
            </label>
          </div>
        </>
      )}

      {/* Rect/Circle specific */}
      {(element.type === 'rect' || element.type === 'circle') && (
        <>
          <div>
            <label className="text-sm font-medium">Preenchimento</label>
            <input
              type="color"
              value={element.fill}
              onChange={(e) => onUpdate({ fill: e.target.value })}
              className="w-full h-10 rounded border"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Borda</label>
            <input
              type="color"
              value={element.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
              className="w-full h-10 rounded border"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Espessura da Borda</label>
            <input
              type="number"
              value={element.strokeWidth}
              onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
            />
          </div>
        </>
      )}

      {/* Image specific */}
      {element.type === 'image' && (
        <div>
          <label className="text-sm font-medium">Variável</label>
          <input
            type="text"
            value={element.variable || ''}
            onChange={(e) => onUpdate({ variable: e.target.value })}
            placeholder="{{imagem_produto_1}}"
            className="w-full rounded border px-2 py-1 text-sm"
          />
        </div>
      )}
    </div>
  );
}
```

### Arquivo: `apps/web/src/app/dashboard/templates/[id]/editor/layers-panel.tsx`

```typescript
'use client';

import { TemplateElement } from '@insertflow/lib/template-types';
import { Button } from '@insertflow/ui';
import { ChevronUp, ChevronDown, Trash2 } from 'lucide-react';

interface LayersPanelProps {
  elements: TemplateElement[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
}

export function LayersPanel({
  elements,
  selectedId,
  onSelect,
  onMoveLayer,
  onDelete,
}: LayersPanelProps) {
  const sortedElements = [...elements].sort((a, b) => b.layer - a.layer);

  return (
    <div className="p-4">
      <h3 className="font-semibold mb-2">Camadas</h3>
      <div className="space-y-1">
        {sortedElements.map((element) => (
          <div
            key={element.id}
            className={`flex items-center gap-2 p-2 rounded cursor-pointer ${
              selectedId === element.id ? 'bg-primary/10' : 'hover:bg-gray-100'
            }`}
            onClick={() => onSelect(element.id)}
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
                  onDelete(element.id);
                }}
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

---

## Fase 3: API Routes - Templates

### Arquivo: `apps/web/src/app/api/templates/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';
import { TEMPLATE_DIMENSIONS } from '@insertflow/lib/template-types';

export async function GET(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();

    const { searchParams } = new URL(req.url);
    const folderId = searchParams.get('folderId');
    const format = searchParams.get('format');

    const where: any = {};
    if (folderId) where.folderId = folderId;
    if (format) where.format = format;

    const templates = await db.template.findMany({
      where,
      include: {
        folder: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    const dimensions = TEMPLATE_DIMENSIONS[body.format as 'feed' | 'stories'];

    const template = await db.template.create({
      data: {
        name: body.name,
        orgId: session.user.orgId!,
        folderId: body.folderId || null,
        format: body.format,
        width: dimensions.width,
        height: dimensions.height,
        productSlots: body.productSlots || 1,
        data: {
          background: { type: 'color', value: '#ffffff' },
          elements: [],
        },
      },
    });

    return NextResponse.json({ template }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}
```

### Arquivo: `apps/web/src/app/api/templates/[id]/route.ts`

```typescript
import { NextResponse } from 'next/server';
import { getPrismaWithTenant } from '@/lib/prisma-tenant';
import { requireOrg } from '@/lib/auth-helpers';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();
    const body = await req.json();

    const template = await db.template.update({
      where: { id: params.id },
      data: {
        name: body.name,
        productSlots: body.productSlots,
        data: body.data,
      },
    });

    return NextResponse.json({ template });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update template' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    await requireOrg();
    const db = await getPrismaWithTenant();

    await db.template.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete template' }, { status: 500 });
  }
}
```

---

## Adições e Melhorias Implementadas (v1.1)

### Novas Formas Geométricas

Adicionados novos tipos de elementos ao editor:

```typescript
export type ElementType = 'text' | 'image' | 'rect' | 'circle' | 'triangle' | 'line' | 'star';

export interface TriangleElement extends BaseElement {
  type: 'triangle';
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
}

export interface LineElement extends BaseElement {
  type: 'line';
  points: number[]; // [x1, y1, x2, y2]
  stroke: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
}

export interface StarElement extends BaseElement {
  type: 'star';
  numPoints: number;
  innerRadius: number;
  outerRadius: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: number[];
  opacity: number;
}
```

### Novas Propriedades de Estilo

Todas as formas agora suportam:
- **opacity** (0-1): Transparência do elemento
- **dash** (number[]): Padrão de borda tracejada (ex: [5,5] para tracejado)
- **cornerRadius** (rect): Arredondamento de cantos

### Propriedades de Texto Expandidas

```typescript
export interface TextElement extends BaseElement {
  type: 'text';
  content: string;
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight; // 100-900
  color: string;
  italic: boolean;
  underline: boolean;
  align: 'left' | 'center' | 'right';
  lineHeight: number;
  letterSpacing: number;
  opacity: number;
}

export const AVAILABLE_FONTS = [
  'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 
  'Verdana', 'Courier New', 'Impact', 'Comic Sans MS',
  'Trebuchet MS', 'Arial Black', 'Palatino', 'Garamond',
  'Bookman', 'Tahoma', 'Lucida Console'
];

export const FONT_WEIGHTS = [100, 200, 300, 400, 500, 600, 700, 800, 900];
```

### Novos Componentes do Editor

#### `rulers.tsx` - Réguas de Posicionamento
- Régua horizontal (topo) e vertical (esquerda)
- Marcações a cada 10px, números a cada 50px
- Escala automática baseada no zoom

#### `background-panel.tsx` - Configuração de Fundo
- Cor sólida com 16 cores rápidas
- Gradientes CSS com 8 presets
- Imagem de fundo (URL, galeria ou variável)
- Seletor de imagens da galeria integrado

#### `help-tooltip.tsx` - Guia de Ajuda
- Modal explicativo sobre o funcionamento do editor
- Documentação das variáveis disponíveis
- Dicas de uso e exemplos práticos

### Variáveis Disponíveis

| Tipo | Variável | Descrição |
|------|----------|-----------|
| Texto | `{{nome_produto_N}}` | Nome do produto N |
| Texto | `{{preco_produto_N}}` | Preço do produto N |
| Texto | `{{descricao_produto_N}}` | Descrição do produto N |
| Imagem | `{{imagem_produto_N}}` | Imagem do produto N |
| Fundo | `{{fundo_produto_N}}` | Imagem de fundo dinâmica |

### Melhorias de UX

1. **Toolbar expandida**: Botões para triângulo, linha e estrela
2. **Properties Panel**: 
   - Botões de inserir variáveis no texto
   - Controles de opacidade para todos os elementos
   - Seletor de borda tracejada
   - Configurações específicas para estrela (pontas, raios)
3. **Transformer customizado**: Handles menores e mais discretos
4. **Botão de voltar**: Navegação para lista de templates
5. **Margem superior**: Espaçamento adequado para templates stories

### Arquivos Criados/Modificados

```
apps/web/src/app/dashboard/templates/[id]/editor/
├── page.tsx
├── template-editor.tsx (expandido)
├── canvas-element.tsx (novas formas)
├── editor-canvas.tsx (réguas + background HTML)
├── toolbar.tsx (novos botões)
├── properties-panel.tsx (novas opções)
├── layers-panel.tsx (scroll)
├── rulers.tsx (novo)
├── background-panel.tsx (novo)
└── help-tooltip.tsx (novo)

packages/lib/src/
└── template-types.ts (tipos expandidos)
```

---

## Critérios de Sucesso

### Verificação Automatizada:
- [x] Konva.js renderiza canvas corretamente
- [x] Elementos podem ser adicionados ao canvas
- [x] Serialização JSON funciona
- [x] Templates são salvos no banco
- [x] Novas formas (triângulo, linha, estrela) renderizam
- [x] Propriedades de estilo (opacity, dash) funcionam
- [x] Background suporta cor, gradiente e imagem

### Verificação Manual:
- [x] Drag-and-drop de elementos funciona
- [x] Redimensionamento e rotação funcionam
- [x] Properties panel atualiza elementos
- [x] Layers panel gerencia z-index
- [x] Variáveis podem ser inseridas em textos
- [x] Template é salvo e pode ser recarregado
- [x] Canvas renderiza nos tamanhos corretos (feed/stories)
- [x] Réguas exibem posicionamento
- [x] Seleção de imagem da galeria funciona
- [x] Tooltip de ajuda exibe informações

---

## Próxima Spec

**SPEC_05_GENERATION_ENGINE.md** - Engine de geração de encartes PNG com Puppeteer, Sharp, BullMQ e algoritmo de divisão de produtos.
