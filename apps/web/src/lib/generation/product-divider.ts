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

    const allocations: EncarteAllocation[] = [];
    const remaining = [...products];

    while (remaining.length > 0) {
      // Encontrar maior template que cabe nos produtos restantes
      const template = sortedTemplates.find((t) => t.productSlots <= remaining.length);
      
      if (!template) {
        // Se nenhum template cabe, usar o menor disponível
        const smallestTemplate = sortedTemplates[sortedTemplates.length - 1];
        const allocated = remaining.splice(0, smallestTemplate.productSlots);
        
        allocations.push({
          template: smallestTemplate,
          products: allocated,
        });
      } else {
        // Alocar produtos no template que cabe
        const allocated = remaining.splice(0, template.productSlots);
        
        allocations.push({
          template,
          products: allocated,
        });
      }
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
