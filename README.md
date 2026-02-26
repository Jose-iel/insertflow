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
