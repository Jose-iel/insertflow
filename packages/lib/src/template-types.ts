export type TemplateFormat = 'feed' | 'stories';

export interface TemplateMetadata {
  id: string;
  name: string;
  orgId: string;
  folderId: string | null;
  format: TemplateFormat;
  width: number;
  height: number;
  productSlots: number;
}

export interface TemplateBackground {
  type: 'color' | 'gradient' | 'image';
  value: string; // hex color, gradient CSS, or image URL
}

export type ElementType = 'text' | 'image' | 'rect' | 'circle' | 'triangle' | 'line' | 'star';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  layer: number;
  locked: boolean;
  opacity: number; // 0-1
}

export type FontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;

export interface TextElement extends BaseElement {
  type: 'text';
  content: string; // pode conter variáveis: {{nome_produto_1}}
  fontSize: number;
  fontFamily: string;
  fontWeight: FontWeight;
  color: string;
  italic: boolean;
  underline: boolean;
  lineHeight: number;
  letterSpacing: number;
  align: 'left' | 'center' | 'right';
}

// Fontes disponíveis no editor
export const AVAILABLE_FONTS = [
  'Arial',
  'Helvetica',
  'Times New Roman',
  'Georgia',
  'Verdana',
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Inter',
  'Oswald',
  'Playfair Display',
  'Bebas Neue',
  'Impact',
] as const;

export const FONT_WEIGHTS = [
  { value: 100, label: 'Thin' },
  { value: 200, label: 'Extra Light' },
  { value: 300, label: 'Light' },
  { value: 400, label: 'Regular' },
  { value: 500, label: 'Medium' },
  { value: 600, label: 'Semi Bold' },
  { value: 700, label: 'Bold' },
  { value: 800, label: 'Extra Bold' },
  { value: 900, label: 'Black' },
] as const;

export interface ImageElement extends BaseElement {
  type: 'image';
  src: string | null; // URL da imagem fixa ou null
  variable: string | null; // {{imagem_produto_1}} ou null
}

export interface ElementGroup {
  id: string;
  type: 'group';
  elementIds: string[]; // IDs dos elementos que compõem o grupo
  isHighlight: boolean; // Se é um grupo destaque
  name: string; // Nome do grupo (ex: "Produto Destaque 1")
}

// Propriedades comuns de formas
export interface ShapeStyles {
  fill: string;
  stroke: string;
  strokeWidth: number;
  dash: number[]; // ex: [5, 5] para linha tracejada
}

export interface RectElement extends BaseElement, ShapeStyles {
  type: 'rect';
  cornerRadius: number;
}

export interface CircleElement extends BaseElement, ShapeStyles {
  type: 'circle';
}

export interface TriangleElement extends BaseElement, ShapeStyles {
  type: 'triangle';
}

export interface LineElement extends BaseElement {
  type: 'line';
  stroke: string;
  strokeWidth: number;
  dash: number[];
  points: number[]; // [x1, y1, x2, y2]
}

export interface StarElement extends BaseElement, ShapeStyles {
  type: 'star';
  numPoints: number; // número de pontas
  innerRadius: number; // raio interno
  outerRadius: number; // raio externo
}

export type TemplateElement = 
  | TextElement 
  | ImageElement 
  | RectElement 
  | CircleElement 
  | TriangleElement 
  | LineElement 
  | StarElement;

export interface TemplateData {
  background: TemplateBackground;
  elements: TemplateElement[];
  groups?: ElementGroup[]; // Opcional para compatibilidade retroativa
}

export interface Template extends TemplateMetadata {
  data: TemplateData;
  createdAt: Date;
  updatedAt: Date;
}

// Dimensões por formato
export const TEMPLATE_DIMENSIONS = {
  feed: { width: 1080, height: 1440 }, // 3:4
  stories: { width: 1080, height: 1920 }, // 9:16
} as const;

// Helper para calcular highlightSlots
export function calculateHighlightSlots(data: TemplateData): number {
  if (!data.groups) return 0;
  return data.groups.filter(g => g.isHighlight).length;
}
