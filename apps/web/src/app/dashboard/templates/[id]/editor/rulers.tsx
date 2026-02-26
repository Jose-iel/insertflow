'use client';

import { useEffect, useRef } from 'react';

interface RulersProps {
  width: number;
  height: number;
  scale: number;
}

const RULER_SIZE = 20;
const TICK_INTERVAL = 50; // pixels entre marcações principais
const SMALL_TICK_INTERVAL = 10; // pixels entre marcações menores

export function Rulers({ width, height, scale }: RulersProps) {
  const horizontalRef = useRef<HTMLCanvasElement>(null);
  const verticalRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    drawHorizontalRuler();
    drawVerticalRuler();
  }, [width, height, scale]);

  function drawHorizontalRuler() {
    const canvas = horizontalRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaledWidth = width * scale;
    canvas.width = scaledWidth;
    canvas.height = RULER_SIZE;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, scaledWidth, RULER_SIZE);

    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;

    // Borda inferior
    ctx.beginPath();
    ctx.moveTo(0, RULER_SIZE - 0.5);
    ctx.lineTo(scaledWidth, RULER_SIZE - 0.5);
    ctx.stroke();

    ctx.fillStyle = '#6c757d';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';

    // Desenhar marcações
    for (let i = 0; i <= width; i += SMALL_TICK_INTERVAL) {
      const x = i * scale;
      const isMajor = i % TICK_INTERVAL === 0;

      ctx.beginPath();
      ctx.moveTo(x, RULER_SIZE);
      ctx.lineTo(x, isMajor ? RULER_SIZE - 12 : RULER_SIZE - 6);
      ctx.strokeStyle = isMajor ? '#6c757d' : '#adb5bd';
      ctx.stroke();

      if (isMajor && i > 0) {
        ctx.fillText(i.toString(), x, 10);
      }
    }
  }

  function drawVerticalRuler() {
    const canvas = verticalRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scaledHeight = height * scale;
    canvas.width = RULER_SIZE;
    canvas.height = scaledHeight;

    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, RULER_SIZE, scaledHeight);

    ctx.strokeStyle = '#dee2e6';
    ctx.lineWidth = 1;

    // Borda direita
    ctx.beginPath();
    ctx.moveTo(RULER_SIZE - 0.5, 0);
    ctx.lineTo(RULER_SIZE - 0.5, scaledHeight);
    ctx.stroke();

    ctx.fillStyle = '#6c757d';
    ctx.font = '9px sans-serif';
    ctx.textAlign = 'center';

    // Desenhar marcações
    for (let i = 0; i <= height; i += SMALL_TICK_INTERVAL) {
      const y = i * scale;
      const isMajor = i % TICK_INTERVAL === 0;

      ctx.beginPath();
      ctx.moveTo(RULER_SIZE, y);
      ctx.lineTo(isMajor ? RULER_SIZE - 12 : RULER_SIZE - 6, y);
      ctx.strokeStyle = isMajor ? '#6c757d' : '#adb5bd';
      ctx.stroke();

      if (isMajor && i > 0) {
        ctx.save();
        ctx.translate(10, y);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(i.toString(), 0, 0);
        ctx.restore();
      }
    }
  }

  return (
    <>
      {/* Canto superior esquerdo */}
      <div
        className="absolute top-0 left-0 bg-gray-100 border-r border-b border-gray-300"
        style={{ width: RULER_SIZE, height: RULER_SIZE }}
      />

      {/* Régua horizontal */}
      <canvas
        ref={horizontalRef}
        className="absolute top-0"
        style={{ left: RULER_SIZE, height: RULER_SIZE }}
      />

      {/* Régua vertical */}
      <canvas
        ref={verticalRef}
        className="absolute left-0"
        style={{ top: RULER_SIZE, width: RULER_SIZE }}
      />
    </>
  );
}

export const RULER_SIZE_PX = RULER_SIZE;
