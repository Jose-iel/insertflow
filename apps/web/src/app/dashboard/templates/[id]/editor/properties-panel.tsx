'use client';

import { TemplateElement, AVAILABLE_FONTS, FONT_WEIGHTS, FontWeight, ElementGroup } from '@insertflow/lib/template-types';
import { Button } from '@insertflow/ui';
import { Trash2 } from 'lucide-react';

interface PropertiesPanelProps {
  element: TemplateElement | undefined;
  selectedCount?: number;
  groups: ElementGroup[];
  selectedIds: string[];
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete: () => void;
  onCreateGroup: () => void;
  onToggleHighlight: (groupId: string) => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onUngroup: (groupId: string) => void;
}

export function PropertiesPanel({ 
  element, 
  selectedCount = 0, 
  groups,
  selectedIds,
  onUpdate, 
  onDelete,
  onCreateGroup,
  onToggleHighlight,
  onRenameGroup,
  onUngroup,
}: PropertiesPanelProps) {
  const selectedGroup = groups.find(g => 
    selectedIds.length > 0 && selectedIds.every(id => g.elementIds.includes(id)) && selectedIds.length === g.elementIds.length
  );

  if (selectedGroup) {
    return (
      <div className="p-4">
        <h3 className="font-semibold mb-4">Grupo: {selectedGroup.name}</h3>
        
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium">Nome do Grupo</label>
            <input
              type="text"
              value={selectedGroup.name}
              onChange={(e) => onRenameGroup(selectedGroup.id, e.target.value)}
              className="w-full rounded border px-2 py-1.5 text-sm bg-white mt-1"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="highlight-checkbox"
              checked={selectedGroup.isHighlight}
              onChange={() => onToggleHighlight(selectedGroup.id)}
              className="rounded"
            />
            <label htmlFor="highlight-checkbox" className="text-sm font-medium">
              Marcar como Destaque
            </label>
          </div>
          
          {selectedGroup.isHighlight && (
            <p className="text-xs text-green-600">
              ✓ Este grupo será usado para produtos em destaque na geração
            </p>
          )}
          
          <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
            <p><strong>Elementos:</strong> {selectedGroup.elementIds.length}</p>
            <p><strong>IDs:</strong> {selectedGroup.elementIds.join(', ')}</p>
          </div>
          
          <Button
            onClick={() => onUngroup(selectedGroup.id)}
            variant="outline"
            className="w-full"
          >
            Desagrupar
          </Button>
        </div>
      </div>
    );
  }

  if (!element) {
    if (selectedCount >= 2) {
      return (
        <div className="p-4">
          <h3 className="font-semibold mb-4">Múltiplos Elementos ({selectedCount})</h3>
          
          <div className="space-y-3">
            <Button
              onClick={onCreateGroup}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              Criar Grupo
            </Button>
            
            <p className="text-xs text-gray-500">
              Agrupe elementos para marcá-los como destaque na geração
            </p>
          </div>
          
          <div className="border-t mt-4 pt-4">
            <Button
              onClick={onDelete}
              variant="destructive"
              className="w-full"
            >
              Excluir Selecionados
            </Button>
          </div>
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
          {/* Texto de Preview */}
          <div>
            <label className="text-sm font-medium">Texto de Preview</label>
            <textarea
              value={element.previewText || element.content}
              onChange={(e) => onUpdate({ 
                previewText: e.target.value,
                content: e.target.value
              })}
              className="w-full rounded border px-2 py-1.5 text-sm min-h-[60px]"
              placeholder="Texto que aparece no canvas (ex: R$ 99,99)"
            />
            <p className="text-xs text-gray-500 mt-1">
              Este texto aparece no canvas para você testar o layout visualmente.
            </p>
          </div>

          {/* Variável */}
          <div>
            <label className="text-sm font-medium">Variável (Opcional)</label>
            <input
              type="text"
              value={element.variable || ''}
              onChange={(e) => onUpdate({ variable: e.target.value || null })}
              className="w-full rounded border px-2 py-1.5 text-sm"
              placeholder="Ex: {{preco_produto_1}}"
            />
            <p className="text-xs text-gray-500 mt-1">
              Se configurada, esta variável será usada ao gerar o encarte.
            </p>
            
            {/* Sugestões de variáveis */}
            <details className="mt-2">
              <summary className="text-xs text-blue-600 cursor-pointer">
                Ver variáveis disponíveis
              </summary>
              <div className="mt-2 p-2 bg-gray-50 rounded text-xs space-y-1">
                <p className="font-medium">Produtos:</p>
                <p>{'{{nome_produto_1}}'} até {'{{nome_produto_8}}'}</p>
                <p>{'{{preco_produto_1}}'} até {'{{preco_produto_8}}'}</p>
                <p className="font-medium mt-2">Globais:</p>
                <p>{'{{data_validade}}'}</p>
                <p>{'{{header}}'}</p>
                <p className="font-medium mt-2">Customizadas:</p>
                <p>Qualquer nome: {'{{minha_variavel}}'}</p>
              </div>
            </details>
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
          <label className="text-sm font-medium">Variável de Imagem</label>
          <input
            type="text"
            value={element.variable || ''}
            onChange={(e) => {
              const value = e.target.value.trim();
              onUpdate({ variable: value || null });
            }}
            placeholder="Ex: {{imagem_produto_1}} ou {{imagem_destaque}}"
            className="w-full rounded border px-2 py-1.5 text-sm bg-white"
          />
          
          {/* Validação de formato */}
          {element.variable && !element.variable.match(/^\{\{[a-zA-Z0-9_]+\}\}$/) && (
            <p className="text-xs text-red-600">
              ⚠️ Formato inválido. Use: {'{{nome_variavel}}'}
            </p>
          )}
          
          {/* Mensagens de ajuda */}
          {element.variable && element.variable.match(/^\{\{[a-zA-Z0-9_]+\}\}$/) && (
            <p className="text-xs text-green-600">
              ✓ Esta imagem será substituída na geração
            </p>
          )}
          
          {!element.variable && (
            <p className="text-xs text-gray-500">
              Deixe vazio para imagem fixa ou use variável customizada
            </p>
          )}
          
          {/* Sugestões comuns */}
          <div className="text-xs text-gray-600">
            <p className="font-medium mb-1">Sugestões:</p>
            <div className="flex flex-wrap gap-1">
              {['{{imagem_produto_1}}', '{{imagem_produto_2}}', '{{imagem_destaque}}', '{{logo_marca}}'].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => onUpdate({ variable: suggestion })}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded text-xs"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
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
