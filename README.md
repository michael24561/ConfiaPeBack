# ConfiaPE Backend API

API RESTful para plataforma de contratación de técnicos profesionales en Perú.

![Node.js](https://img.shields.io/badge/Node.js-v20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![Express](https://img.shields.io/badge/Express-4.x-black)
![Prisma](https://img.shields.io/badge/Prisma-5.x-teal)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)

---

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [Desarrollo](#-desarrollo)
- [Testing](#-testing)
- [Documentación API](#-documentación-api)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Scripts Disponibles](#-scripts-disponibles)
- [Despliegue](#-despliegue)

---

## ✨ Características

### Módulos Implementados
- ✅ **Autenticación** - JWT con refresh tokens, OAuth Google
- ✅ **Técnicos** - Perfiles, servicios, certificados, galería
- ✅ **Trabajos** - CRUD completo con estados y workflow
- ✅ **Reviews** - Sistema de calificaciones 1-5 estrellas
- ✅ **Chat** - Mensajería en tiempo real con Socket.IO
- ✅ **Dashboard** - Estadísticas y métricas para técnicos
- ✅ **Notificaciones** - Sistema automático de notificaciones

### Seguridad
- 🔒 Helmet.js para headers HTTP seguros
- 🔒 CORS configurado
- 🔒 Rate limiting (100 req/15min general, 5 req/15min auth)
- 🔒 Validación con Zod en todos los endpoints
- 🔒 JWT con tokens de acceso y refresh
- 🔒 Hash de contraseñas con bcrypt (10 rounds)

### Características Técnicas
- ⚡ TypeScript estricto con tipos completos
- ⚡ WebSocket para chat en tiempo real
- ⚡ Upload de archivos con Multer + Cloudinary
- ⚡ Paginación en listados
- ⚡ Manejo centralizado de errores
- ⚡ Logging estructurado
- ⚡ Documentación Swagger/OpenAPI 3.0

---

## 🛠 Tecnologías

### Core
- **Node.js** v20+ - Runtime
- **TypeScript** 5.x - Lenguaje
- **Express** 4.x - Framework web
- **Prisma** 5.x - ORM
- **PostgreSQL** 15+ - Base de datos

### Librerías Principales
- **jsonwebtoken** - Autenticación JWT
- **bcryptjs** - Hash de contraseñas
- **zod** - Validación de esquemas
- **socket.io** - WebSocket para chat
- **cloudinary** - Almacenamiento de imágenes
- **multer** - Upload de archivos
- **helmet** - Seguridad HTTP
- **cors** - Cross-Origin Resource Sharing
- **express-rate-limit** - Rate limiting
- **winston** - Logging

---

## 🚀 Instalación

### Requisitos Previos
- Node.js v20 o superior
- pnpm 8+ (o npm/yarn)
- PostgreSQL 15+
- Cuenta de Cloudinary (para imágenes)

### Pasos

```bash
# 1. Clonar repositorio
git clone <repo-url>
cd Backend

# 2. Instalar dependencias
pnpm install

# 3. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales

# 4. Generar cliente Prisma
pnpm prisma generate

# 5. Ejecutar migraciones
pnpm prisma db push

# 6. (Opcional) Seed de datos iniciales
pnpm prisma db seed
```

---

## ⚙️ Configuración

### Variables de Entorno

Crea un archivo `.env` en la raíz del Backend:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/confiape"

# JWT
JWT_SECRET="tu-secret-super-seguro-cambialo-en-produccion"
JWT_REFRESH_SECRET="tu-refresh-secret-super-seguro"
JWT_ACCESS_EXPIRY="15m"
JWT_REFRESH_EXPIRY="7d"

# Cloudinary
CLOUDINARY_CLOUD_NAME="tu-cloud-name"
CLOUDINARY_API_KEY="tu-api-key"
CLOUDINARY_API_SECRET="tu-api-secret"

# Google OAuth (opcional)
GOOGLE_CLIENT_ID="tu-google-client-id"
GOOGLE_CLIENT_SECRET="tu-google-client-secret"

# Frontend URL (para CORS)
FRONTEND_URL="http://localhost:3000"

# Server
PORT=5000
NODE_ENV="development"
```

### Base de Datos

```bash
# Crear base de datos PostgreSQL
createdb confiape

# O con psql
psql -U postgres
CREATE DATABASE confiape;
\q

# Ejecutar migraciones
pnpm prisma db push

# Ver base de datos en Prisma Studio
pnpm prisma studio
```

---

## 💻 Desarrollo

### Iniciar Servidor

```bash
# Modo desarrollo (con hot-reload)
pnpm dev

# Modo producción
pnpm build
pnpm start
```

El servidor iniciará en `http://localhost:5000`

### Endpoints Principales

- `http://localhost:5000/health` - Health check
- `http://localhost:5000/api-docs` - Documentación Swagger
- `http://localhost:5000/api/auth/*` - Autenticación
- `http://localhost:5000/api/tecnicos/*` - Técnicos
- `http://localhost:5000/api/trabajos/*` - Trabajos

---

## 🧪 Testing

### Pruebas Manuales

```bash
# Health check
curl http://localhost:5000/health

# Ejecutar suite de pruebas
./test-endpoints.sh

# O pruebas individuales (ver TESTING.md)
curl http://localhost:5000/api/tecnicos
```

### Documentación de Pruebas

Consulta [`TESTING.md`](./TESTING.md) para:
- Suite completa de pruebas con curl
- Ejemplos por módulo
- Casos de error
- Autenticación y tokens

---

## 📚 Documentación API

### Swagger UI (Recomendado)

```bash
# 1. Iniciar servidor
pnpm dev

# 2. Abrir en navegador
http://localhost:5000/api-docs
```

**Características de Swagger:**
- ✅ Interfaz interactiva
- ✅ Pruebas directas desde el navegador
- ✅ Ejemplos completos de request/response
- ✅ Autenticación JWT integrada
- ✅ 50+ endpoints documentados

### Documentación Adicional

- [`docs/README.md`](./docs/README.md) - Guía completa de endpoints
- [`docs/swagger.json`](./docs/swagger.json) - Especificación OpenAPI 3.0
- [`MICHAEL_ABRAZO.md`](./MICHAEL_ABRAZO.md) - Guía de integración frontend

---

## 📁 Estructura del Proyecto

```
Backend/
├── docs/                    # Documentación
│   ├── swagger.json        # Spec OpenAPI
│   └── README.md           # Guía de endpoints
├── prisma/
│   ├── schema.prisma       # Schema de base de datos
│   └── migrations/         # Migraciones
├── src/
│   ├── config/             # Configuraciones
│   │   ├── database.ts     # Prisma client
│   │   ├── jwt.ts          # JWT config
│   │   ├── cloudinary.ts   # Cloudinary setup
│   │   ├── logger.ts       # Winston logger
│   │   └── swagger.ts      # Swagger setup
│   ├── controllers/        # Controladores (6)
│   │   ├── auth.controller.ts
│   │   ├── tecnico.controller.ts
│   │   ├── trabajo.controller.ts
│   │   ├── review.controller.ts
│   │   ├── chat.controller.ts
│   │   └── dashboard.controller.ts
│   ├── services/           # Lógica de negocio (6)
│   │   ├── auth.service.ts
│   │   ├── tecnico.service.ts
│   │   ├── trabajo.service.ts
│   │   ├── review.service.ts
│   │   ├── chat.service.ts
│   │   └── dashboard.service.ts
│   ├── routes/             # Rutas (6)
│   │   ├── auth.routes.ts
│   │   ├── tecnico.routes.ts
│   │   ├── trabajo.routes.ts
│   │   ├── review.routes.ts
│   │   ├── chat.routes.ts
│   │   └── dashboard.routes.ts
│   ├── middlewares/        # Middlewares
│   │   ├── auth.middleware.ts       # JWT verification
│   │   ├── validation.middleware.ts # Zod validation
│   │   ├── error.middleware.ts      # Error handling
│   │   ├── rateLimit.middleware.ts  # Rate limiting
│   │   └── upload.middleware.ts     # Multer config
│   ├── validators/         # Schemas Zod (6)
│   │   ├── auth.validator.ts
│   │   ├── tecnico.validator.ts
│   │   ├── trabajo.validator.ts
│   │   ├── review.validator.ts
│   │   ├── chat.validator.ts
│   │   └── dashboard.validator.ts
│   ├── utils/              # Utilidades
│   │   ├── ApiError.ts     # Clase de error
│   │   └── response.ts     # Response helpers
│   ├── types/              # Tipos TypeScript
│   │   └── express.d.ts    # Extensiones de Express
│   ├── app.ts              # Express app
│   └── index.ts            # Entry point
├── .env                    # Variables de entorno (gitignored)
├── .env.example            # Template de variables
├── .gitignore
├── package.json
├── tsconfig.json
├── test-endpoints.sh       # Script de pruebas
├── TESTING.md             # Guía de testing
├── MICHAEL_ABRAZO.md      # Guía frontend
└── README.md              # Este archivo
```

---

## 📜 Scripts Disponibles

```bash
# Desarrollo
pnpm dev              # Inicia servidor con hot-reload
pnpm build            # Compila TypeScript a JavaScript
pnpm start            # Inicia servidor compilado

# Base de datos
pnpm prisma:generate  # Genera cliente Prisma
pnpm prisma:push      # Aplica cambios al schema
pnpm prisma:studio    # Abre Prisma Studio
pnpm prisma:migrate   # Crea y aplica migración
pnpm prisma:seed      # Seed de datos

# Utilidades
pnpm lint             # ESLint
pnpm format           # Prettier
pnpm type-check       # Verificar tipos TypeScript

# Testing
./test-endpoints.sh   # Suite de pruebas curl
```

---

## 🚢 Despliegue

### Producción

1. **Configurar variables de entorno**
   ```bash
   NODE_ENV=production
   DATABASE_URL=<postgres-url-produccion>
   JWT_SECRET=<secret-seguro-aleatorio>
   FRONTEND_URL=<url-frontend-produccion>
   ```

2. **Build del proyecto**
   ```bash
   pnpm build
   ```

3. **Ejecutar migraciones**
   ```bash
   pnpm prisma migrate deploy
   ```

4. **Iniciar servidor**
   ```bash
   pnpm start
   ```

### Opciones de Hosting

- **Railway** - Recomendado, fácil setup
- **Render** - Free tier disponible
- **Heroku** - Con PostgreSQL addon
- **DigitalOcean App Platform**
- **AWS EC2 + RDS**
- **Google Cloud Run**

### Docker (Opcional)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
EXPOSE 5000
CMD ["npm", "start"]
```

---

## 🔐 Seguridad

### Buenas Prácticas Implementadas

- ✅ Variables sensibles en `.env` (no en código)
- ✅ Secrets aleatorios y complejos para JWT
- ✅ HTTPS en producción
- ✅ Rate limiting contra fuerza bruta
- ✅ Validación estricta de entrada (Zod)
- ✅ Sanitización de datos
- ✅ Headers de seguridad (Helmet)
- ✅ CORS configurado correctamente
- ✅ Hash de contraseñas (bcrypt)
- ✅ Tokens con expiración corta

### Recomendaciones Adicionales

- Rotación regular de secrets
- Backups automáticos de DB
- Monitoring y alertas
- Logs centralizados
- WAF en producción

---

## 🤝 Contribución

### Workflow

1. Fork del repositorio
2. Crear branch: `git checkout -b feature/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'Add: nueva funcionalidad'`
4. Push: `git push origin feature/nueva-funcionalidad`
5. Crear Pull Request

### Estándares de Código

- TypeScript estricto
- ESLint + Prettier
- Nombres descriptivos
- Comentarios en funciones complejas
- Tests para features nuevas

---

## 📞 Soporte

### Documentación

- [`TESTING.md`](./TESTING.md) - Guía de pruebas
- [`docs/README.md`](./docs/README.md) - API Reference
- [`MICHAEL_ABRAZO.md`](./MICHAEL_ABRAZO.md) - Integración frontend
- [Swagger UI](http://localhost:5000/api-docs) - Documentación interactiva

### Contacto

- Email: soporte@confiape.com
- Issues: [GitHub Issues](https://github.com/confiape/backend/issues)

---

## 📄 Licencia

MIT License - ver [LICENSE](./LICENSE) para más detalles.

---

## 🎯 Estado del Proyecto

**Versión:** 1.0.0  
**Estado:** ✅ Producción Ready  
**Última actualización:** Enero 2025

### Features Completadas
- ✅ Autenticación completa
- ✅ 6 módulos principales
- ✅ 50+ endpoints
- ✅ Documentación Swagger
- ✅ WebSocket chat
- ✅ Upload de archivos
- ✅ Sistema de notificaciones

### Roadmap Futuro
- 🔄 Notificaciones push móvil
- 🔄 Favoritos y búsquedas guardadas
- 🔄 Sistema de pagos integrado
- 🔄 Analytics avanzado
- 🔄 Tests unitarios y e2e

---

**Desarrollado con ❤️ para ConfiaPE**
