import { TemplateData, TemplateElement } from '@insertflow/lib';

export class TemplateRenderer {
  /**
   * Renderiza template data como HTML para Puppeteer
   */
  renderToHTML(data: TemplateData, width: number, height: number): string {
    const elements = data.elements
      .sort((a, b) => a.layer - b.layer)
      .map((el) => this.renderElement(el))
      .join('\n');

    const fontImports = this.getFontImports(data);

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    ${fontImports}
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width}px;
      height: ${height}px;
      position: relative;
      overflow: hidden;
      background: ${data.background.value};
    }
    .element {
      position: absolute;
      transform-origin: top left;
    }
    .text {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
  </style>
</head>
<body>
  ${elements}
</body>
</html>
    `;
  }

  private getFontImports(data: TemplateData): string {
    const googleFontsMap: Record<string, string> = {
      'Roboto': 'Roboto:wght@100;200;300;400;500;600;700;800;900',
      'Open Sans': 'Open+Sans:wght@300;400;500;600;700;800',
      'Lato': 'Lato:wght@100;300;400;700;900',
      'Montserrat': 'Montserrat:wght@100;200;300;400;500;600;700;800;900',
      'Poppins': 'Poppins:wght@100;200;300;400;500;600;700;800;900',
      'Inter': 'Inter:wght@100;200;300;400;500;600;700;800;900',
      'Oswald': 'Oswald:wght@200;300;400;500;600;700',
      'Playfair Display': 'Playfair+Display:wght@400;500;600;700;800;900',
      'Bebas Neue': 'Bebas+Neue',
    };

    const systemFonts = ['Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Impact'];

    // Coletar fontes únicas usadas no template
    const usedFonts = new Set<string>();
    data.elements.forEach((element) => {
      if (element.type === 'text') {
        usedFonts.add(element.fontFamily);
      }
    });

    // Filtrar apenas fontes do Google Fonts
    const googleFontsToLoad = Array.from(usedFonts)
      .filter(font => !systemFonts.includes(font) && googleFontsMap[font]);

    if (googleFontsToLoad.length === 0) {
      return '';
    }

    // Gerar imports
    const imports = googleFontsToLoad
      .map(font => `@import url('https://fonts.googleapis.com/css2?family=${googleFontsMap[font]}&display=swap');`)
      .join('\n    ');

    return imports;
  }

  private renderElement(element: TemplateElement): string {
    const baseStyle = `
      left: ${element.x}px;
      top: ${element.y}px;
      width: ${element.width}px;
      height: ${element.height}px;
      transform: rotate(${element.rotation}deg);
    `;

    switch (element.type) {
      case 'text':
        const textToRender = element.previewText || element.content;
        console.log('[TemplateRenderer] Renderizando texto:', {
          previewText: element.previewText,
          content: element.content,
          textToRender
        });
        return `
          <div class="element text" style="${baseStyle}
            font-size: ${element.fontSize}px;
            font-family: ${element.fontFamily};
            color: ${element.color};
            font-weight: ${element.fontWeight};
            font-style: ${element.italic ? 'italic' : 'normal'};
            text-align: ${element.align};
            line-height: ${element.lineHeight};
            letter-spacing: ${element.letterSpacing}px;
            text-decoration: ${element.underline ? 'underline' : 'none'};
            opacity: ${element.opacity};
            overflow: hidden;
            word-wrap: break-word;
          ">
            ${this.escapeHTML(textToRender)}
          </div>
        `;

      case 'image':
        if (!element.src) return '';
        return `
          <img class="element image" src="${element.src}" style="${baseStyle}" width="${element.width}" height="${element.height}" />
        `;

      case 'rect':
        return `
          <div class="element" style="${baseStyle}
            background: ${element.fill};
            border: ${element.strokeWidth}px solid ${element.stroke};
            border-radius: ${element.cornerRadius}px;
          "></div>
        `;

      case 'circle':
        return `
          <div class="element" style="${baseStyle}
            background: ${element.fill};
            border: ${element.strokeWidth}px solid ${element.stroke};
            border-radius: 50%;
          "></div>
        `;

      default:
        return '';
    }
  }

  private escapeHTML(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;')
      .replace(/\n/g, '<br>');
  }
}
