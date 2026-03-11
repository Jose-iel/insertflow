import { TemplateData, TemplateElement } from '@insertflow/lib';

export interface CustomVariable {
  name: string;
  type: 'text' | 'image';
  placeholder?: string;
}

export class VariableDetector {
  /**
   * Detecta todas as variáveis customizadas em um template
   * Exclui variáveis padrão conhecidas
   */
  detect(templateData: TemplateData): CustomVariable[] {
    const variables = new Map<string, CustomVariable>();
    
    const standardVariables = new Set([
      'nome_produto_1', 'nome_produto_2', 'nome_produto_3', 'nome_produto_4',
      'nome_produto_5', 'nome_produto_6', 'nome_produto_7', 'nome_produto_8',
      'preco_produto_1', 'preco_produto_2', 'preco_produto_3', 'preco_produto_4',
      'preco_produto_5', 'preco_produto_6', 'preco_produto_7', 'preco_produto_8',
      'imagem_produto_1', 'imagem_produto_2', 'imagem_produto_3', 'imagem_produto_4',
      'imagem_produto_5', 'imagem_produto_6', 'imagem_produto_7', 'imagem_produto_8',
      'data_validade',
      'header',
    ]);

    templateData.elements.forEach((element) => {
      if (element.type === 'text') {
        // Procurar no campo 'variable' (novo) ou 'content' (retrocompatibilidade)
        const textToSearch = (element as any).variable || element.content;
        const matches = textToSearch.matchAll(/\{\{([a-zA-Z0-9_]+)\}\}/g);
        for (const match of matches) {
          const varName = match[1];
          if (!standardVariables.has(varName) && !variables.has(varName)) {
            variables.set(varName, {
              name: varName,
              type: 'text',
              placeholder: this.generatePlaceholder(varName),
            });
          }
        }
      }
    });

    // Detectar variáveis em elementos de imagem
    templateData.elements.forEach((element) => {
      if (element.type === 'image' && element.variable) {
        const match = element.variable.match(/\{\{([a-zA-Z0-9_]+)\}\}/);
        if (match) {
          const varName = match[1];
          if (!standardVariables.has(varName) && !variables.has(varName)) {
            variables.set(varName, {
              name: varName,
              type: 'image',
              placeholder: this.generatePlaceholder(varName),
            });
          }
        }
      }
    });

    return Array.from(variables.values());
  }

  /**
   * Gera placeholder amigável baseado no nome da variável
   */
  private generatePlaceholder(varName: string): string {
    return varName
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
