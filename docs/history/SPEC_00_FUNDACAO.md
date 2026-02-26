# SPEC_00_FUNDACAO - Setup Inicial do Projeto

**Data:** 2024-02-25  
**Autor:** Agente SPEC  
**PRDs Base:** TEMP_PRD_01_CORE, TEMP_PRD_05_INFRA

---

## Visão Geral

Setup completo da fundação do projeto InsertFlow: estrutura de monorepo, tooling, configurações base, schema do banco de dados e ambiente de desenvolvimento. Esta spec estabelece a base sobre a qual todas as outras specs serão construídas.

## Análise do Estado Atual

**O que existe:**
- Pasta `docs/agents/` com documentação dos agentes
- 6 arquivos TEMP_PRD com requisitos completos
- VPS com Easypanel, PostgreSQL e Redis já configurados

**O que falta:**
- Estrutura de código (projeto vazio)
- Configuração de monorepo
- Schema do banco de dados
- Ambiente de desenvolvimento local
- Tooling (TypeScript, ESLint, Prettier, etc.)

## Estado Final Desejado

Ao final desta fase, teremos:
- ✅ Monorepo Turborepo funcional com estrutura completa
- ✅ Configurações de TypeScript, ESLint, Prettier
- ✅ Prisma configurado com schema base multi-tenant
- ✅ Docker Compose para desenvolvimento local
- ✅ Scripts de setup e seed data
- ✅ Documentação de setup no README.md
- ✅ Ambiente de desenvolvimento rodando (Next.js + PostgreSQL + Redis)

## O Que NÃO Estamos Fazendo

- ❌ Implementação de features (auth, CRUD, etc.)
- ❌ UI/componentes visuais
- ❌ Deploy em produção (apenas dev local)
- ❌ Testes (serão adicionados nas specs específicas)

## Abordagem de Implementação

Criar estrutura de monorepo com Turborepo, configurar todas as ferramentas de desenvolvimento, definir schema completo do banco de dados (todas as tabelas necessárias para o projeto) e preparar ambiente Docker para desenvolvimento local.

---

## Fase 1: Estrutura do Monorepo

### Visão Geral
Criar estrutura completa de pastas e configurar Turborepo com npm workspaces.

### Mudanças Necessárias

#### 1. Arquivos Raiz

**Arquivo:** `package.json`
```json
{
  "name": "insertflow",
  "version": "0.1.0",
  "private": true,
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "format": "prettier --write \"**/*.{ts,tsx,md,json}\"",
    "clean": "turbo run clean && rm -rf node_modules",
    "db:generate": "turbo run db:generate",
    "db:push": "turbo run db:push",
    "db:migrate": "turbo run db:migrate",
    "db:seed": "turbo run db:seed",
    "db:studio": "cd packages/database && npx prisma studio"
  },
  "devDependencies": {
    "prettier": "^3.2.5",
    "turbo": "^1.12.4",
    "typescript": "^5.3.3"
  },
  "engines": {
    "node": ">=20.0.0",
    "npm": ">=10.0.0"
  }
}
```

**Arquivo:** `turbo.json`
```json
{
  "$schema": "https://turbo.build/schema.json",
  "globalDependencies": ["**/.env.*local"],
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "!.next/cache/**", "dist/**"]
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "lint": {
      "dependsOn": ["^lint"]
    },
    "test": {
      "dependsOn": ["^build"],
      "outputs": ["coverage/**"]
    },
    "clean": {
      "cache": false
    },
    "db:generate": {
      "cache": false
    },
    "db:push": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    },
    "db:seed": {
      "cache": false
    }
  }
}
```

**Arquivo:** `.gitignore`
```
# Dependencies
node_modules
.pnp
.pnp.js

# Testing
coverage

# Next.js
.next/
out/
build
dist/

# Misc
.DS_Store
*.pem

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Local env files
.env
.env*.local

# Vercel
.vercel

# Turbo
.turbo

# Prisma
packages/database/prisma/migrations

# Uploads
uploads/
```

**Arquivo:** `.env.example`
```bash
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/insertflow"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Storage
STORAGE_TYPE="local"
STORAGE_PATH="./uploads"

# OpenAI (Match Inteligente de Imagens)
OPENAI_API_KEY="sk-..."

# Sentry (opcional)
SENTRY_DSN=""

# App
NODE_ENV="development"
LOG_LEVEL="debug"
```

**Arquivo:** `README.md`
```markdown
# InsertFlow

Sistema web para geração automatizada de encartes de supermercado.

## Stack

- **Frontend:** Next.js 14+ (App Router) + React + TypeScript + TailwindCSS
- **Backend:** Next.js API Routes + BullMQ Workers
- **Database:** PostgreSQL + Prisma ORM
- **Cache/Queue:** Redis + BullMQ
- **Auth:** NextAuth.js v5
- **Canvas:** Konva.js + react-konva
- **Rendering:** Puppeteer + Sharp
- **AI:** OpenAI GPT-4o-mini
- **Deploy:** Easypanel (Docker)

## Requisitos

- Node.js 20+
- npm 10+
- Docker & Docker Compose

## Setup Local

1. Clone o repositório
2. Copie `.env.example` para `.env` e configure as variáveis
3. Instale dependências:
   ```bash
   npm install
   ```
4. Inicie serviços (PostgreSQL + Redis):
   ```bash
   docker-compose up -d
   ```
5. Configure o banco de dados:
   ```bash
   npm run db:push
   npm run db:seed
   ```
6. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
7. Acesse http://localhost:3000

## Comandos Úteis

- `npm run dev` - Inicia desenvolvimento
- `npm run build` - Build de produção
- `npm run lint` - Linting
- `npm run format` - Formatar código
- `npm run db:studio` - Prisma Studio (GUI do banco)
- `npm run db:migrate` - Criar migration
- `npm run db:seed` - Popular banco com dados de teste

## Estrutura do Projeto

```
insertflow/
├── apps/
│   ├── web/              # Next.js app
│   └── workers/          # BullMQ workers
├── packages/
│   ├── database/         # Prisma schema
│   ├── ui/               # Componentes compartilhados
│   ├── config/           # Configs (ESLint, TS)
│   └── lib/              # Utilities
└── docker/               # Dockerfiles
```

## Documentação

- [Arquitetura](docs/architecture.md)
- [Deploy](docs/deployment.md)
- [Specs de Implementação](docs/history/)
```

#### 2. Configurações Compartilhadas

**Arquivo:** `packages/config/package.json`
```json
{
  "name": "@insertflow/config",
  "version": "0.1.0",
  "private": true,
  "main": "index.js",
  "files": ["eslint", "typescript"]
}
```

**Arquivo:** `packages/config/eslint/next.js`
```javascript
module.exports = {
  extends: ["next/core-web-vitals", "prettier"],
  rules: {
    "@next/next/no-html-link-for-pages": "off"
  }
}
```

**Arquivo:** `packages/config/typescript/base.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Default",
  "compilerOptions": {
    "composite": false,
    "declaration": true,
    "declarationMap": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "inlineSources": false,
    "isolatedModules": true,
    "moduleResolution": "node",
    "noUnusedLocals": false,
    "noUnusedParameters": false,
    "preserveWatchOutput": true,
    "skipLibCheck": true,
    "strict": true,
    "strictNullChecks": true
  },
  "exclude": ["node_modules"]
}
```

**Arquivo:** `packages/config/typescript/nextjs.json`
```json
{
  "$schema": "https://json.schemastore.org/tsconfig",
  "display": "Next.js",
  "extends": "./base.json",
  "compilerOptions": {
    "target": "ES2017",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "incremental": true,
    "module": "esnext",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["src", "next-env.d.ts"],
  "exclude": ["node_modules"]
}
```

**Arquivo:** `.prettierrc`
```json
{
  "semi": true,
  "trailingComma": "es5",
  "singleQuote": true,
  "tabWidth": 2,
  "useTabs": false,
  "printWidth": 100
}
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [ ] `npm install` completa sem erros
- [ ] `npm run lint` passa sem erros
- [ ] `npm run format` formata arquivos corretamente
- [ ] Estrutura de pastas criada conforme especificado

#### Verificação Manual:
- [ ] Todos os arquivos de configuração estão presentes
- [ ] `.env.example` contém todas as variáveis necessárias
- [ ] README.md está completo e claro

---

## Fase 2: Package Database (Prisma)

### Visão Geral
Configurar Prisma com schema completo multi-tenant incluindo TODAS as tabelas necessárias para o projeto.

### Mudanças Necessárias

#### 1. Configuração do Prisma

**Arquivo:** `packages/database/package.json`
```json
{
  "name": "@insertflow/database",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:seed": "tsx prisma/seed.ts",
    "db:studio": "prisma studio"
  },
  "dependencies": {
    "@prisma/client": "^5.9.1"
  },
  "devDependencies": {
    "prisma": "^5.9.1",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3"
  }
}
```

**Arquivo:** `packages/database/prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ============================================
// AUTENTICAÇÃO E MULTI-TENANCY
// ============================================

model Organization {
  id        String   @id @default(cuid())
  name      String
  slug      String   @unique
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  users            User[]
  folders          Folder[]
  templates        Template[]
  products         Product[]
  images           Image[]
  generationJobs   GenerationJob[]

  @@index([slug])
  @@index([active])
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String
  password      String
  role          String    @default("user") // "admin" ou "user"
  orgId         String?
  active        Boolean   @default(true)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  organization  Organization? @relation(fields: [orgId], references: [id], onDelete: Cascade)
  generationJobs GenerationJob[]

  @@index([orgId])
  @@index([email])
  @@index([role])
}

// ============================================
// TEMPLATES E PASTAS
// ============================================

model Folder {
  id        String   @id @default(cuid())
  name      String   // ex: "Mercado Maré"
  orgId     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  templates    Template[]
  generationJobs GenerationJob[]

  @@index([orgId])
  @@index([name])
}

model Template {
  id           String   @id @default(cuid())
  name         String
  orgId        String
  folderId     String?
  format       String   // "feed" (3:4) ou "stories" (9:16)
  width        Int      // 1080 para feed, 1080 para stories
  height       Int      // 1440 para feed, 1920 para stories
  productSlots Int      // quantidade de produtos (1-6+)
  data         Json     // estrutura JSON do template (elementos, background, etc.)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  organization     Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  folder           Folder?      @relation(fields: [folderId], references: [id], onDelete: SetNull)
  generatedEncartes GeneratedEncarte[]

  @@index([orgId])
  @@index([folderId])
  @@index([format])
  @@index([productSlots])
}

// ============================================
// PRODUTOS
// ============================================

model Product {
  id             String   @id @default(cuid())
  orgId          String
  name           String
  normalizedName String   // para match de imagens
  price          Decimal  @db.Decimal(10, 2)
  processed      Boolean  @default(false)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  images       Image[]

  @@index([orgId])
  @@index([normalizedName])
  @@index([processed])
}

// ============================================
// IMAGENS
// ============================================

model Image {
  id             String   @id @default(cuid())
  orgId          String
  productId      String?  // null se não matched
  originalName   String
  normalizedName String   // para match
  format         String   // jpg, png, webp
  size           Int      // bytes
  width          Int
  height         Int
  paths          Json     // { original, optimized, thumb }
  urls           Json     // { original, optimized, thumb }
  matched        Boolean  @default(false)
  matchMethod    String?  // "exact", "ai", "manual"
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  product      Product?     @relation(fields: [productId], references: [id], onDelete: SetNull)

  @@index([orgId])
  @@index([productId])
  @@index([normalizedName])
  @@index([matched])
}

// ============================================
// GERAÇÃO DE ENCARTES
// ============================================

model GenerationJob {
  id          String   @id @default(cuid())
  orgId       String
  userId      String
  folderId    String
  format      String   // "feed" ou "stories"
  status      String   @default("pending") // pending, processing, completed, failed
  progress    Int      @default(0)  // 0-100
  error       String?
  metadata    Json?    // dados extras (produtos usados, templates, etc.)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  completedAt DateTime?

  organization Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  folder       Folder       @relation(fields: [folderId], references: [id], onDelete: Cascade)
  encartes     GeneratedEncarte[]

  @@index([orgId])
  @@index([userId])
  @@index([folderId])
  @@index([status])
  @@index([createdAt])
}

model GeneratedEncarte {
  id         String   @id @default(cuid())
  jobId      String
  templateId String
  filePath   String   // caminho no storage
  fileUrl    String   // URL pública
  products   Json     // IDs e dados dos produtos incluídos
  createdAt  DateTime @default(now())

  job      GenerationJob @relation(fields: [jobId], references: [id], onDelete: Cascade)
  template Template      @relation(fields: [templateId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([templateId])
  @@index([createdAt])
}

// ============================================
// CACHE DE MATCH IA (opcional, pode usar Redis)
// ============================================

model ImageMatchCache {
  id             String   @id @default(cuid())
  orgId          String
  imageName      String
  normalizedName String
  productId      String?
  confidence     String   // "high", "medium", "low"
  method         String   // "exact", "ai"
  createdAt      DateTime @default(now())
  expiresAt      DateTime

  @@unique([orgId, normalizedName])
  @@index([orgId])
  @@index([expiresAt])
}
```

**Arquivo:** `packages/database/src/index.ts`
```typescript
import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export * from '@prisma/client';
```

**Arquivo:** `packages/database/prisma/seed.ts`
```typescript
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Limpar dados existentes
  await prisma.generatedEncarte.deleteMany();
  await prisma.generationJob.deleteMany();
  await prisma.image.deleteMany();
  await prisma.product.deleteMany();
  await prisma.template.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // Criar organização de exemplo
  const org = await prisma.organization.create({
    data: {
      name: 'Supermercado Demo',
      slug: 'supermercado-demo',
      active: true,
    },
  });

  console.log('✅ Organização criada:', org.name);

  // Criar usuário admin
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@insertflow.com',
      name: 'Admin',
      password: adminPassword,
      role: 'admin',
    },
  });

  console.log('✅ Admin criado:', admin.email);

  // Criar usuário da organização
  const userPassword = await bcrypt.hash('user123', 10);
  const user = await prisma.user.create({
    data: {
      email: 'usuario@supermercado.com',
      name: 'Usuário Demo',
      password: userPassword,
      role: 'user',
      orgId: org.id,
    },
  });

  console.log('✅ Usuário criado:', user.email);

  // Criar pasta de templates
  const folder = await prisma.folder.create({
    data: {
      name: 'Mercado Maré',
      orgId: org.id,
    },
  });

  console.log('✅ Pasta criada:', folder.name);

  // Criar produtos de exemplo
  const products = await Promise.all([
    prisma.product.create({
      data: {
        orgId: org.id,
        name: 'Coca Cola 2L',
        normalizedName: 'cocacola2l',
        price: 8.99,
      },
    }),
    prisma.product.create({
      data: {
        orgId: org.id,
        name: 'Arroz Tio João 5kg',
        normalizedName: 'arroztiojoao5kg',
        price: 25.90,
      },
    }),
    prisma.product.create({
      data: {
        orgId: org.id,
        name: 'Feijão Preto 1kg',
        normalizedName: 'feijaopreto1kg',
        price: 7.50,
      },
    }),
  ]);

  console.log(`✅ ${products.length} produtos criados`);

  console.log('\n🎉 Seed concluído!');
  console.log('\nCredenciais:');
  console.log('Admin: admin@insertflow.com / admin123');
  console.log('Usuário: usuario@supermercado.com / user123');
}

main()
  .catch((e) => {
    console.error('❌ Erro no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

**Arquivo:** `packages/database/tsconfig.json`
```json
{
  "extends": "@insertflow/config/typescript/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src", "prisma"],
  "exclude": ["node_modules", "dist"]
}
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [ ] `npm run db:generate` gera Prisma Client sem erros
- [ ] `npm run db:push` sincroniza schema com banco
- [ ] `npm run db:seed` popula banco com dados de exemplo
- [ ] `npm run db:studio` abre Prisma Studio

#### Verificação Manual:
- [ ] Schema contém todas as tabelas necessárias
- [ ] Relações entre tabelas estão corretas
- [ ] Índices estão definidos para queries frequentes
- [ ] Seed cria dados de exemplo válidos

---

## Fase 3: App Web (Next.js)

### Visão Geral
Configurar aplicação Next.js com estrutura base e dependências principais.

### Mudanças Necessárias

#### 1. Configuração do Next.js

**Arquivo:** `apps/web/package.json`
```json
{
  "name": "@insertflow/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "clean": "rm -rf .next"
  },
  "dependencies": {
    "@insertflow/database": "*",
    "@insertflow/ui": "*",
    "next": "14.1.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "next-auth": "^5.0.0-beta.4",
    "bcryptjs": "^2.4.3",
    "zod": "^3.22.4",
    "react-hook-form": "^7.50.0",
    "@hookform/resolvers": "^3.3.4",
    "konva": "^9.3.1",
    "react-konva": "^18.2.10",
    "bullmq": "^5.1.9",
    "ioredis": "^5.3.2",
    "puppeteer": "^21.11.0",
    "sharp": "^0.33.2",
    "openai": "^4.28.0",
    "pino": "^8.18.0",
    "pino-pretty": "^10.3.1",
    "@sentry/nextjs": "^7.100.0",
    "formidable": "^3.5.1",
    "react-dropzone": "^14.2.3",
    "lucide-react": "^0.323.0"
  },
  "devDependencies": {
    "@insertflow/config": "*",
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "@types/bcryptjs": "^2.4.6",
    "@types/formidable": "^3.4.5",
    "typescript": "^5",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.4.17",
    "eslint": "^8",
    "eslint-config-next": "14.1.0"
  }
}
```

**Arquivo:** `apps/web/next.config.js`
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@insertflow/database', '@insertflow/ui'],
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    domains: ['localhost'],
  },
};

module.exports = nextConfig;
```

**Arquivo:** `apps/web/tsconfig.json`
```json
{
  "extends": "@insertflow/config/typescript/nextjs.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"],
      "@/app/*": ["./src/app/*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

**Arquivo:** `apps/web/tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
      },
    },
  },
  plugins: [],
};
export default config;
```

**Arquivo:** `apps/web/postcss.config.js`
```javascript
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

**Arquivo:** `apps/web/src/app/globals.css`
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --card: 0 0% 100%;
    --card-foreground: 222.2 84% 4.9%;
    --popover: 0 0% 100%;
    --popover-foreground: 222.2 84% 4.9%;
    --primary: 222.2 47.4% 11.2%;
    --primary-foreground: 210 40% 98%;
    --secondary: 210 40% 96.1%;
    --secondary-foreground: 222.2 47.4% 11.2%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 210 40% 96.1%;
    --accent-foreground: 222.2 47.4% 11.2%;
    --destructive: 0 84.2% 60.2%;
    --destructive-foreground: 210 40% 98%;
    --border: 214.3 31.8% 91.4%;
    --input: 214.3 31.8% 91.4%;
    --ring: 222.2 84% 4.9%;
  }
}

@layer base {
  * {
    @apply border-border;
  }
  body {
    @apply bg-background text-foreground;
  }
}
```

**Arquivo:** `apps/web/src/app/layout.tsx`
```typescript
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'InsertFlow',
  description: 'Sistema de geração automatizada de encartes',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
```

**Arquivo:** `apps/web/src/app/page.tsx`
```typescript
export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold">InsertFlow</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Sistema de geração automatizada de encartes
      </p>
    </main>
  );
}
```

**Arquivo:** `apps/web/src/lib/prisma.ts`
```typescript
import { prisma } from '@insertflow/database';

export { prisma };
```

**Arquivo:** `apps/web/.eslintrc.js`
```javascript
module.exports = {
  extends: ['@insertflow/config/eslint/next.js'],
};
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [ ] `npm run dev` inicia servidor Next.js em http://localhost:3000
- [ ] `npm run build` compila aplicação sem erros
- [ ] `npm run lint` passa sem erros
- [ ] Hot reload funciona ao editar arquivos

#### Verificação Manual:
- [ ] Página inicial renderiza corretamente
- [ ] TailwindCSS está funcionando
- [ ] Prisma Client está acessível via `@/lib/prisma`
- [ ] TypeScript não apresenta erros

---

## Fase 4: Package UI (Componentes Compartilhados)

### Visão Geral
Criar package de componentes UI compartilhados (base para futuras specs).

### Mudanças Necessárias

**Arquivo:** `packages/ui/package.json`
```json
{
  "name": "@insertflow/ui",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.tsx",
  "types": "./src/index.tsx",
  "scripts": {
    "lint": "eslint .",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "react": "^18.2.0",
    "lucide-react": "^0.323.0",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.1"
  },
  "devDependencies": {
    "@insertflow/config": "*",
    "@types/react": "^18",
    "typescript": "^5",
    "tailwindcss": "^3.4.1"
  }
}
```

**Arquivo:** `packages/ui/src/index.tsx`
```typescript
export * from './button';
export * from './card';
export * from './input';
```

**Arquivo:** `packages/ui/src/lib/utils.ts`
```typescript
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

**Arquivo:** `packages/ui/src/button.tsx`
```typescript
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from './lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
```

**Arquivo:** `packages/ui/tsconfig.json`
```json
{
  "extends": "@insertflow/config/typescript/base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [ ] `npm run lint` passa sem erros
- [ ] TypeScript compila sem erros
- [ ] Componentes podem ser importados em `apps/web`

#### Verificação Manual:
- [ ] Componente Button renderiza corretamente
- [ ] Variantes do Button funcionam (primary, secondary, etc.)

---

## Fase 5: Package Lib (Utilities)

### Visão Geral
Criar package de utilities compartilhadas (logger, storage, queue, etc.).

### Mudanças Necessárias

**Arquivo:** `packages/lib/package.json`
```json
{
  "name": "@insertflow/lib",
  "version": "0.1.0",
  "private": true,
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "scripts": {
    "lint": "eslint .",
    "clean": "rm -rf dist"
  },
  "dependencies": {
    "pino": "^8.18.0",
    "pino-pretty": "^10.3.1",
    "ioredis": "^5.3.2"
  },
  "devDependencies": {
    "@insertflow/config": "*",
    "@types/node": "^20",
    "typescript": "^5"
  }
}
```

**Arquivo:** `packages/lib/src/index.ts`
```typescript
export * from './logger';
export * from './redis';
export * from './utils';
```

**Arquivo:** `packages/lib/src/logger.ts`
```typescript
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
});
```

**Arquivo:** `packages/lib/src/redis.ts`
```typescript
import Redis from 'ioredis';

const globalForRedis = globalThis as unknown as {
  redis: Redis | undefined;
};

export const redis =
  globalForRedis.redis ??
  new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null,
  });

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis;
```

**Arquivo:** `packages/lib/src/utils.ts`
```typescript
export function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-z0-9]/g, '');
}

export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
```

**Arquivo:** `packages/lib/tsconfig.json`
```json
{
  "extends": "@insertflow/config/typescript/base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [ ] `npm run lint` passa sem erros
- [ ] TypeScript compila sem erros
- [ ] Logger pode ser importado e usado

#### Verificação Manual:
- [ ] Logger formata mensagens corretamente
- [ ] Redis conecta com sucesso
- [ ] Funções utilitárias funcionam corretamente

---

## Fase 6: Docker Compose (Desenvolvimento Local)

### Visão Geral
Configurar Docker Compose para rodar PostgreSQL e Redis localmente.

### Mudanças Necessárias

**Arquivo:** `docker-compose.yml`
```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: insertflow-postgres
    environment:
      POSTGRES_DB: insertflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U postgres']
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: insertflow-redis
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
  redis-data:
```

**Arquivo:** `docker/Dockerfile.web` (para futuro deploy)
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY turbo.json ./
COPY apps/web/package*.json ./apps/web/
COPY packages/*/package*.json ./packages/*/
RUN npm ci

# Build app
COPY . .
RUN npm run build --filter=@insertflow/web

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/apps/web/.next/standalone ./
COPY --from=builder /app/apps/web/.next/static ./apps/web/.next/static
COPY --from=builder /app/apps/web/public ./apps/web/public

EXPOSE 3000

CMD ["node", "apps/web/server.js"]
```

### Critérios de Sucesso

#### Verificação Automatizada:
- [ ] `docker-compose up -d` inicia serviços sem erros
- [ ] `docker-compose ps` mostra serviços healthy
- [ ] Conexão com PostgreSQL funciona (porta 5432)
- [ ] Conexão com Redis funciona (porta 6379)

#### Verificação Manual:
- [ ] PostgreSQL aceita conexões
- [ ] Redis responde a comandos
- [ ] Volumes persistem dados após restart

---

## Estratégia de Testes

### Testes de Setup

**Arquivo:** `scripts/test-setup.sh`
```bash
#!/bin/bash
set -e

echo "🧪 Testando setup do projeto..."

# Verificar Node.js
echo "Verificando Node.js..."
node --version || { echo "❌ Node.js não encontrado"; exit 1; }

# Verificar npm
echo "Verificando npm..."
npm --version || { echo "❌ npm não encontrado"; exit 1; }

# Verificar Docker
echo "Verificando Docker..."
docker --version || { echo "❌ Docker não encontrado"; exit 1; }

# Instalar dependências
echo "Instalando dependências..."
npm install

# Gerar Prisma Client
echo "Gerando Prisma Client..."
npm run db:generate

# Iniciar serviços
echo "Iniciando serviços Docker..."
docker-compose up -d

# Aguardar serviços
echo "Aguardando serviços..."
sleep 5

# Push schema
echo "Sincronizando schema..."
npm run db:push

# Seed
echo "Populando banco..."
npm run db:seed

# Build
echo "Compilando aplicação..."
npm run build

echo "✅ Setup concluído com sucesso!"
```

### Casos a Cobrir
- Instalação de dependências
- Geração do Prisma Client
- Conexão com banco de dados
- Seed de dados
- Build da aplicação

---

## Considerações de Performance

- Turborepo cache acelera builds subsequentes
- Prisma Client gerado uma vez, reutilizado
- Docker volumes persistem dados (não recriar a cada vez)
- Hot reload do Next.js para desenvolvimento rápido

---

## Notas de Migração

Não aplicável (projeto novo).

---

## Referências

- **PRD Original:** TEMP_PRD_01_CORE.md, TEMP_PRD_05_INFRA.md
- **Turborepo Docs:** https://turbo.build/repo/docs
- **Next.js Docs:** https://nextjs.org/docs
- **Prisma Docs:** https://www.prisma.io/docs
- **Docker Compose:** https://docs.docker.com/compose/

---

## Próxima Spec

**SPEC_01_AUTH_MULTITENANCY.md** - Implementação de autenticação com NextAuth.js v5 e Row-Level Security para multi-tenancy.
