'use client';

import { TemplateElement } from '@insertflow/lib/template-types';
import { Button } from '@insertflow/ui';
import { ChevronUp, ChevronDown, Trash2, Copy } from 'lucide-react';

interface LayersPanelProps {
  elements: TemplateElement[];
  selectedIds: string[];
  onSelect: (id: string, shiftKey?: boolean) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function LayersPanel({
  elements,
  selectedIds,
  onSelect,
  onMoveLayer,
  onDelete,
  onDuplicate,
}: LayersPanelProps) {
  const sortedElements = [...elements].sort((a, b) => b.layer - a.layer);

  return (
    <div className="p-4 h-48 flex flex-col">
      <h3 className="font-semibold mb-2 flex-shrink-0">Camadas</h3>
      <div className="space-y-1 overflow-y-auto flex-1">
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
