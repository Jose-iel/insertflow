import { TemplateData, TemplateElement } from '@insertflow/lib';
import { formatPrice } from '@insertflow/lib';

interface Product {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface GlobalData {
  validUntil?: string;
  header?: string;
}

interface CustomValues {
  [varName: string]: string;
}

interface HighlightMapping {
  highlightProductIds: string[];
  normalProductIds: string[];
}

export class VariableInjector {
  inject(
    templateData: TemplateData,
    products: Product[],
    globalData: GlobalData = {},
    customValues: CustomValues = {},
    highlightMapping?: HighlightMapping
  ): TemplateData {
    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => 
        this.injectElement(element, products, globalData, customValues, highlightMapping)
      ),
    };

    return injected;
  }

  private injectElement(
    element: TemplateElement,
    products: Product[],
    globalData: GlobalData,
    customValues: CustomValues,
    highlightMapping?: HighlightMapping
  ): TemplateElement {
    const injected = { ...element };

    // Text elements
    if (element.type === 'text') {
      console.log('[VariableInjector] Element:', {
        previewText: element.previewText,
        variable: element.variable,
        content: element.content
      });

      let content: string;

      // Se há variável configurada e não está vazia, processar substituição
      if (element.variable && element.variable.trim() !== '') {
        console.log('[VariableInjector] Com variável - processando:', element.variable);
        content = element.variable;

        // Substituir variáveis de produtos
        products.forEach((product, index) => {
          const n = index + 1;
          content = content
            .replace(new RegExp(`{{nome_produto_${n}}}`, 'g'), product.name)
            .replace(new RegExp(`{{preco_produto_${n}}}`, 'g'), formatPrice(product.price));
        });

        // Substituir variáveis globais
        if (globalData.validUntil) {
          content = content.replace(/{{data_validade}}/g, globalData.validUntil);
        }
        if (globalData.header) {
          content = content.replace(/{{header}}/g, globalData.header);
        }

        // Substituir variáveis customizadas
        Object.entries(customValues).forEach(([varName, value]) => {
          const regex = new RegExp(`{{${varName}}}`, 'g');
          content = content.replace(regex, value || '');
        });
      } else {
        // Sem variável configurada - usar previewText diretamente
        content = element.previewText || element.content;
        console.log('[VariableInjector] Sem variável - usando previewText:', content);
      }

      (injected as any).content = content;
      (injected as any).previewText = content;
      console.log('[VariableInjector] Resultado final:', content);
    }

    // Image elements
    if (element.type === 'image' && element.variable) {
      // Variáveis padrão de produtos
      products.forEach((product, index) => {
        const n = index + 1;
        if (element.variable === `{{imagem_produto_${n}}}`) {
          (injected as any).src = product.imagePath || null;
        }
      });

      // Variáveis customizadas de imagem
      const match = element.variable.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
      if (match) {
        const varName = match[1];
        if (customValues[varName]) {
          (injected as any).src = customValues[varName];
        }
      }
    }

    return injected;
  }
}
