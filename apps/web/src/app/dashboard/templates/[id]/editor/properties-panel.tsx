'use client';

import { TemplateElement, AVAILABLE_FONTS, FONT_WEIGHTS, FontWeight } from '@insertflow/lib/template-types';
import { Button } from '@insertflow/ui';
import { Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  element: TemplateElement | undefined;
  selectedCount?: number;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete: () => void;
}

export function PropertiesPanel({ element, selectedCount = 0, onUpdate, onDelete }: PropertiesPanelProps) {
  if (!element) {
    if (selectedCount > 1) {
      return (
        <div className="p-4 space-y-4">
          <div className="text-center text-gray-600">
            <p className="font-medium">{selectedCount} elementos selecionados</p>
            <p className="text-sm mt-2">Use Ctrl+C para copiar, Ctrl+D para duplicar</p>
          </div>
          <Button variant="destructive" size="sm" onClick={onDelete} className="w-full">
            <Trash2 className="h-4 w-4 mr-2" />
            Excluir selecionados
          </Button>
        </div>
      );
    }
    return (
      <div className="p-4 text-center text-gray-500">
        <p>Selecione um elemento para editar</p>
        <p className="text-xs mt-2">Shift+click para selecionar múltiplos</p>
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
              id="text-content"
              value={element.content}
              onChange={(e) => onUpdate({ content: e.target.value })}
              className="w-full rounded border px-2 py-1 text-sm"
              rows={3}
              placeholder="Digite o texto ou use variáveis"
            />
            <div className="mt-1">
              <label className="text-xs text-gray-500 mb-1 block">Inserir variável:</label>
              <div className="flex flex-wrap gap-1">
                {[
                  { label: 'Nome', value: '{{nome_produto_1}}' },
                  { label: 'Preço', value: '{{preco_produto_1}}' },
                  { label: 'Desc.', value: '{{descricao_produto_1}}' },
                ].map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => {
                      const textarea = document.getElementById('text-content') as HTMLTextAreaElement;
                      const start = textarea?.selectionStart || element.content.length;
                      const newContent = element.content.slice(0, start) + v.value + element.content.slice(start);
                      onUpdate({ content: newContent });
                    }}
                    className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Fonte */}
          <div>
            <label className="text-sm font-medium">Fonte</label>
            <select
              value={element.fontFamily}
              onChange={(e) => onUpdate({ fontFamily: e.target.value })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              {AVAILABLE_FONTS.map((font) => (
                <option key={font} value={font} style={{ fontFamily: font }}>
                  {font}
                </option>
              ))}
            </select>
          </div>

          {/* Peso da Fonte */}
          <div>
            <label className="text-sm font-medium">Peso da Fonte</label>
            <select
              value={element.fontWeight}
              onChange={(e) => onUpdate({ fontWeight: parseInt(e.target.value) as FontWeight })}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              {FONT_WEIGHTS.map((fw) => (
                <option key={fw.value} value={fw.value}>
                  {fw.label} ({fw.value})
                </option>
              ))}
            </select>
          </div>

          {/* Tamanho da Fonte */}
          <div>
            <label className="text-sm font-medium">Tamanho da Fonte</label>
            <input
              type="number"
              value={element.fontSize}
              onChange={(e) => onUpdate({ fontSize: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
              min={8}
              max={200}
            />
          </div>

          {/* Cor */}
          <div>
            <label className="text-sm font-medium">Cor</label>
            <input
              type="color"
              value={element.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-full h-10 rounded border"
            />
          </div>

          {/* Line Height e Letter Spacing */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Altura da Linha</label>
              <input
                type="number"
                value={element.lineHeight}
                onChange={(e) => onUpdate({ lineHeight: parseFloat(e.target.value) })}
                className="w-full rounded border px-2 py-1 text-sm"
                step={0.1}
                min={0.5}
                max={3}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Espaço entre Letras</label>
              <input
                type="number"
                value={element.letterSpacing}
                onChange={(e) => onUpdate({ letterSpacing: parseFloat(e.target.value) })}
                className="w-full rounded border px-2 py-1 text-sm"
                step={0.5}
              />
            </div>
          </div>

          {/* Alinhamento */}
          <div>
            <label className="text-sm font-medium">Alinhamento</label>
            <div className="flex gap-1 mt-1">
              {(['left', 'center', 'right'] as const).map((align) => (
                <button
                  key={align}
                  type="button"
                  onClick={() => onUpdate({ align })}
                  className={`flex-1 py-1.5 text-xs rounded border ${
                    element.align === align
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {align === 'left' ? 'Esquerda' : align === 'center' ? 'Centro' : 'Direita'}
                </button>
              ))}
            </div>
          </div>

          {/* Estilos */}
          <div className="flex gap-3">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.italic}
                onChange={(e) => onUpdate({ italic: e.target.checked })}
              />
              <span className="text-sm">Itálico</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={element.underline}
                onChange={(e) => onUpdate({ underline: e.target.checked })}
              />
              <span className="text-sm">Sublinhado</span>
            </label>
          </div>
        </>
      )}

      {/* Shape specific (rect, circle, triangle, star) */}
      {(element.type === 'rect' || element.type === 'circle' || element.type === 'triangle' || element.type === 'star') && (
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
            <label className="text-sm font-medium">Cor da Borda</label>
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
              min={0}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Borda Tracejada</label>
            <select
              value={element.dash.length > 0 ? element.dash.join(',') : 'none'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ dash: val === 'none' ? [] : val.split(',').map(Number) });
              }}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">Sólida</option>
              <option value="5,5">Tracejada</option>
              <option value="10,5">Tracejada Longa</option>
              <option value="2,2">Pontilhada</option>
              <option value="10,5,2,5">Traço-Ponto</option>
            </select>
          </div>
        </>
      )}

      {/* Rect specific - corner radius */}
      {element.type === 'rect' && (
        <div>
          <label className="text-sm font-medium">Arredondamento</label>
          <input
            type="number"
            value={element.cornerRadius}
            onChange={(e) => onUpdate({ cornerRadius: parseInt(e.target.value) })}
            className="w-full rounded border px-2 py-1 text-sm"
            min={0}
            max={100}
          />
        </div>
      )}

      {/* Star specific */}
      {element.type === 'star' && (
        <>
          <div>
            <label className="text-sm font-medium">Número de Pontas</label>
            <input
              type="number"
              value={element.numPoints}
              onChange={(e) => onUpdate({ numPoints: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
              min={3}
              max={20}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-600">Raio Interno</label>
              <input
                type="number"
                value={element.innerRadius}
                onChange={(e) => onUpdate({ innerRadius: parseInt(e.target.value) })}
                className="w-full rounded border px-2 py-1 text-sm"
                min={5}
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Raio Externo</label>
              <input
                type="number"
                value={element.outerRadius}
                onChange={(e) => onUpdate({ outerRadius: parseInt(e.target.value) })}
                className="w-full rounded border px-2 py-1 text-sm"
                min={10}
              />
            </div>
          </div>
        </>
      )}

      {/* Line specific */}
      {element.type === 'line' && (
        <>
          <div>
            <label className="text-sm font-medium">Cor da Linha</label>
            <input
              type="color"
              value={element.stroke}
              onChange={(e) => onUpdate({ stroke: e.target.value })}
              className="w-full h-10 rounded border"
            />
          </div>

          <div>
            <label className="text-sm font-medium">Espessura</label>
            <input
              type="number"
              value={element.strokeWidth}
              onChange={(e) => onUpdate({ strokeWidth: parseInt(e.target.value) })}
              className="w-full rounded border px-2 py-1 text-sm"
              min={1}
            />
          </div>

          <div>
            <label className="text-sm font-medium">Estilo da Linha</label>
            <select
              value={element.dash.length > 0 ? element.dash.join(',') : 'none'}
              onChange={(e) => {
                const val = e.target.value;
                onUpdate({ dash: val === 'none' ? [] : val.split(',').map(Number) });
              }}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white"
            >
              <option value="none">Sólida</option>
              <option value="5,5">Tracejada</option>
              <option value="10,5">Tracejada Longa</option>
              <option value="2,2">Pontilhada</option>
            </select>
          </div>
        </>
      )}

      {/* Image specific */}
      {element.type === 'image' && (
        <div className="space-y-2">
          <label className="text-sm font-medium">Variável de Imagem do Produto</label>
          <select
            value={element.variable || ''}
            onChange={(e) => onUpdate({ variable: e.target.value || null })}
            className="w-full rounded border px-2 py-1.5 text-sm bg-white"
          >
            <option value="">Imagem fixa (sem variável)</option>
            <option value="{{imagem_produto_1}}">Imagem Produto 1</option>
            <option value="{{imagem_produto_2}}">Imagem Produto 2</option>
            <option value="{{imagem_produto_3}}">Imagem Produto 3</option>
            <option value="{{imagem_produto_4}}">Imagem Produto 4</option>
            <option value="{{imagem_produto_5}}">Imagem Produto 5</option>
            <option value="{{imagem_produto_6}}">Imagem Produto 6</option>
            <option value="{{imagem_produto_7}}">Imagem Produto 7</option>
            <option value="{{imagem_produto_8}}">Imagem Produto 8</option>
          </select>
          {element.variable && (
            <p className="text-xs text-green-600">
              ✓ Esta imagem será substituída pela foto do produto na geração
            </p>
          )}
          {!element.variable && element.src && (
            <p className="text-xs text-gray-500">
              Usando imagem fixa: {element.src.split('/').pop()}
            </p>
          )}
        </div>
      )}

      {/* Opacity - all elements */}
      <div className="border-t pt-4 mt-2">
        <label className="text-sm font-medium">Opacidade</label>
        <input
          type="range"
          value={element.opacity}
          onChange={(e) => onUpdate({ opacity: parseFloat(e.target.value) })}
          className="w-full"
          min={0}
          max={1}
          step={0.05}
        />
        <span className="text-xs text-gray-500">{Math.round(element.opacity * 100)}%</span>
      </div>
    </div>
  );
}
