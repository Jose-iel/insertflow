'use client';

import { Type, Image, Square, Circle, Triangle, Minus, Star } from 'lucide-react';
import { Button } from '@insertflow/ui';

type ShapeType = 'text' | 'image' | 'rect' | 'circle' | 'triangle' | 'line' | 'star';

interface ToolbarProps {
  onAddElement: (type: ShapeType) => void;
}

export function Toolbar({ onAddElement }: ToolbarProps) {
  return (
    <div className="flex flex-col gap-1 p-2">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('text')}
        title="Texto"
      >
        <Type className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('image')}
        title="Imagem"
      >
        <Image className="h-5 w-5" />
      </Button>

      <div className="border-t my-1" />

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('rect')}
        title="Retângulo"
      >
        <Square className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('circle')}
        title="Círculo"
      >
        <Circle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('triangle')}
        title="Triângulo"
      >
        <Triangle className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('line')}
        title="Linha"
      >
        <Minus className="h-5 w-5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => onAddElement('star')}
        title="Estrela"
      >
        <Star className="h-5 w-5" />
      </Button>
    </div>
  );
}
