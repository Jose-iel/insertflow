# Deployment Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- PostgreSQL 16
- Redis 7

## Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# Database
DATABASE_URL="postgresql://user:pass@host:5432/insertflow"

# Redis
REDIS_URL="redis://host:6379"

# Auth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Storage
STORAGE_TYPE="local" # or "r2"

# OpenAI
OPENAI_API_KEY="sk-..."

# Sentry
SENTRY_DSN="https://..."
```

## Local Development

1. Start services:
   ```bash
   docker-compose up -d
   ```

2. Run migrations:
   ```bash
   npm run db:push
   npm run db:seed
   ```

3. Start dev server:
   ```bash
   npm run dev
   ```

## Production Deployment (Easypanel)

Para deploy em produção no Easypanel, siga o guia detalhado:

📖 **[EASYPANEL_SETUP.md](../EASYPANEL_SETUP.md)** - Guia completo passo a passo

### Resumo do Processo:

1. **Gerar secrets** (NEXTAUTH_SECRET, POSTGRES_PASSWORD)
2. **Criar projeto** no Easypanel
3. **Adicionar serviços:**
   - PostgreSQL (banco de dados)
   - Redis (cache e filas)
   - Web (aplicação Next.js)
   - Worker (processamento de jobs)
4. **Configurar variáveis de ambiente** em cada serviço
5. **Fazer deploy** (build automático do GitHub)
6. **Executar migrations** via console
7. **Verificar** health check e acesso

**Tempo estimado:** 30-45 minutos

**⚠️ Importante:** O Easypanel não suporta importação direta de docker-compose.yml. Cada serviço deve ser criado manualmente pela interface.

## Backup & Restore

### Backup Database
```bash
./scripts/backup-db.sh
```

### Backup Uploads
```bash
./scripts/backup-uploads.sh
```

### Restore Database
```bash
./scripts/restore-db.sh /backups/postgres/insertflow_20240225.sql.gz
```

## Monitoring

- **Sentry:** Error tracking and performance monitoring
- **Logs:** Pino structured logs (JSON format)
- **Health Check:** `GET /api/health`

## Troubleshooting

### Database Connection Issues
- Check DATABASE_URL
- Verify PostgreSQL is running
- Check network connectivity

### Redis Connection Issues
- Check REDIS_URL
- Verify Redis is running

### Generation Failures
- Check worker logs
- Verify Puppeteer dependencies installed
- Check storage permissions
