# DEPLOY NOW — onera-operator frontend en lanzalo.pro

## Estado
✅ Build estático completo (2.8MB, 14 páginas)
✅ Clerk eliminado (rutas auth simplificiadas)
✅ `output: export` configurado en next.config.ts
✅ Todas las rutas dinámicas resueltas

---

## OPCIÓN A: Deploy con Vercel CLI (5 minutos)

Ejecuta desde la carpeta raíz del repo:

```bash
# 1. Instala dependencias
cd packages/frontend
pnpm install

# 2. Build (ya hecho, pero por si acaso)
pnpm build

# 3. Deploy con tu token de Vercel
cd out
npx vercel deploy --token=TU_VERCEL_TOKEN --prod

# 4. Asigna el dominio lanzalo.pro al nuevo proyecto
npx vercel domains add lanzalo.pro --token=TU_VERCEL_TOKEN
```

---

## OPCIÓN B: Deploy via Vercel Dashboard (sin CLI)

1. Ve a **vercel.com/dashboard**
2. Click **Add New Project**
3. Importa el repo `javiConsu/onera-operator`
4. Configura:
   - **Root Directory**: `packages/frontend`
   - **Framework Preset**: Next.js
   - **Build Command**: `pnpm build`
   - **Output Directory**: `out`
5. Haz click en **Deploy**
6. Cuando termine, ve a **Settings → Domains**
7. Añade `lanzalo.pro` y elimínalo del proyecto antiguo (lanzalo)

---

## Variables de entorno requeridas

Para el demo SIN backend (solo diseño visual):
```
NEXT_PUBLIC_BACKEND_URL=https://lanzalo-production.up.railway.app
```

Sin esto, los API calls fallan silenciosamente pero la UI se muestra igualmente.

---

## Cambios en el repo que necesitas hacer commit+push

```bash
cd /ruta/al/repo/onera-operator

# Stage los cambios
git add packages/frontend/src/app/login/page.tsx
git add packages/frontend/src/app/sign-in/page.tsx
git add packages/frontend/src/app/sign-up/page.tsx
git add packages/frontend/src/app/projects/[id]/page.tsx
git add packages/frontend/vercel.json
git rm packages/frontend/src/app/login/'[[...sign-in]]'/page.tsx
git rm packages/frontend/src/app/sign-in/'[[...sign-in]]'/page.tsx
git rm packages/frontend/src/app/sign-up/'[[...sign-up]]'/page.tsx

# Commit
git commit -m "fix: static export - remove catch-all auth routes, add vercel.json"

# Push
git push origin main
```

Vercel detectará el push y desplegará automáticamente (si tienes CI/CD configurado).

---

## Resultado esperado

- `/home` → Landing page con diseño blueprint
- `/dashboard` → Dashboard 5 columnas (Company/Tasks/Social/Engineering/Reports)
- `/live` → Live feed
- `/login`, `/sign-in`, `/sign-up` → Redirigen a `/home`
- API calls fallan silenciosamente (sin backend) — UI funciona igual
