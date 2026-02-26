import { Template } from '@insertflow/lib';

interface Product {
  id: string;
  name: string;
  price: number;
  imagePath: string | null;
}

interface EncarteAllocation {
  template: Template;
  products: Product[];
}

export class ProductDivider {
  /**
   * Divide produtos entre templates disponíveis
   * Usa templates maiores primeiro para otimizar
   */
  divide(products: Product[], templates: Template[]): EncarteAllocation[] {
    if (products.length === 0) {
      throw new Error('No products to divide');
    }

    if (templates.length === 0) {
      throw new Error('No templates available');
    }

    // Ordenar templates por productSlots (maior primeiro)
    const sortedTemplates = [...templates].sort((a, b) => b.productSlots - a.productSlots);

    // Garantir que existe template de 1 produto (fallback)
    const hasSingleSlot = sortedTemplates.some((t) => t.productSlots === 1);
    if (!hasSingleSlot) {
      throw new Error('Templates must include at least one with 1 product slot');
    }

    const allocations: EncarteAllocation[] = [];
    const remaining = [...products];

    while (remaining.length > 0) {
      // Encontrar maior template que cabe
      const template =
        sortedTemplates.find((t) => t.productSlots <= remaining.length) ||
        sortedTemplates[sortedTemplates.length - 1]; // fallback para menor

      // Alocar produtos
      const allocated = remaining.splice(0, template.productSlots);

      allocations.push({
        template,
        products: allocated,
      });
    }

    return allocations;
  }

  /**
   * Estima quantos encartes serão gerados
   */
  estimateCount(productCount: number, templates: Template[]): number {
    const mockProducts = Array(productCount).fill({ id: '', name: '', price: 0, imagePath: null });
    const allocations = this.divide(mockProducts, templates);
    return allocations.length;
  }
}
