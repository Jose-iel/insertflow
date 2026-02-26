'use client';

import { Stage, Layer, Rect } from 'react-konva';
import { TemplateElement, TemplateBackground, ElementGroup } from '@insertflow/lib/template-types';
import { CanvasElement } from './canvas-element';
import { Rulers, RULER_SIZE_PX } from './rulers';

interface EditorCanvasProps {
  elements: TemplateElement[];
  selectedIds: string[];
  groups: ElementGroup[];
  dimensions: { width: number; height: number };
  scale: number;
  background: TemplateBackground;
  onSelectElement: (id: string | null, shiftKey?: boolean) => void;
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void;
  onMoveSelected: (deltaX: number, deltaY: number) => void;
}

export default function EditorCanvas({
  elements,
  selectedIds,
  groups,
  dimensions,
  scale,
  background,
  onSelectElement,
  onUpdateElement,
  onMoveSelected,
}: EditorCanvasProps) {
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
      x: minX - 5,
      y: minY - 5,
      width: maxX - minX + 10,
      height: maxY - minY + 10,
    };
  }

  return (
    <div
      className="relative bg-gray-200 shadow-lg"
      style={{
        width: dimensions.width * scale + RULER_SIZE_PX,
        height: dimensions.height * scale + RULER_SIZE_PX,
      }}
    >
      <Rulers width={dimensions.width} height={dimensions.height} scale={scale} />

      {/* Background Layer (HTML para suportar gradientes CSS) */}
      <div
        className="absolute"
        style={{
          top: RULER_SIZE_PX,
          left: RULER_SIZE_PX,
          width: dimensions.width * scale,
          height: dimensions.height * scale,
          background: background.type === 'color' 
            ? background.value 
            : background.type === 'gradient'
            ? background.value
            : `url(${background.value}) center/cover no-repeat`,
        }}
      />

      {/* Canvas Layer */}
      <div
        className="absolute"
        style={{
          top: RULER_SIZE_PX,
          left: RULER_SIZE_PX,
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
            onSelectElement(null, e.evt.shiftKey);
          }
        }}
      >
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
                stroke={group.isHighlight ? '#f59e0b' : '#3b82f6'}
                strokeWidth={2}
                dash={[5, 5]}
                listening={false}
                opacity={0.6}
              />
            );
          })}

          {/* Elements */}
          {elements.sort((a, b) => a.layer - b.layer).map((element) => (
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
    </div>
  );
}
