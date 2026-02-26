# TEMP_PRD_05 - Deploy e Infraestrutura

## 1. Resumo do Pedido

Configuração de infraestrutura, deploy e operação do sistema na VPS com Easypanel. Inclui containerização, CI/CD, monitoramento, backup e manutenção.

---

## 2. Contexto Atual da Codebase

**Projeto novo:** Sem infraestrutura configurada ainda.

**Infraestrutura Existente:**
- VPS com Easypanel instalado
- PostgreSQL configurado
- Redis configurado
- n8n rodando (será descontinuado após migração)

---

## 3. Regras de Negócio

### 3.1 Requisitos de Infraestrutura

**Serviços Necessários:**
1. **Next.js App** (frontend + API routes)
2. **PostgreSQL** (já existe)
3. **Redis** (já existe)
4. **BullMQ Workers** (processamento assíncrono)
5. **Storage** (filesystem ou S3-compatible)

**Recursos Estimados (MVP):**
- CPU: 2-4 cores
- RAM: 4-8GB
- Storage: 50-100GB (crescimento com imagens)
- Usuários: 10-15 iniciais

### 3.2 Ambientes

**Desenvolvimento:**
- Local (Docker Compose)
- Hot reload
- Seed data

**Produção:**
- Easypanel na VPS
- SSL/TLS automático
- Domínio customizado

**Staging (opcional para MVP):**
- Ambiente de testes
- Dados de teste

### 3.3 Disponibilidade e Performance

**SLA (não crítico):**
- Uptime: 95%+ (downtime planejado aceitável)
- Tempo de resposta: <2s (páginas)
- Geração de encartes: ~1 minuto

**Escalabilidade:**
- Vertical primeiro (upgrade VPS)
- Horizontal depois (múltiplos workers)

---

## 4. Histórico Relevante

**Sistema atual:**
- n8n na mesma VPS
- PostgreSQL e Redis já configurados
- Sem CI/CD formal
- Backup manual

---

## 5. Padrões de Testes do Projeto

**Estratégia de Testes:**
- Unit: Jest/Vitest
- Integration: Supertest
- E2E: Playwright (opcional)
- Coverage: >70%

---

## 6. Referências Externas

### 6.1 Deploy no Easypanel

**Pesquisa realizada:**
- "Easypanel Next.js PostgreSQL Redis Docker deployment tutorial 2024"

**Recursos Encontrados:**
- "Deploying a Next.js Application with Easypanel" (Easypanel Docs)
- "Exploring EasyPanel: The Next Generation Server Control Panel" (Abdul Aziz Ahwan)
- "Self-hosting Next.js with EasyPanel (Docker)" (Reddit)
- GitHub: deadcoder0904/easypanel-nextjs-sqlite

**Easypanel - Características:**
- Interface web para gerenciar containers
- Templates prontos (PostgreSQL, Redis, etc.)
- Build automático via Nixpacks ou Dockerfile
- SSL/TLS via Let's Encrypt
- Domínios customizados
- Variáveis de ambiente
- Logs centralizados
- Backups automáticos (PostgreSQL)

**Métodos de Deploy:**

#### Opção 1: Nixpacks (Recomendado para MVP)
- Build automático
- Detecta Next.js automaticamente
- Menos configuração
- Mais rápido para começar

**Configuração:**
```
1. Conectar repositório Git
2. Easypanel detecta Next.js
3. Configurar env vars
4. Deploy automático
```

#### Opção 2: Dockerfile (Mais Controle)
- Customização total
- Multi-stage builds
- Otimização de tamanho
- Melhor para produção

**Exemplo Dockerfile:**
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Build app
COPY . .
RUN npm run build

# Production stage
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy built app
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
CMD ["node", "server.js"]
```

**Configuração no Easypanel:**
```yaml
# easypanel.yml (exemplo)
services:
  - name: insertflow-web
    image: 
      type: dockerfile
      path: ./Dockerfile
    env:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
    domains:
      - name: insertflow.com
        port: 3000
    volumes:
      - name: uploads
        path: /app/uploads
```

### 6.2 Estrutura de Monorepo

**Pesquisa realizada:**
- "Next.js monorepo Turborepo structure best practices 2024"

**Recursos Encontrados:**
- "Monorepo Starter: Next.js & Turborepo Template" (Vercel)
- Turborepo Docs: "Next.js Guide"
- "Monorepo in Next.js using Turborepo" (Ready to Work)
- "Next.js Monorepo Performance Tips" (Medium)

**Turborepo - Características:**
- Build system para monorepos
- Cache inteligente
- Execução paralela de tasks
- Remote caching (Vercel)
- Incremental builds

**Estrutura Recomendada:**
```
insertflow/
├── apps/
│   ├── web/                    # Next.js app
│   │   ├── app/
│   │   ├── public/
│   │   ├── package.json
│   │   └── next.config.js
│   └── workers/                # BullMQ workers (opcional separado)
│       ├── src/
│       └── package.json
├── packages/
│   ├── database/               # Prisma schema + client
│   │   ├── prisma/
│   │   └── package.json
│   ├── ui/                     # Componentes compartilhados
│   │   ├── components/
│   │   └── package.json
│   ├── config/                 # Configs (ESLint, TS, etc.)
│   │   └── package.json
│   └── lib/                    # Utilities compartilhadas
│       └── package.json
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── .github/
│   └── workflows/
│       └── ci.yml
├── turbo.json
├── package.json
└── README.md
```

**turbo.json:**
```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    }
  }
}
```

**Benefícios:**
- Build incremental (só rebuilda o que mudou)
- Cache compartilhado entre devs
- Tasks paralelas (lint + test + build)
- Melhor DX (developer experience)

**Alternativa Simples (sem Turborepo):**
- Monorepo com npm workspaces
- Menos features, mais simples
- Adequado para MVP

### 6.3 Backup e Restore

**Pesquisa realizada:**
- "PostgreSQL backup restore Docker volume Easypanel"

**Recursos Encontrados:**
- "Backup/Restore a dockerized PostgreSQL database" (Stack Overflow)
- "Docker Postgres Backup/Restore Guide" (SimpleBackups)
- "Postgres Backup Template" (Easypanel Docs)
- GitHub: eeshugerman/postgres-backup-s3

**Estratégias de Backup:**

#### PostgreSQL

**Opção 1: pg_dump (Manual)**
```bash
# Backup
docker exec postgres-container pg_dump -U user dbname > backup.sql

# Restore
docker exec -i postgres-container psql -U user dbname < backup.sql
```

**Opção 2: Template do Easypanel (Recomendado)**
- Template "Postgres Backup" disponível
- Backup automático para S3
- Agendamento via cron
- Retenção configurável

**Configuração:**
```yaml
# Easypanel Postgres Backup Template
POSTGRES_HOST: postgres
POSTGRES_DB: insertflow
POSTGRES_USER: ${DB_USER}
POSTGRES_PASSWORD: ${DB_PASSWORD}
S3_BUCKET: insertflow-backups
S3_PREFIX: postgres
SCHEDULE: "0 2 * * *"  # 2am diário
BACKUP_KEEP_DAYS: 30
```

**Opção 3: Volume Snapshots**
- Backup do volume Docker
- Mais rápido que pg_dump
- Restauração completa

```bash
# Backup volume
docker run --rm \
  -v postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/postgres-backup.tar.gz /data

# Restore volume
docker run --rm \
  -v postgres-data:/data \
  -v $(pwd):/backup \
  alpine tar xzf /backup/postgres-backup.tar.gz -C /
```

#### Uploads (Imagens)

**Estratégia:**
- Sync para S3/R2 (se usar cloud storage)
- Backup do volume (se filesystem local)
- Retenção: 90 dias

**Script de Backup:**
```bash
#!/bin/bash
# backup-uploads.sh

DATE=$(date +%Y%m%d)
BACKUP_DIR="/backups/uploads"

# Criar backup
tar czf "$BACKUP_DIR/uploads-$DATE.tar.gz" /app/uploads

# Limpar backups antigos (>90 dias)
find "$BACKUP_DIR" -name "uploads-*.tar.gz" -mtime +90 -delete

# Upload para S3 (opcional)
aws s3 cp "$BACKUP_DIR/uploads-$DATE.tar.gz" s3://insertflow-backups/uploads/
```

**Cron:**
```
0 3 * * * /scripts/backup-uploads.sh
```

### 6.4 Monitoramento e Logging

**Pesquisa realizada:**
- "Node.js application monitoring logging Sentry Pino 2024"

**Recursos Encontrados:**
- "Pino Integration" (Sentry Docs)
- "A Complete Guide to Pino Logging in Node.js" (Better Stack)
- "Pino Logger: Complete Node.js Guide" (SigNoz)
- GitHub: pinojs/pino (14k+ stars)

#### Logging com Pino

**Características:**
- Muito rápido (5x+ que Winston)
- JSON estruturado
- Níveis de log
- Child loggers (contexto)
- Integração com Sentry

**Setup:**
```javascript
// lib/logger.ts
import pino from 'pino';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => ({ level: label })
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  ...(process.env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { colorize: true }
    }
  })
});

// Uso
logger.info({ userId: '123' }, 'User logged in');
logger.error({ err, jobId }, 'Generation failed');
```

**Níveis:**
- `trace`: debug detalhado
- `debug`: informações de debug
- `info`: eventos normais
- `warn`: avisos
- `error`: erros recuperáveis
- `fatal`: erros críticos

**Child Loggers (contexto):**
```javascript
const requestLogger = logger.child({ 
  requestId: req.id,
  userId: req.user.id 
});

requestLogger.info('Processing request');
// Output: { requestId: 'abc', userId: '123', msg: 'Processing request' }
```

#### Error Tracking com Sentry

**Características:**
- Captura erros automaticamente
- Stack traces
- Breadcrumbs (histórico)
- Release tracking
- Performance monitoring

**Setup:**
```javascript
// instrumentation.ts (Next.js)
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  integrations: [
    Sentry.pinoIntegration()  // Integração com Pino
  ]
});
```

**Integração Pino + Sentry:**
```javascript
import { logger } from './logger';

// Erros são automaticamente enviados ao Sentry
logger.error({ err }, 'Failed to generate encarte');
```

**Alternativas:**
- LogRocket (session replay)
- Better Stack (logs + uptime)
- Self-hosted: Grafana Loki

#### Métricas e Uptime

**Opções:**

**1. Uptime Monitoring:**
- UptimeRobot (free tier)
- Better Uptime
- Pingdom

**2. Application Metrics:**
- Prometheus + Grafana (self-hosted)
- Datadog (pago)
- New Relic (pago)

**MVP:** Sentry (errors) + UptimeRobot (uptime) + Pino (logs)

---

## 7. Mapeamento de Arquivos

### 7.1 Estrutura Completa do Projeto

```
insertflow/
├── apps/
│   ├── web/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── register/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── templates/
│   │   │   │   ├── products/
│   │   │   │   ├── images/
│   │   │   │   └── generation/
│   │   │   ├── admin/
│   │   │   │   ├── organizations/
│   │   │   │   └── users/
│   │   │   ├── api/
│   │   │   │   ├── auth/
│   │   │   │   ├── templates/
│   │   │   │   ├── products/
│   │   │   │   ├── images/
│   │   │   │   └── generation/
│   │   │   └── layout.tsx
│   │   ├── public/
│   │   ├── instrumentation.ts
│   │   ├── middleware.ts
│   │   ├── next.config.js
│   │   └── package.json
│   └── workers/
│       ├── src/
│       │   ├── generation.worker.ts
│       │   └── index.ts
│       ├── Dockerfile
│       └── package.json
├── packages/
│   ├── database/
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   └── seed.ts
│   │   ├── src/
│   │   │   └── index.ts
│   │   └── package.json
│   ├── ui/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── package.json
│   ├── config/
│   │   ├── eslint/
│   │   ├── typescript/
│   │   └── package.json
│   └── lib/
│       ├── logger.ts
│       ├── storage/
│       ├── queue/
│       └── package.json
├── docker/
│   ├── Dockerfile.web
│   ├── Dockerfile.worker
│   └── docker-compose.yml
├── scripts/
│   ├── backup-db.sh
│   ├── backup-uploads.sh
│   └── seed-data.sh
├── .github/
│   └── workflows/
│       ├── ci.yml
│       └── deploy.yml
├── docs/
│   ├── agents/
│   ├── history/
│   └── deployment.md
├── .env.example
├── .gitignore
├── turbo.json
├── package.json
└── README.md
```

### 7.2 Variáveis de Ambiente

```bash
# .env.example

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/insertflow"

# Redis
REDIS_URL="redis://localhost:6379"

# Auth
NEXTAUTH_URL="https://insertflow.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Storage (escolher uma)
STORAGE_TYPE="local" # ou "r2" ou "minio"

# Se R2
R2_ACCOUNT_ID="your-account-id"
R2_ACCESS_KEY="your-access-key"
R2_SECRET_KEY="your-secret-key"
R2_BUCKET="insertflow-images"

# Se MinIO
MINIO_ENDPOINT="http://minio:9000"
MINIO_ACCESS_KEY="minioadmin"
MINIO_SECRET_KEY="minioadmin"
MINIO_BUCKET="insertflow"

# OpenAI (Match Inteligente de Imagens)
OPENAI_API_KEY="sk-..."

# Sentry
SENTRY_DSN="https://xxx@sentry.io/xxx"

# App
NODE_ENV="production"
LOG_LEVEL="info"
```

### 7.3 Docker Compose (Desenvolvimento)

```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: insertflow
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data

  web:
    build:
      context: .
      dockerfile: docker/Dockerfile.web
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/insertflow
      REDIS_URL: redis://redis:6379
      NEXTAUTH_SECRET: dev-secret-change-in-prod
      STORAGE_TYPE: local
    volumes:
      - ./apps/web:/app
      - uploads:/app/uploads
    depends_on:
      - postgres
      - redis

  worker:
    build:
      context: .
      dockerfile: docker/Dockerfile.worker
    environment:
      DATABASE_URL: postgresql://postgres:postgres@postgres:5432/insertflow
      REDIS_URL: redis://redis:6379
    volumes:
      - uploads:/app/uploads
    depends_on:
      - postgres
      - redis

volumes:
  postgres-data:
  redis-data:
  uploads:
```

---

## 8. Pontos de Atenção para o SPEC

### 8.1 Decisões Técnicas Principais

**1. Estrutura do Projeto:**

**Recomendação: Monorepo com Turborepo**
- Melhor organização
- Compartilhamento de código
- Build otimizado
- Escalável

**Alternativa:** Projeto único (mais simples para MVP)

**2. Deploy:**

**Recomendação para MVP: Nixpacks no Easypanel**
- Mais rápido para começar
- Menos configuração
- Build automático

**Migração futura:** Dockerfile customizado (mais controle)

**3. Monitoramento:**

**Recomendação: Sentry + Pino + UptimeRobot**
- Sentry: errors e performance
- Pino: logs estruturados
- UptimeRobot: uptime monitoring (free)

**4. Backup:**

**Recomendação:**
- PostgreSQL: Template Easypanel → S3 (diário)
- Uploads: Script cron → S3 (diário)
- Retenção: 30 dias (DB), 90 dias (uploads)

### 8.2 CI/CD

**GitHub Actions (Recomendado):**

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:16
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      
      - run: npm ci
      
      - run: npm run build
      
      - run: npm run test
      
      - run: npm run lint
```

**Deploy Automático:**
```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Deploy to Easypanel
        env:
          EASYPANEL_TOKEN: ${{ secrets.EASYPANEL_TOKEN }}
        run: |
          # Trigger deploy via Easypanel API
          curl -X POST https://easypanel.io/api/deploy \
            -H "Authorization: Bearer $EASYPANEL_TOKEN" \
            -d '{"project": "insertflow"}'
```

### 8.3 Segurança

**Checklist:**
- [ ] HTTPS/SSL obrigatório
- [ ] Secrets em variáveis de ambiente (nunca no código)
- [ ] Rate limiting (API routes)
- [ ] CORS configurado
- [ ] Headers de segurança (helmet)
- [ ] Sanitização de inputs
- [ ] SQL injection protection (Prisma)
- [ ] XSS protection
- [ ] CSRF tokens (NextAuth)

**Exemplo (middleware):**
```javascript
// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  // Security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  return response;
}
```

### 8.4 Performance

**Otimizações:**
- Next.js Image Optimization
- Static Generation onde possível
- API Route caching (Redis)
- Database indexes (Prisma)
- Connection pooling (Prisma)
- CDN para assets estáticos

**Exemplo (caching):**
```javascript
// app/api/templates/route.ts
import { redis } from '@/lib/redis';

export async function GET(req: Request) {
  const cacheKey = 'templates:list';
  
  // Try cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return Response.json(JSON.parse(cached));
  }
  
  // Fetch from DB
  const templates = await prisma.template.findMany();
  
  // Cache for 5 minutes
  await redis.setex(cacheKey, 300, JSON.stringify(templates));
  
  return Response.json(templates);
}
```

### 8.5 Estimativa de Custos

**VPS (Easypanel):**
- 4GB RAM, 2 CPU: ~$20-40/mês
- 8GB RAM, 4 CPU: ~$40-80/mês

**Storage (se usar R2):**
- 50GB: ~$0.75/mês
- 100GB: ~$1.50/mês
- Egress: $0 (FREE)

**Serviços:**
- Sentry: Free tier (5k errors/mês)
- UptimeRobot: Free tier (50 monitors)

**Total MVP:** ~$25-50/mês

---

## 9. Dependências entre Componentes

```
Infraestrutura
  ├── Easypanel (orquestração)
  ├── Docker (containerização)
  ├── PostgreSQL (dados)
  ├── Redis (cache + queue)
  ├── Next.js App (frontend + API)
  ├── BullMQ Workers (background jobs)
  ├── Sentry (monitoring)
  ├── Pino (logging)
  └── Backup Scripts (S3)
```

---

## 10. Riscos e Mitigações

### Risco 1: Downtime Durante Deploy
**Mitigação:** 
- Blue-green deployment (Easypanel suporta)
- Health checks antes de trocar
- Rollback automático se falhar

### Risco 2: Perda de Dados
**Mitigação:**
- Backups diários automáticos
- Retenção de 30+ dias
- Testes de restore mensais

### Risco 3: Storage Cheio
**Mitigação:**
- Monitorar uso de disco
- Alertas em 80%
- Política de limpeza de arquivos antigos

### Risco 4: Performance Degradada
**Mitigação:**
- Monitoramento com Sentry
- Alertas de latência
- Scaling vertical (upgrade VPS)

---

## 11. Checklist de Deploy

**Pré-Deploy:**
- [ ] Variáveis de ambiente configuradas
- [ ] Secrets gerados (NEXTAUTH_SECRET)
- [ ] Database migrations rodadas
- [ ] Seed data (se necessário)
- [ ] SSL/TLS configurado
- [ ] Domínio apontado

**Pós-Deploy:**
- [ ] Health check passou
- [ ] Logs sem erros críticos
- [ ] Sentry recebendo eventos
- [ ] Backup automático funcionando
- [ ] Uptime monitor ativo
- [ ] Documentação atualizada

---

## 12. Documentação Recomendada

**README.md:**
- Setup local
- Variáveis de ambiente
- Como rodar testes
- Como fazer deploy

**docs/deployment.md:**
- Processo de deploy
- Rollback
- Troubleshooting
- Backup/Restore

**docs/architecture.md:**
- Diagrama de arquitetura
- Fluxo de dados
- Decisões técnicas

---

## RESUMO FINAL

**Stack Completa:**
- **Frontend:** Next.js 14+ (App Router)
- **Backend:** Next.js API Routes + Node.js Workers
- **Database:** PostgreSQL + Prisma
- **Cache/Queue:** Redis + BullMQ
- **Storage:** Filesystem → Cloudflare R2 (futuro)
- **Deploy:** Easypanel (Docker)
- **Monitoring:** Sentry + Pino + UptimeRobot
- **CI/CD:** GitHub Actions

**Fases de Implementação:**
1. **Setup Infra** (1 semana): Monorepo, Docker, Easypanel
2. **Core** (2-3 semanas): Auth, Multi-tenancy, CRUD
3. **Editor** (3-4 semanas): Template editor visual
4. **Generation** (2-3 semanas): Engine de geração PNG
5. **Images** (1-2 semanas): Upload e gestão
6. **Polish** (1-2 semanas): Testes, docs, deploy

**Total:** 10-15 semanas para MVP completo

---

## FIM DOS TEMP_PRDs

Todos os 5 documentos foram gerados com pesquisa completa:
- ✅ TEMP_PRD_01_CORE.md - Arquitetura base e multi-tenancy
- ✅ TEMP_PRD_02_EDITOR.md - Sistema de editor de templates
- ✅ TEMP_PRD_03_GENERATION.md - Engine de geração de encartes
- ✅ TEMP_PRD_04_IMAGES.md - Sistema de gestão de imagens
- ✅ TEMP_PRD_05_INFRA.md - Deploy e infraestrutura

**Próximo passo:** Agente SPEC usa estes documentos para criar especificação técnica detalhada e plano de implementação.
