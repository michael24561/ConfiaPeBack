# Deploy Backend en Vercel (CON LIMITACIONES)

⚠️ **ADVERTENCIA:** El chat en tiempo real (Socket.IO) **NO funcionará** en Vercel.

---

## ✅ Archivos Necesarios (Ya creados)

- [x] `vercel.json` - Configuración de Vercel
- [x] `package.json` - Con scripts de build
- [x] `.gitignore` - Para excluir node_modules, .env

---

## 🚀 Pasos para Desplegar

### 1. Preparar Base de Datos PostgreSQL

Vercel NO incluye base de datos. Necesitas una externa:

**Opción A: Neon (Recomendado)**
```bash
1. Ir a neon.tech
2. Crear cuenta gratuita
3. Crear nuevo proyecto
4. Copiar DATABASE_URL
```

**Opción B: Supabase**
```bash
1. Ir a supabase.com
2. New project
3. Settings → Database → Connection String
4. Copiar URI de PostgreSQL
```

### 2. Configurar Cloudinary

```bash
1. Ir a cloudinary.com
2. Dashboard → Account Details
3. Copiar:
   - Cloud Name
   - API Key
   - API Secret
```

### 3. Deploy en Vercel Web

```bash
# Paso 1: Ir a vercel.com
1. Login con GitHub

# Paso 2: Import Project
2. Click "Add New..." → "Project"
3. Import Git Repository
4. Seleccionar tu repo Backend

# Paso 3: Configurar Build
Root Directory: ./
Framework Preset: Other
Build Command: pnpm build
Output Directory: dist
Install Command: pnpm install

# Paso 4: Variables de Entorno
Click "Environment Variables"
Agregar todas las variables:
```

### Variables de Entorno Obligatorias

```env
# Database
DATABASE_URL=postgresql://user:pass@host/db

# JWT (CAMBIAR EN PRODUCCIÓN)
JWT_SECRET=tu-secret-super-seguro-aleatorio-de-al-menos-32-caracteres
JWT_REFRESH_SECRET=otro-secret-diferente-super-seguro-aleatorio
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu-cloud-name
CLOUDINARY_API_KEY=tu-api-key
CLOUDINARY_API_SECRET=tu-api-secret

# Frontend (tu URL de frontend en Vercel)
FRONTEND_URL=https://tu-frontend.vercel.app

# Server
NODE_ENV=production
PORT=5000
```

### 4. Deploy

```bash
1. Click "Deploy"
2. Esperar build (~2-3 min)
3. Obtener URL: https://tu-proyecto.vercel.app
```

### 5. Ejecutar Migraciones

```bash
# IMPORTANTE: Después del primer deploy
# En tu terminal local:

DATABASE_URL="tu-database-url-de-produccion" pnpm prisma db push

# O desde Vercel CLI:
vercel env pull .env.production
pnpm prisma db push
```

---

## ⚠️ LIMITACIONES EN VERCEL

### ❌ NO Funcionará:
- **Chat en tiempo real** (Socket.IO)
- **WebSocket** - Vercel no soporta conexiones persistentes
- Requests largas (>10s en free, >60s en pro)

### ✅ SÍ Funcionará:
- Autenticación JWT
- CRUD de técnicos
- CRUD de trabajos
- Reviews
- Dashboard
- Upload de archivos
- Todos los endpoints REST

### 🔧 Solución para Chat:
Si necesitas chat, tendrías que:
1. Desplegar backend en Railway/Render
2. O crear servicio separado solo para Socket.IO

---

## 🔄 Actualizar Deployment

```bash
# Automático:
git push origin main  # Vercel detecta y redeploy automático

# Manual:
vercel --prod
```

---

## 🐛 Troubleshooting

### Error: "Module not found"
```bash
# Asegúrate que package.json tenga:
"engines": {
  "node": ">=20.0.0"
}
```

### Error: "Database connection failed"
```bash
# Verifica DATABASE_URL en Vercel dashboard
# Settings → Environment Variables
# Debe tener formato: postgresql://...
```

### Error: "Prisma Client not initialized"
```bash
# Asegúrate que package.json tenga:
"scripts": {
  "postinstall": "prisma generate",
  "build": "tsc && prisma generate"
}
```

### Error: 500 Internal Server Error
```bash
# Ver logs:
vercel logs <deployment-url>
```

---

## 📊 Verificar Deploy

```bash
# Health check
curl https://tu-proyecto.vercel.app/health

# API docs
https://tu-proyecto.vercel.app/api-docs

# Test endpoint
curl https://tu-proyecto.vercel.app/api/tecnicos
```

---

## 💡 RECOMENDACIÓN FINAL

**Para PRODUCCIÓN REAL, usa Railway:**

1. **Más barato** - $5 gratis/mes vs Vercel serverless
2. **Socket.IO funciona** - Chat en tiempo real
3. **PostgreSQL incluido** - No necesitas servicio externo
4. **Sin límites de ejecución** - Requests pueden durar lo que sea
5. **Deploy igual de fácil** - Conecta GitHub y listo

### Railway Quick Start:
```bash
1. railway.app
2. New Project → Deploy from GitHub
3. Seleccionar repo
4. Add service → PostgreSQL
5. Variables de entorno automáticas
6. Deploy ✅
```

---

## 📝 Checklist Pre-Deploy

- [ ] Base de datos PostgreSQL externa lista
- [ ] Cloudinary configurado
- [ ] Variables de entorno preparadas
- [ ] JWT secrets generados (aleatorios y seguros)
- [ ] Frontend URL conocida
- [ ] `.gitignore` incluye `.env`
- [ ] `vercel.json` en raíz
- [ ] `package.json` con scripts correctos

---

**Deploy completado en Vercel, pero recuerda: chat NO funciona.**  
**Para chat, necesitas Railway o Render.**
