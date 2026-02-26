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

export class VariableInjector {
  inject(
    templateData: TemplateData,
    products: Product[],
    globalData: GlobalData = {}
  ): TemplateData {
    const injected: TemplateData = {
      background: templateData.background,
      elements: templateData.elements.map((element) => this.injectElement(element, products, globalData)),
    };

    return injected;
  }

  private injectElement(
    element: TemplateElement,
    products: Product[],
    globalData: GlobalData
  ): TemplateElement {
    const injected = { ...element };

    // Text elements
    if (element.type === 'text') {
      let content = element.content;

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

      (injected as any).content = content;
    }

    // Image elements
    if (element.type === 'image' && element.variable) {
      products.forEach((product, index) => {
        const n = index + 1;
        if (element.variable === `{{imagem_produto_${n}}}`) {
          (injected as any).src = product.imagePath || null;
        }
      });
    }

    return injected;
  }
}
