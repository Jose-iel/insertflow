'use client';

import { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import type { TemplateElement, TextElement, ImageElement, RectElement, CircleElement, TriangleElement, LineElement, StarElement, TemplateBackground, ElementGroup } from '@insertflow/lib/template-types';
import { TEMPLATE_DIMENSIONS } from '@insertflow/lib/template-types';

type ShapeType = 'text' | 'image' | 'rect' | 'circle' | 'triangle' | 'line' | 'star';
import { Toolbar } from './toolbar';
import { PropertiesPanel } from './properties-panel';
import { LayersPanel } from './layers-panel';
import { BackgroundPanel } from './background-panel';
import { HelpTooltip } from './help-tooltip';
import { Button } from '@insertflow/ui';
import { Save, ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

const EditorCanvas = dynamic(() => import('./editor-canvas'), { ssr: false });

interface TemplateEditorProps {
  template: any;
}

function createTextElement(id: string, layer: number): TextElement {
  return {
    id,
    type: 'text',
    x: 100,
    y: 100,
    width: 200,
    height: 50,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    content: 'Texto',
    fontSize: 24,
    fontFamily: 'Arial',
    fontWeight: 400,
    color: '#000000',
    italic: false,
    underline: false,
    lineHeight: 1.2,
    letterSpacing: 0,
    align: 'left',
  };
}

function createImageElement(id: string, layer: number): ImageElement {
  return {
    id,
    type: 'image',
    x: 100,
    y: 100,
    width: 150,
    height: 150,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    src: null,
    variable: null,
  };
}

function createRectElement(id: string, layer: number): RectElement {
  return {
    id,
    type: 'rect',
    x: 100,
    y: 100,
    width: 150,
    height: 150,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    fill: '#cccccc',
    stroke: '#000000',
    strokeWidth: 0,
    dash: [],
    cornerRadius: 0,
  };
}

function createCircleElement(id: string, layer: number): CircleElement {
  return {
    id,
    type: 'circle',
    x: 100,
    y: 100,
    width: 150,
    height: 150,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    fill: '#cccccc',
    stroke: '#000000',
    strokeWidth: 0,
    dash: [],
  };
}

function createTriangleElement(id: string, layer: number): TriangleElement {
  return {
    id,
    type: 'triangle',
    x: 100,
    y: 100,
    width: 150,
    height: 130,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    fill: '#cccccc',
    stroke: '#000000',
    strokeWidth: 0,
    dash: [],
  };
}

function createLineElement(id: string, layer: number): LineElement {
  return {
    id,
    type: 'line',
    x: 100,
    y: 100,
    width: 200,
    height: 0,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    stroke: '#000000',
    strokeWidth: 2,
    dash: [],
    points: [0, 0, 200, 0],
  };
}

function createStarElement(id: string, layer: number): StarElement {
  return {
    id,
    type: 'star',
    x: 100,
    y: 100,
    width: 100,
    height: 100,
    rotation: 0,
    layer,
    locked: false,
    opacity: 1,
    fill: '#cccccc',
    stroke: '#000000',
    strokeWidth: 0,
    dash: [],
    numPoints: 5,
    innerRadius: 25,
    outerRadius: 50,
  };
}

export function TemplateEditor({ template }: TemplateEditorProps) {
  const router = useRouter();
  const [elements, setElements] = useState<TemplateElement[]>(template.data.elements || []);
  const [background, setBackground] = useState<TemplateBackground>(
    template.data.background || { type: 'color', value: '#ffffff' }
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<ElementGroup[]>(template.data.groups || []);
  const [saving, setSaving] = useState(false);

  const dimensions = TEMPLATE_DIMENSIONS[template.format as 'feed' | 'stories'];
  const scale = 0.5;

  function addElement(type: ShapeType) {
    const id = `el-${Date.now()}`;
    const layer = elements.length;

    let newElement: TemplateElement;
    switch (type) {
      case 'text':
        newElement = createTextElement(id, layer);
        break;
      case 'image':
        newElement = createImageElement(id, layer);
        break;
      case 'rect':
        newElement = createRectElement(id, layer);
        break;
      case 'circle':
        newElement = createCircleElement(id, layer);
        break;
      case 'triangle':
        newElement = createTriangleElement(id, layer);
        break;
      case 'line':
        newElement = createLineElement(id, layer);
        break;
      case 'star':
        newElement = createStarElement(id, layer);
        break;
    }

    setElements([...elements, newElement]);
    setSelectedIds([newElement.id]);
  }

  function updateElement(id: string, updates: Partial<TemplateElement>) {
    setElements((prev) => prev.map((el) => (el.id === id ? { ...el, ...updates } as TemplateElement : el)));
  }

  function deleteElement(id: string) {
    setElements(elements.filter((el) => el.id !== id));
    setSelectedIds(selectedIds.filter((sid) => sid !== id));
  }

  function deleteSelectedElements() {
    if (selectedIds.length === 0) return;
    
    setElements(elements.filter((el) => !selectedIds.includes(el.id)));
    
    setGroups(groups.filter(g => 
      !g.elementIds.some(id => selectedIds.includes(id))
    ));
    
    setSelectedIds([]);
  }

  function moveSelectedElements(deltaX: number, deltaY: number) {
    if (selectedIds.length === 0) return;
    setElements((prev) =>
      prev.map((el) =>
        selectedIds.includes(el.id)
          ? { ...el, x: el.x + deltaX, y: el.y + deltaY }
          : el
      )
    );
  }

  function duplicateElement(id: string) {
    const element = elements.find((el) => el.id === id);
    if (!element) return;

    const newId = `el-${Date.now()}`;
    const newLayer = elements.length;
    const duplicated: TemplateElement = {
      ...element,
      id: newId,
      layer: newLayer,
      x: element.x + 20,
      y: element.y + 20,
    };

    setElements([...elements, duplicated]);
    setSelectedIds([newId]);
  }

  function duplicateSelectedElements() {
    if (selectedIds.length === 0) return;
    
    const newElements: TemplateElement[] = [];
    const newIds: string[] = [];
    let layerOffset = elements.length;

    selectedIds.forEach((id, index) => {
      const element = elements.find((el) => el.id === id);
      if (!element) return;

      const newId = `el-${Date.now()}-${index}`;
      newIds.push(newId);
      newElements.push({
        ...element,
        id: newId,
        layer: layerOffset + index,
        x: element.x + 20,
        y: element.y + 20,
      });
    });

    setElements([...elements, ...newElements]);
    setSelectedIds(newIds);
  }

  const [clipboardMulti, setClipboardMulti] = useState<TemplateElement[]>([]);

  function copySelectedElements() {
    if (selectedIds.length === 0) return;
    const toCopy = elements.filter((el) => selectedIds.includes(el.id));
    setClipboardMulti(toCopy.map((el) => ({ ...el })));
  }

  function pasteElements() {
    if (clipboardMulti.length === 0) return;

    const newElements: TemplateElement[] = [];
    const newIds: string[] = [];
    let layerOffset = elements.length;

    clipboardMulti.forEach((el, index) => {
      const newId = `el-${Date.now()}-${index}`;
      newIds.push(newId);
      newElements.push({
        ...el,
        id: newId,
        layer: layerOffset + index,
        x: el.x + 20,
        y: el.y + 20,
      });
    });

    setElements([...elements, ...newElements]);
    setSelectedIds(newIds);
  }

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
    setSelectedIds([]);
  }

  function ungroupElements(groupId: string) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;

    setGroups(groups.filter(g => g.id !== groupId));
    setSelectedIds(group.elementIds);
  }

  function toggleGroupHighlight(groupId: string) {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, isHighlight: !g.isHighlight } : g
    ));
  }

  function renameGroup(groupId: string, newName: string) {
    setGroups(groups.map(g => 
      g.id === groupId ? { ...g, name: newName } : g
    ));
  }

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const modifier = isMac ? e.metaKey : e.ctrlKey;

    if (modifier && e.key === 'c' && selectedIds.length > 0) {
      e.preventDefault();
      copySelectedElements();
    }

    if (modifier && e.key === 'v' && clipboardMulti.length > 0) {
      e.preventDefault();
      pasteElements();
    }

    if (modifier && e.key === 'd' && selectedIds.length > 0) {
      e.preventDefault();
      duplicateSelectedElements();
    }

    if (modifier && e.key === 'a') {
      e.preventDefault();
      setSelectedIds(elements.map((el) => el.id));
    }

    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedIds.length > 0) {
        e.preventDefault();
        deleteSelectedElements();
      }
    }

    if (e.key === 'Escape') {
      setSelectedIds([]);
    }
  }, [selectedIds, clipboardMulti, elements]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

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
            background,
            elements,
            groups,
          },
          highlightSlots: groups.filter(g => g.isHighlight).length,
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

  const selectedElement = selectedIds.length === 1 
    ? elements.find((el) => el.id === selectedIds[0]) 
    : undefined;

  function handleSelectElement(id: string | null, shiftKey: boolean = false) {
    if (id === null) {
      setSelectedIds([]);
      return;
    }

    if (shiftKey) {
      // Toggle selection
      if (selectedIds.includes(id)) {
        setSelectedIds(selectedIds.filter((sid) => sid !== id));
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    } else {
      setSelectedIds([id]);
    }
  }

  function handleSelectGroup(groupId: string) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    
    setSelectedIds(group.elementIds);
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Toolbar */}
      <div className="w-20 bg-white border-r">
        <Toolbar onAddElement={addElement} />
      </div>

      {/* Canvas */}
      <div className="flex-1 flex flex-col">
        <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/templates')}
              title="Voltar para templates"
              className="text-gray-500 hover:text-gray-700"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-lg font-semibold">{template.name}</h1>
            <HelpTooltip />
          </div>
          <Button 
            onClick={saveTemplate} 
            disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? 'Salvando...' : 'Salvar'}</span>
          </Button>
        </div>

        <div className="flex-1 overflow-auto flex items-start justify-center p-8 pt-12">
          <EditorCanvas
            elements={elements}
            selectedIds={selectedIds}
            groups={groups}
            dimensions={dimensions}
            scale={scale}
            background={background}
            onSelectElement={handleSelectElement}
            onUpdateElement={updateElement}
            onMoveSelected={moveSelectedElements}
          />
        </div>
      </div>

      {/* Right Sidebar */}
      <div className="w-80 bg-white border-l flex flex-col">
        <div className="flex-1 overflow-auto">
          <BackgroundPanel background={background} onUpdate={setBackground} />
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
        </div>

        <div className="border-t">
          <LayersPanel
            elements={elements}
            selectedIds={selectedIds}
            groups={groups}
            onSelect={handleSelectElement}
            onSelectGroup={handleSelectGroup}
            onMoveLayer={moveLayer}
            onDelete={deleteElement}
            onDuplicate={duplicateElement}
          />
        </div>
      </div>
    </div>
  );
}
