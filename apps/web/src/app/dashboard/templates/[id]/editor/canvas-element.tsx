'use client';

import { Rect, Circle, Text as KonvaText, Transformer, Line, RegularPolygon, Star } from 'react-konva';
import { useRef, useEffect } from 'react';
import { TemplateElement } from '@insertflow/lib/template-types';

interface CanvasElementProps {
  element: TemplateElement;
  isSelected: boolean;
  onSelect: (shiftKey?: boolean) => void;
  onChange: (updates: Partial<TemplateElement>) => void;
  onDragMove?: (deltaX: number, deltaY: number) => void;
}

export function CanvasElement({ element, isSelected, onSelect, onChange, onDragMove }: CanvasElementProps) {
  const shapeRef = useRef<any>(null);
  const trRef = useRef<any>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);

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
    onClick: (e: any) => onSelect(e.evt?.shiftKey),
    onTap: (e: any) => onSelect(e.evt?.shiftKey),
    onDragStart: () => {
      dragStartPos.current = { x: element.x, y: element.y };
    },
    onDragEnd: (e: any) => {
      if (dragStartPos.current && onDragMove && isSelected) {
        const deltaX = e.target.x() - dragStartPos.current.x;
        const deltaY = e.target.y() - dragStartPos.current.y;
        // Reset position - the parent will update all selected elements
        e.target.x(dragStartPos.current.x);
        e.target.y(dragStartPos.current.y);
        onDragMove(deltaX, deltaY);
      } else {
        onChange({
          x: e.target.x(),
          y: e.target.y(),
        });
      }
      dragStartPos.current = null;
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
          dash={element.dash}
          opacity={element.opacity}
        />
      );
      break;

    case 'circle':
      shape = (
        <Circle
          {...commonProps}
          radius={Math.min(element.width, element.height) / 2}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          dash={element.dash}
          opacity={element.opacity}
        />
      );
      break;

    case 'text':
      shape = (
        <KonvaText
          {...commonProps}
          text={element.previewText || element.content}
          fontSize={element.fontSize}
          fontFamily={element.fontFamily}
          fontStyle={`${element.fontWeight} ${element.italic ? 'italic' : 'normal'}`}
          fontVariant="normal"
          fill={element.color}
          align={element.align}
          width={element.width}
          lineHeight={element.lineHeight}
          letterSpacing={element.letterSpacing}
          textDecoration={element.underline ? 'underline' : ''}
          opacity={element.opacity}
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
          opacity={element.opacity}
        />
      );
      break;

    case 'triangle':
      shape = (
        <RegularPolygon
          {...commonProps}
          sides={3}
          radius={Math.min(element.width, element.height) / 2}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          dash={element.dash}
          opacity={element.opacity}
        />
      );
      break;

    case 'line':
      shape = (
        <Line
          ref={shapeRef}
          x={element.x}
          y={element.y}
          rotation={element.rotation}
          draggable={!element.locked}
          onClick={(e: any) => onSelect(e.evt?.shiftKey)}
          onTap={(e: any) => onSelect(e.evt?.shiftKey)}
          onDragStart={() => {
            dragStartPos.current = { x: element.x, y: element.y };
          }}
          onDragEnd={(e: any) => {
            if (dragStartPos.current && onDragMove && isSelected) {
              const deltaX = e.target.x() - dragStartPos.current.x;
              const deltaY = e.target.y() - dragStartPos.current.y;
              e.target.x(dragStartPos.current.x);
              e.target.y(dragStartPos.current.y);
              onDragMove(deltaX, deltaY);
            } else {
              onChange({
                x: e.target.x(),
                y: e.target.y(),
              });
            }
            dragStartPos.current = null;
          }}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();

            node.scaleX(1);
            node.scaleY(1);

            // Escalar os pontos da linha
            const scaledPoints = element.points.map((p, i) => 
              i % 2 === 0 ? p * scaleX : p * scaleY
            );

            onChange({
              x: node.x(),
              y: node.y(),
              rotation: node.rotation(),
              points: scaledPoints,
              width: Math.abs(scaledPoints[2] - scaledPoints[0]),
              height: Math.abs(scaledPoints[3] - scaledPoints[1]),
            });
          }}
          points={element.points}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          dash={element.dash}
          opacity={element.opacity}
        />
      );
      break;

    case 'star':
      shape = (
        <Star
          ref={shapeRef}
          x={element.x}
          y={element.y}
          rotation={element.rotation}
          draggable={!element.locked}
          onClick={(e: any) => onSelect(e.evt?.shiftKey)}
          onTap={(e: any) => onSelect(e.evt?.shiftKey)}
          onDragStart={() => {
            dragStartPos.current = { x: element.x, y: element.y };
          }}
          onDragEnd={(e: any) => {
            if (dragStartPos.current && onDragMove && isSelected) {
              const deltaX = e.target.x() - dragStartPos.current.x;
              const deltaY = e.target.y() - dragStartPos.current.y;
              e.target.x(dragStartPos.current.x);
              e.target.y(dragStartPos.current.y);
              onDragMove(deltaX, deltaY);
            } else {
              onChange({
                x: e.target.x(),
                y: e.target.y(),
              });
            }
            dragStartPos.current = null;
          }}
          onTransformEnd={() => {
            const node = shapeRef.current;
            if (!node) return;

            const scaleX = node.scaleX();
            const scaleY = node.scaleY();
            const avgScale = (scaleX + scaleY) / 2;

            node.scaleX(1);
            node.scaleY(1);

            onChange({
              x: node.x(),
              y: node.y(),
              rotation: node.rotation(),
              innerRadius: Math.max(5, element.innerRadius * avgScale),
              outerRadius: Math.max(10, element.outerRadius * avgScale),
              width: element.outerRadius * 2 * avgScale,
              height: element.outerRadius * 2 * avgScale,
            });
          }}
          numPoints={element.numPoints}
          innerRadius={element.innerRadius}
          outerRadius={element.outerRadius}
          fill={element.fill}
          stroke={element.stroke}
          strokeWidth={element.strokeWidth}
          dash={element.dash}
          opacity={element.opacity}
        />
      );
      break;
  }

  return (
    <>
      {shape}
      {isSelected && (
        <Transformer
          ref={trRef}
          anchorSize={6}
          anchorCornerRadius={2}
          anchorStroke="#3b82f6"
          anchorFill="#ffffff"
          anchorStrokeWidth={1}
          borderStroke="#3b82f6"
          borderStrokeWidth={1}
          borderDash={[3, 3]}
          rotateAnchorOffset={16}
          enabledAnchors={['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right', 'top-center', 'bottom-center']}
          boundBoxFunc={(oldBox, newBox) => {
            if (newBox.width < 5 || newBox.height < 5) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
}
