import { TemplateData, TemplateElement } from '@insertflow/lib';
import pino from 'pino';
import sharp from 'sharp';

const logger = pino();

// Importar Konva com canvas backend para Node.js
require('konva/canvas-backend');
const Konva = require('konva').default;
const { createCanvas } = require('canvas');

export class KonvaRenderer {
  async renderToImage(data: TemplateData, width: number, height: number): Promise<Buffer> {
    // Criar canvas virtual do Node.js
    const canvas = createCanvas(width, height);
    
    // Criar Stage do Konva usando canvas virtual
    const stage = new Konva.Stage({
      container: canvas as any,
      width,
      height,
    });

    const layer = new Konva.Layer();
    stage.add(layer);

    // Renderizar background
    await this.renderBackground(layer, data.background, width, height);

    // Ordenar elementos por layer e renderizar
    const sortedElements = [...data.elements].sort((a, b) => a.layer - b.layer);
    
    for (const element of sortedElements) {
      await this.renderElement(layer, element);
    }

    layer.draw();

    // Converter para buffer PNG
    const dataURL = stage.toDataURL({ pixelRatio: 2 });
    const base64Data = dataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    stage.destroy();

    logger.info({ 
      width, 
      height, 
      elementsCount: data.elements.length,
      bufferSize: buffer.length 
    }, 'Konva image rendered');

    return buffer;
  }

  private async renderBackground(
    layer: any,
    background: TemplateData['background'],
    width: number,
    height: number
  ): Promise<void> {
    if (background.type === 'color') {
      const rect = new Konva.Rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: background.value,
      });
      layer.add(rect);
    } else if (background.type === 'image') {
      // Carregar imagem de background
      const image = await this.loadImage(background.value);
      
      // Calcular dimensões para cover (manter proporção e cobrir toda área)
      const imgRatio = image.width / image.height;
      const canvasRatio = width / height;
      
      let renderWidth = width;
      let renderHeight = height;
      let x = 0;
      let y = 0;
      
      if (imgRatio > canvasRatio) {
        // Imagem mais larga que canvas - ajustar pela altura
        renderWidth = height * imgRatio;
        x = -(renderWidth - width) / 2;
      } else {
        // Imagem mais alta que canvas - ajustar pela largura
        renderHeight = width / imgRatio;
        y = -(renderHeight - height) / 2;
      }
      
      const konvaImage = new Konva.Image({
        x,
        y,
        width: renderWidth,
        height: renderHeight,
        image,
      });
      layer.add(konvaImage);
    } else if (background.type === 'gradient') {
      // Implementar gradiente se necessário
      logger.warn('Gradient background not yet implemented');
    }
  }

  private async renderElement(layer: any, element: TemplateElement): Promise<void> {
    switch (element.type) {
      case 'text':
        this.renderText(layer, element);
        break;
      case 'image':
        await this.renderImage(layer, element);
        break;
      case 'rect':
        this.renderRect(layer, element);
        break;
      case 'circle':
        this.renderCircle(layer, element);
        break;
      case 'triangle':
        this.renderTriangle(layer, element);
        break;
      case 'line':
        this.renderLine(layer, element);
        break;
      case 'star':
        this.renderStar(layer, element);
        break;
    }
  }

  private renderText(layer: any, element: TemplateElement): void {
    const textEl = element as any;
    const text = new Konva.Text({
      x: element.x,
      y: element.y,
      width: element.width,
      text: textEl.content || '',
      fontSize: textEl.fontSize || 16,
      fontFamily: textEl.fontFamily || 'Arial',
      fill: textEl.color || '#000000',
      fontStyle: `${textEl.fontWeight || 400} ${textEl.italic ? 'italic' : 'normal'}`,
      align: textEl.align || 'left',
      lineHeight: textEl.lineHeight || 1.2,
      letterSpacing: textEl.letterSpacing || 0,
      textDecoration: textEl.underline ? 'underline' : '',
      opacity: element.opacity,
      rotation: element.rotation,
    });
    layer.add(text);
  }

  private async renderImage(layer: any, element: TemplateElement): Promise<void> {
    const imgEl = element as any;
    if (!imgEl.src) return;

    try {
      const image = await this.loadImage(imgEl.src);
      const konvaImage = new Konva.Image({
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        image,
        opacity: element.opacity,
        rotation: element.rotation,
      });
      layer.add(konvaImage);
    } catch (error) {
      logger.error({ elementId: element.id, src: imgEl.src, error }, 'Failed to load image');
    }
  }

  private renderRect(layer: any, element: TemplateElement): void {
    const rectEl = element as any;
    const rect = new Konva.Rect({
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height,
      fill: rectEl.fill || '#cccccc',
      stroke: rectEl.stroke || '#000000',
      strokeWidth: rectEl.strokeWidth || 0,
      cornerRadius: rectEl.cornerRadius || 0,
      opacity: element.opacity,
      rotation: element.rotation,
      dash: rectEl.dash,
    });
    layer.add(rect);
  }

  private renderCircle(layer: any, element: TemplateElement): void {
    const circleEl = element as any;
    const circle = new Konva.Circle({
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
      radius: element.width / 2,
      fill: circleEl.fill || '#cccccc',
      stroke: circleEl.stroke || '#000000',
      strokeWidth: circleEl.strokeWidth || 0,
      opacity: element.opacity,
      dash: circleEl.dash,
    });
    layer.add(circle);
  }

  private renderTriangle(layer: any, element: TemplateElement): void {
    const triEl = element as any;
    const triangle = new Konva.RegularPolygon({
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
      sides: 3,
      radius: element.width / 2,
      fill: triEl.fill || '#cccccc',
      stroke: triEl.stroke || '#000000',
      strokeWidth: triEl.strokeWidth || 0,
      opacity: element.opacity,
      rotation: element.rotation,
      dash: triEl.dash,
    });
    layer.add(triangle);
  }

  private renderLine(layer: any, element: TemplateElement): void {
    const lineEl = element as any;
    const line = new Konva.Line({
      points: lineEl.points || [],
      stroke: lineEl.stroke || '#000000',
      strokeWidth: lineEl.strokeWidth || 2,
      opacity: element.opacity,
      rotation: element.rotation,
      dash: lineEl.dash,
    });
    layer.add(line);
  }

  private renderStar(layer: any, element: TemplateElement): void {
    const starEl = element as any;
    const star = new Konva.Star({
      x: element.x + element.width / 2,
      y: element.y + element.height / 2,
      numPoints: starEl.numPoints || 5,
      innerRadius: starEl.innerRadius || 20,
      outerRadius: starEl.outerRadius || 40,
      fill: starEl.fill || '#cccccc',
      stroke: starEl.stroke || '#000000',
      strokeWidth: starEl.strokeWidth || 0,
      opacity: element.opacity,
      rotation: element.rotation,
      dash: starEl.dash,
    });
    layer.add(star);
  }

  private async loadImage(src: string): Promise<HTMLImageElement> {
    const { Image } = require('canvas');
    
    return new Promise(async (resolve, reject) => {
      const img = new Image();
      
      img.onload = () => {
        resolve(img);
      };
      
      img.onerror = (err: any) => {
        logger.error({ src, error: err }, 'Failed to load image');
        reject(err);
      };
      
      try {
        if (src.startsWith('http')) {
          // Fazer fetch da imagem
          const response = await fetch(src);
          const arrayBuffer = await response.arrayBuffer();
          let buffer: any = Buffer.from(arrayBuffer);
          
          // Converter WebP para PNG usando sharp (canvas não suporta WebP)
          if (src.includes('.webp')) {
            buffer = await sharp(buffer).png().toBuffer();
          }
          
          // Definir src como buffer (isso dispara onload quando completo)
          img.src = buffer;
        } else {
          img.src = src;
        }
      } catch (error) {
        logger.error({ src, error }, 'Failed to fetch image');
        reject(error);
      }
    });
  }
}
