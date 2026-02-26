# TEMP_PRD_02 - Sistema de Editor de Templates

## 1. Resumo do Pedido

Editor visual para criação de templates de encartes sem necessidade de conhecimento técnico. Designers devem poder criar layouts do zero com elementos visuais (textos, imagens, formas, cores, fundos) e definir áreas onde produtos serão inseridos.

---

## 2. Contexto Atual da Codebase

**Projeto novo:** Sem implementação existente de editor.

**Requisitos do TEMP_PRD_01:**
- Designers criam templates do zero
- Sem conhecimento técnico necessário
- Templates organizados em pastas por organização
- Clonagem entre pastas permitida
- Preview em tempo real não é obrigatório (simplifica MVP)

---

## 3. Regras de Negócio

### 3.1 Funcionalidades do Editor

**Elementos Suportados:**
1. **Textos**
   - Fonte, tamanho, cor, alinhamento
   - Negrito, itálico, sublinhado
   - Textos fixos (ex: "OFERTA") ou variáveis (ex: {{nome_produto}})

2. **Imagens**
   - Upload de imagens fixas (logos, decorações)
   - Áreas de imagem variável (produto)
   - Redimensionamento, rotação, crop

3. **Formas**
   - Retângulos, círculos, linhas
   - Cores de preenchimento e borda
   - Opacidade

4. **Fundos**
   - Cor sólida
   - Gradiente
   - Imagem de fundo

5. **Cores**
   - Picker de cores
   - Paleta personalizada por organização

**Operações:**
- Drag and drop de elementos
- Redimensionar elementos
- Rotacionar elementos
- Camadas (z-index) - trazer para frente/enviar para trás
- Duplicar elementos
- Deletar elementos
- Undo/Redo (desejável, não obrigatório para MVP)

### 3.2 Áreas de Produtos (Slots)

**Conceito:**
- Template define N slots de produtos (1, 2, 3, 4, 5, 6, etc.)
- Cada slot é um grupo de elementos que se repete
- Elementos do slot podem usar variáveis: `{{nome}}`, `{{preco}}`, `{{imagem}}`

**Exemplo - Template de 2 Produtos:**
```
Slot 1:
  - Imagem variável ({{imagem_produto_1}})
  - Texto variável ({{nome_produto_1}})
  - Texto variável (R$ {{preco_produto_1}})

Slot 2:
  - Imagem variável ({{imagem_produto_2}})
  - Texto variável ({{nome_produto_2}})
  - Texto variável (R$ {{preco_produto_2}})
```

### 3.3 Configurações do Template

**Metadados:**
- Nome do template
- Quantidade de produtos (1-6+)
- Formato: "feed" (3:4 - 1080x1440) ou "stories" (9:16 - 1080x1920)
- Dimensões em pixels (calculadas automaticamente)
- Organização (tenant)
- Pasta do cliente
- Subpasta de formato (feed ou stories)

**Dimensões por Formato:**
- **feed** (aspecto 3:4): 1080x1440px
- **stories** (aspecto 9:16): 1080x1920px

### 3.4 Salvamento e Carregamento

**Formato de Armazenamento:**
- JSON estruturado
- Salvo no PostgreSQL
- Versionamento não é obrigatório para MVP

**Estrutura JSON (exemplo simplificado):**
```json
{
  "id": "template-123",
  "name": "Encarte 6 Produtos - Feed",
  "org_id": "org-456",
  "folder_id": "folder-789",
  "format": "3:4",
  "width": 1080,
  "height": 1440,
  "product_slots": 6,
  "background": {
    "type": "color",
    "value": "#ffffff"
  },
  "elements": [
    {
      "id": "el-1",
      "type": "text",
      "content": "OFERTAS DA SEMANA",
      "x": 100,
      "y": 50,
      "fontSize": 48,
      "fontFamily": "Arial",
      "color": "#ff0000",
      "bold": true,
      "layer": 10
    },
    {
      "id": "el-2",
      "type": "image",
      "variable": "{{imagem_produto_1}}",
      "x": 50,
      "y": 150,
      "width": 300,
      "height": 300,
      "layer": 5
    }
  ]
}
```

### 3.5 Clonagem de Templates

**Funcionalidade:**
- Usuário pode clonar template para outra pasta
- Cria cópia completa (novo ID)
- Mantém todos os elementos e configurações
- Permite edição independente

---

## 4. Histórico Relevante

**Sistema atual (Google Slides):**
- Templates criados manualmente no Slides
- Limitações: difícil posicionamento preciso, poucas opções de design
- Variáveis inseridas via Apps Script
- **Principal dor do usuário**

---

## 5. Padrões de Testes do Projeto

**Testes Recomendados:**
- Unitários: funções de manipulação de JSON
- Integração: salvamento/carregamento de templates
- E2E: fluxo completo de criação de template

---

## 6. Referências Externas

### 6.1 Bibliotecas Canvas para React

**Pesquisa realizada:**
- "React canvas editor drag drop template builder fabric.js konva.js 2024"
- "Fabric.js template editor drag drop layers React tutorial 2024"
- "Konva.js React template builder shapes text images positioning"

#### Opção 1: Fabric.js

**Características:**
- Biblioteca madura (10+ anos)
- API orientada a objetos
- Suporte nativo a drag-and-drop
- Serialização/deserialização JSON
- Camadas (z-index)
- Eventos de mouse/touch
- Grupos de objetos

**Prós:**
- ✅ Documentação extensa
- ✅ Comunidade grande
- ✅ Muitos exemplos disponíveis
- ✅ Suporte a SVG
- ✅ Funciona bem com React (via refs)

**Contras:**
- ❌ Não tem wrapper React oficial
- ❌ Precisa gerenciar estado manualmente
- ❌ Performance pode degradar com muitos objetos

**Recursos Encontrados:**
- "Managing Canvas Layers with Fabric.js and React: A Comprehensive Guide" (Medium)
- "React Js Design Editor using Fabric Js" (Codementor)
- Stack Overflow: "How can I use Fabric.js with React?"
- GitHub topics: fabricjs (447+ stars em projetos relacionados)

**Exemplo de Uso:**
```javascript
import { fabric } from 'fabric';

const canvas = new fabric.Canvas('canvas');
const rect = new fabric.Rect({
  left: 100,
  top: 100,
  fill: 'red',
  width: 200,
  height: 100
});
canvas.add(rect);

// Serializar
const json = canvas.toJSON();

// Deserializar
canvas.loadFromJSON(json);
```

#### Opção 2: Konva.js + react-konva

**Características:**
- Framework moderno para canvas
- Wrapper React oficial (react-konva)
- API declarativa no React
- Suporte a drag-and-drop
- Camadas e grupos
- Eventos nativos do React
- Performance otimizada

**Prós:**
- ✅ Integração React nativa
- ✅ API declarativa (mais "React-like")
- ✅ Performance superior com muitos objetos
- ✅ TypeScript support
- ✅ Documentação excelente

**Contras:**
- ❌ Comunidade menor que Fabric.js
- ❌ Menos exemplos de editores completos
- ❌ Curva de aprendizado para padrões React

**Recursos Encontrados:**
- Documentação oficial: konvajs.org/docs/react/
- "Getting started with React and Canvas via Konva"
- "Drawing canvas shapes with React"
- "Drag and drop canvas shapes"
- GitHub: react-konva (5k+ stars)

**Exemplo de Uso:**
```javascript
import { Stage, Layer, Rect, Text } from 'react-konva';

function App() {
  return (
    <Stage width={1080} height={1440}>
      <Layer>
        <Rect
          x={100}
          y={100}
          width={200}
          height={100}
          fill="red"
          draggable
        />
        <Text
          text="Hello"
          fontSize={24}
          x={150}
          y={130}
        />
      </Layer>
    </Stage>
  );
}
```

#### Comparação Técnica

| Critério | Fabric.js | Konva.js |
|----------|-----------|----------|
| Integração React | Manual (refs) | Nativa (react-konva) |
| Performance | Boa | Excelente |
| Documentação | Extensa | Excelente |
| Comunidade | Grande | Média |
| Curva de Aprendizado | Média | Baixa (para devs React) |
| TypeScript | Sim (DefinitelyTyped) | Sim (nativo) |
| Serialização JSON | Nativa | Manual |
| Drag & Drop | Nativo | Nativo |

**Fonte Comparativa:**
- "React: Comparison of JS Canvas Libraries (Konvajs vs Fabricjs)" (dev.to)
- "Konva.js vs Fabric.js: In-Depth Technical Comparison" (Medium)
- GitHub Issue: "Konva vs Fabric" (#637)

### 6.2 Estrutura de Templates JSON

**Pesquisa realizada:**
- "canvas editor JSON schema template structure save load"

**Referências:**
- Excalidraw JSON Schema (docs.excalidraw.com)
- JSON Schema Editor (GitHub: json-editor/json-editor)

**Padrão Excalidraw (inspiração):**
```json
{
  "type": "excalidraw",
  "version": 2,
  "source": "https://excalidraw.com",
  "elements": [
    {
      "id": "unique-id",
      "type": "rectangle",
      "x": 100,
      "y": 100,
      "width": 200,
      "height": 100,
      "angle": 0,
      "strokeColor": "#000000",
      "backgroundColor": "#ffffff",
      "fillStyle": "solid",
      "strokeWidth": 2,
      "opacity": 100
    }
  ]
}
```

### 6.3 Editores Open Source (Inspiração)

**Pesquisa realizada:**
- "React drag drop UI builder Canva Figma clone open source"

**Projetos Encontrados:**
- Builder.io (comercial, mas tem conceitos úteis)
- TeleportHQ (drag-and-drop React builder)
- "Drag and Drop Component Builder using React" (whoisryosuke.com)

**Conceitos Úteis:**
- Sidebar com elementos arrastáveis
- Canvas central
- Property panel para edição
- Layers panel para hierarquia

---

## 7. Mapeamento de Arquivos

### 7.1 Estrutura Proposta do Editor

```
/apps/web/app/
├── (dashboard)/
│   └── templates/
│       ├── page.tsx                 # Lista de templates
│       ├── new/
│       │   └── page.tsx             # Criar novo template
│       └── [id]/
│           ├── page.tsx             # Editor de template
│           └── components/
│               ├── Canvas.tsx       # Canvas principal
│               ├── Toolbar.tsx      # Ferramentas (add elementos)
│               ├── PropertiesPanel.tsx  # Editar propriedades
│               ├── LayersPanel.tsx  # Gerenciar camadas
│               └── elements/
│                   ├── TextElement.tsx
│                   ├── ImageElement.tsx
│                   ├── ShapeElement.tsx
│                   └── ProductSlot.tsx

/packages/database/
└── schema.prisma
    └── Template model

/packages/editor/
├── types/
│   └── template.ts              # TypeScript types
├── utils/
│   ├── serializer.ts            # JSON ↔ Canvas
│   └── validator.ts             # Validar template
└── hooks/
    ├── useCanvas.ts
    └── useTemplateEditor.ts
```

### 7.2 Schema do Banco (Prisma)

```prisma
model Template {
  id          String   @id @default(cuid())
  name        String
  orgId       String
  folderId    String?
  format      String   // "feed" (3:4) ou "stories" (9:16)
  width       Int
  height      Int
  productSlots Int     // quantidade de produtos
  data        Json     // estrutura JSON do template
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  organization Organization @relation(fields: [orgId], references: [id])
  folder       Folder?       @relation(fields: [folderId], references: [id])
  
  @@index([orgId])
  @@index([folderId])
  @@index([format])  // índice para filtrar por formato
}

model Folder {
  id        String   @id @default(cuid())
  name      String   // ex: "Mercado Maré"
  orgId     String
  createdAt DateTime @default(now())
  
  organization Organization @relation(fields: [orgId], references: [id])
  templates    Template[]  // contém templates de feed E stories
  
  @@index([orgId])
  
  // Nota: Templates são filtrados por folder.id + format
  // Ex: WHERE folderId = 'x' AND format = 'feed'
}
```

---

## 8. Pontos de Atenção para o SPEC

### 8.1 Decisão Técnica Principal

**Fabric.js vs Konva.js:**

**Recomendação: Konva.js + react-konva**

**Justificativa:**
1. Integração React nativa (menos código boilerplate)
2. API declarativa (mais fácil manutenção)
3. Performance superior (importante para editor complexo)
4. TypeScript nativo
5. Documentação excelente para React

**Trade-off:**
- Serialização JSON precisa ser implementada manualmente
- Comunidade menor (mas suficiente)

**Alternativa:** Se SPEC preferir Fabric.js por comunidade maior, é viável também.

### 8.2 Complexidade do Editor

**Estimativa:** 3-4 semanas (complexidade 4/5)

**Breakdown:**
- Setup Konva + React: 2-3 dias
- Canvas básico + drag-drop: 1 semana
- Elementos (texto, imagem, formas): 1 semana
- Properties panel + layers: 3-5 dias
- Serialização JSON: 2-3 dias
- Product slots (variáveis): 3-5 dias

### 8.3 MVP vs Completo

**MVP (suficiente para começar):**
- ✅ Canvas com drag-drop
- ✅ Elementos básicos (texto, imagem, retângulo)
- ✅ Propriedades básicas (posição, tamanho, cor)
- ✅ Salvar/carregar JSON
- ✅ Product slots simples
- ❌ Undo/Redo (pode adicionar depois)
- ❌ Grupos de elementos (pode adicionar depois)
- ❌ Alinhamento automático (pode adicionar depois)

### 8.4 UX Recomendada

**Layout do Editor:**
```
┌─────────────────────────────────────────────────┐
│ Header: [Nome Template] [Salvar] [Preview]     │
├──────────┬──────────────────────┬───────────────┤
│          │                      │               │
│ Toolbar  │   Canvas             │  Properties   │
│          │   (1080x1440)        │  Panel        │
│ - Text   │                      │               │
│ - Image  │   [Template aqui]    │  - Position   │
│ - Shape  │                      │  - Size       │
│ - Slot   │                      │  - Color      │
│          │                      │  - Font       │
│          │                      │               │
├──────────┴──────────────────────┴───────────────┤
│ Layers Panel: [Lista de elementos]             │
└─────────────────────────────────────────────────┘
```

### 8.5 Variáveis de Template

**Sistema de Variáveis:**
- Sintaxe: `{{variavel}}`
- Variáveis disponíveis por slot:
  - `{{nome_produto_N}}`
  - `{{preco_produto_N}}`
  - `{{imagem_produto_N}}`
- Variáveis globais:
  - `{{data_validade}}`
  - `{{header}}`

**Validação:**
- Template deve ter exatamente N slots (conforme configurado)
- Cada slot deve ter pelo menos `{{imagem_produto_N}}`
- Avisar se variáveis estão faltando

---

## 9. Dependências entre Componentes

```
Template Editor
  ├── Konva.js (canvas rendering)
  ├── react-konva (React integration)
  ├── Prisma (database)
  ├── Zod (validação JSON)
  └── Template Generation Engine (TEMP_PRD_03)
      └── Usa JSON do template para gerar PNG
```

---

## 10. Riscos e Mitigações

### Risco 1: Complexidade do Editor
**Mitigação:** Começar com MVP simples, iterar com feedback dos designers

### Risco 2: Performance com Muitos Elementos
**Mitigação:** Konva.js tem boa performance, mas limitar elementos por template (ex: max 50)

### Risco 3: Curva de Aprendizado dos Designers
**Mitigação:** UI intuitiva, tutoriais, templates de exemplo pré-criados

---

## PRÓXIMO DOCUMENTO

**TEMP_PRD_03_GENERATION.md:** Engine de geração de encartes (renderizar template + dados → PNG 300 DPI)
