# DEPLOY PULSA — Guía Completa Vercel + Railway

**Estado del código:** ✅ Listo para deploy (commit: `feat: rebrand Pulsa + demo mode + deploy config`)
**Dominio:** `pulsa.pro`
**Actualizado:** 2026-03-15 por Alex (LAN-99)

---

## PASO 0: Push del código a GitHub

**Javi, ejecuta esto en tu máquina con acceso a GitHub:**

```bash
# Clona el repo en tu máquina (si no lo tienes)
git clone https://github.com/javiConsu/onera-operator.git
cd onera-operator

# Añade el remote del código con los cambios de Pulsa
git remote add pulsa /tmp/onera-operator  # si tienes acceso al servidor
# O: copia los archivos manualmente y haz commit+push desde tu máquina

# Push
git push origin main
```

*(Si el servidor tiene acceso a internet con credenciales, ejecuta en el servidor:)*
```bash
cd /tmp/onera-operator
git push https://TU_GITHUB_TOKEN@github.com/javiConsu/onera-operator.git main
```

---

## PASO 1: Railway — Backend + PostgreSQL + Redis

**URL:** https://railway.app

### 1.1 Crear proyecto
1. Click **New Project → Deploy from GitHub repo**
2. Selecciona `javiConsu/onera-operator`
3. Railway detecta `railway.json` automáticamente → usa el Dockerfile del backend

### 1.2 Añadir PostgreSQL
1. En el proyecto → **New Service → PostgreSQL**
2. Railway crea la BD y expone `DATABASE_URL` automáticamente

### 1.3 Añadir Redis
1. En el proyecto → **New Service → Redis**
2. Railway expone `REDIS_URL` automáticamente

### 1.4 Variables de entorno del backend (Settings → Variables)
```
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5
AI_API_KEY=YOUR_ANTHROPIC_API_KEY
AI_PREMIUM_MODEL=claude-opus-4-6
AI_PREMIUM_PROVIDER=anthropic
AI_PREMIUM_API_KEY=YOUR_ANTHROPIC_API_KEY
CLERK_SECRET_KEY=YOUR_CLERK_SECRET_KEY
SERPER_API_KEY=YOUR_SERPER_API_KEY
DEMO_MODE=true
FRONTEND_URL=https://pulsa.pro
BACKEND_PORT=3001
NODE_ENV=production
AGENT_LOOP_INTERVAL_CRON=0 */4 * * *
DAILY_REPORT_CRON=0 18 * * *
AZURE_EMAIL_SENDER=hola@pulsa.pro
```
> `DATABASE_URL` y `REDIS_URL` se configuran automáticamente desde los servicios Railway.

### 1.5 Ejecutar migraciones
Railway → backend → **Shell**:
```bash
cd packages/database && npx prisma migrate deploy
```

### 1.6 Anotar URL del backend
Railway te da algo como: `https://TU-APP.up.railway.app` → guárdala para el paso 2.

---

## PASO 2: Vercel — Frontend estático

**URL:** https://vercel.com

### 2.1 Importar repo
1. Click **Add New Project → Import Git Repository**
2. Selecciona `javiConsu/onera-operator`
3. Configuración:
   - **Root Directory:** `packages/frontend`
   - **Framework Preset:** Next.js
   - **Build Command:** `pnpm build`
   - **Output Directory:** `out`

### 2.2 Variables de entorno en Vercel
```
NEXT_PUBLIC_BACKEND_URL=https://TU-APP.up.railway.app   ← URL del paso 1.6
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_bmljZS1vcG9zc3VtLTEzLmNsZXJrLmFjY291bnRzLmRldiQ
```

### 2.3 Deploy + Dominio
1. Click **Deploy**
2. Vercel → Settings → Domains → Añade `pulsa.pro`
3. En tu DNS: CNAME `@` → `cname.vercel-dns.com`

---

## Arquitectura del deploy

```
pulsa.pro (Vercel — static HTML/JS)
    └── llama a → backend.up.railway.app (Fastify)
                      ├── PostgreSQL (Railway)
                      ├── Redis (Railway)
                      └── BullMQ workers (mismo proceso)
```

## QA — Proyectos de test

Una vez desplegado, crear en `pulsa.pro/new`:

1. **AgenciaMarketing MX** — agencia marketing digital México
2. **EcoModa AR** — e-commerce moda sostenible Argentina
3. **Academia Emprendedores ES** — cursos online España

## Checklist de QA

- [ ] `pulsa.pro` carga landing page en español
- [ ] `pulsa.pro/new` → crear empresa funciona
- [ ] Dashboard carga proyectos
- [ ] `pulsa.pro/live` → feed en tiempo real
- [ ] Agentes responden en español

---

*Alex — LAN-99 — 2026-03-15*
