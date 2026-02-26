'use client';

import { Stage, Layer } from 'react-konva';
import { TemplateElement, TemplateBackground } from '@insertflow/lib/template-types';
import { CanvasElement } from './canvas-element';
import { Rulers, RULER_SIZE_PX } from './rulers';

interface EditorCanvasProps {
  elements: TemplateElement[];
  selectedIds: string[];
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
  dimensions,
  scale,
  background,
  onSelectElement,
  onUpdateElement,
  onMoveSelected,
}: EditorCanvasProps) {
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
    </div>
  );
}
