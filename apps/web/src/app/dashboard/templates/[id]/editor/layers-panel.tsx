'use client';

import { TemplateElement, ElementGroup } from '@insertflow/lib/template-types';
import { Button } from '@insertflow/ui';
import { ChevronUp, ChevronDown, Trash2, Copy, FolderOpen, Star } from 'lucide-react';

interface LayersPanelProps {
  elements: TemplateElement[];
  selectedIds: string[];
  groups: ElementGroup[];
  onSelect: (id: string, shiftKey?: boolean) => void;
  onSelectGroup: (groupId: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function LayersPanel({
  elements,
  selectedIds,
  groups,
  onSelect,
  onSelectGroup,
  onMoveLayer,
  onDelete,
  onDuplicate,
}: LayersPanelProps) {
  const sortedElements = [...elements].sort((a, b) => b.layer - a.layer);

  return (
    <div className="p-4 h-64 flex flex-col">
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
