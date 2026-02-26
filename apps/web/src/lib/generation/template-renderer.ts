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

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
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
    .image {
      object-fit: cover;
    }
  </style>
</head>
<body>
  ${elements}
</body>
</html>
    `;
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
        return `
          <div class="element text" style="${baseStyle}
            font-size: ${element.fontSize}px;
            font-family: ${element.fontFamily};
            color: ${element.color};
            font-weight: ${element.fontWeight};
            font-style: ${element.italic ? 'italic' : 'normal'};
            text-align: ${element.align};
          ">
            ${this.escapeHTML(element.content)}
          </div>
        `;

      case 'image':
        if (!element.src) return '';
        return `
          <img class="element image" src="${element.src}" style="${baseStyle}" />
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
