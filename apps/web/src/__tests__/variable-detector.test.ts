import { VariableDetector } from '@/lib/generation/variable-detector';
import type { TemplateData } from '@insertflow/lib';

describe('VariableDetector', () => {
  const detector = new VariableDetector();

  it('detecta variáveis customizadas em texto', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: 'Promoção: {{texto_promocao}} válida até {{data_especial}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(2);
    expect(variables.find(v => v.name === 'texto_promocao')).toEqual({
      name: 'texto_promocao',
      type: 'text',
      placeholder: 'Texto Promocao',
    });
    expect(variables.find(v => v.name === 'data_especial')).toEqual({
      name: 'data_especial',
      type: 'text',
      placeholder: 'Data Especial',
    });
  });

  it('detecta variáveis customizadas em imagens', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'image',
          src: null,
          variable: '{{imagem_destaque}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
        {
          id: 'e2',
          type: 'image',
          src: null,
          variable: '{{logo_marca}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(2);
    expect(variables.find(v => v.name === 'imagem_destaque')?.type).toBe('image');
    expect(variables.find(v => v.name === 'logo_marca')?.type).toBe('image');
  });

  it('ignora variáveis padrão', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: '{{nome_produto_1}} - R$ {{preco_produto_1}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
        {
          id: 'e2',
          type: 'image',
          src: null,
          variable: '{{imagem_produto_1}}',
          x: 0, y: 0, width: 100, height: 100,
          rotation: 0, layer: 0, locked: false, opacity: 1,
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(0);
  });

  it('não duplica variáveis que aparecem múltiplas vezes', () => {
    const data: TemplateData = {
      background: { type: 'color', value: '#ffffff' },
      elements: [
        {
          id: 'e1',
          type: 'text',
          content: '{{titulo}} - {{titulo}}',
          x: 0, y: 0, width: 100, height: 50,
          rotation: 0, layer: 0, locked: false, opacity: 1,
          fontSize: 24, fontFamily: 'Arial', fontWeight: 400,
          color: '#000', italic: false, underline: false,
          lineHeight: 1.2, letterSpacing: 0, align: 'left',
        },
      ],
    };

    const variables = detector.detect(data);
    
    expect(variables).toHaveLength(1);
  });
});
