# Documentación API ConfiaPE

## 📚 Swagger UI

La documentación interactiva está disponible en `/api-docs` cuando el servidor está corriendo.

### Instalación de Dependencias

```bash
cd Backend
pnpm add swagger-ui-express
pnpm add -D @types/swagger-ui-express
```

### Acceder a la Documentación

1. Inicia el servidor: `pnpm dev`
2. Abre en tu navegador: `http://localhost:5000/api-docs`

---

## 📋 Módulos Documentados

### 1. **Auth** - Autenticación y Registro
- `POST /api/auth/register/cliente` - Registro de cliente
- `POST /api/auth/register/tecnico` - Registro de técnico (con certificados)
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Perfil actual (requiere auth)
- `POST /api/auth/refresh` - Refrescar token
- `POST /api/auth/google` - Login con Google OAuth

**Total:** 6 endpoints

---

### 2. **Técnicos** - Gestión de Perfiles
- `GET /api/tecnicos` - Lista pública de técnicos (con filtros)
- `GET /api/tecnicos/me` - Mi perfil (técnico auth)
- `PUT /api/tecnicos/me` - Actualizar perfil
- `GET /api/tecnicos/:id` - Ver perfil público
- `POST /api/tecnicos/servicios` - Agregar servicio
- `DELETE /api/tecnicos/servicios/:id` - Eliminar servicio
- `POST /api/tecnicos/certificados` - Subir certificado
- `DELETE /api/tecnicos/certificados/:id` - Eliminar certificado
- `POST /api/tecnicos/galeria` - Subir foto a galería
- `DELETE /api/tecnicos/galeria/:id` - Eliminar foto
- `PUT /api/tecnicos/horarios/:dia` - Configurar horario

**Total:** 11 endpoints

**Filtros disponibles:**
- `categoria` - Filtrar por oficio
- `q` - Búsqueda por nombre
- `calificacionMin` - Calificación mínima (1-5)
- `precioMax` - Precio máximo
- `disponible` - Solo técnicos disponibles (boolean)
- `verificado` - Solo verificados (boolean)
- `orderBy` - Ordenar: relevancia, calificacion, precio, trabajos
- `page` - Número de página
- `limit` - Resultados por página (máx 50)

---

### 3. **Trabajos** - Solicitudes de Servicio
- `POST /api/trabajos` - Crear trabajo (cliente)
- `GET /api/trabajos` - Mis trabajos (según rol)
- `GET /api/trabajos/:id` - Ver trabajo
- `PATCH /api/trabajos/:id/estado` - Cambiar estado (técnico)
- `PUT /api/trabajos/:id` - Actualizar info (técnico)
- `POST /api/trabajos/:id/cancelar` - Cancelar trabajo
- `DELETE /api/trabajos/:id` - Eliminar trabajo (solo admin)

**Total:** 7 endpoints

**Estados de Trabajo:**
1. `PENDIENTE` - Solicitud nueva (cliente crea)
2. `ACEPTADO` - Técnico acepta
3. `EN_PROGRESO` - Técnico inicia
4. `COMPLETADO` - Técnico finaliza
5. `CANCELADO` - Cancelado por cliente/técnico

**Transiciones válidas:**
- PENDIENTE → ACEPTADO (técnico)
- ACEPTADO → EN_PROGRESO (técnico)
- EN_PROGRESO → COMPLETADO (técnico)
- Cualquier estado → CANCELADO

---

### 4. **Reviews** - Sistema de Calificaciones
- `POST /api/reviews` - Crear review (cliente, trabajo completado)
- `GET /api/reviews/tecnico/:tecnicoId` - Reviews de técnico (público)
- `GET /api/reviews/:id` - Ver review
- `POST /api/reviews/:id/responder` - Responder review (técnico)
- `DELETE /api/reviews/:id` - Eliminar review (cliente, sin respuesta)
- `GET /api/reviews/tecnico/:tecnicoId/stats` - Estadísticas

**Total:** 6 endpoints

**Validaciones:**
- Solo clientes pueden calificar
- Solo trabajos COMPLETADOS
- Calificación: 1-5 estrellas
- Comentario mínimo: 10 caracteres
- Técnico puede responder una vez
- Cliente solo puede eliminar si no hay respuesta

---

### 5. **Chat** - Mensajería
- `POST /api/chat/conversations` - Crear conversación (cliente)
- `GET /api/chat/conversations` - Mis conversaciones
- `GET /api/chat/conversations/:id` - Ver conversación
- `GET /api/chat/conversations/:id/messages` - Mensajes (paginado)
- `POST /api/messages` - Enviar mensaje
- `PATCH /api/messages/:id/read` - Marcar como leído

**Total:** 6 endpoints

**WebSocket:**
- Evento `message:new` - Nuevo mensaje recibido
- Evento `message:read` - Mensaje leído

---

### 6. **Dashboard** - Métricas del Técnico
- `GET /api/dashboard/stats` - Estadísticas generales
- `GET /api/dashboard/ingresos` - Ingresos (con gráficos)
- `GET /api/dashboard/clientes` - Lista de clientes
- `GET /api/dashboard/rendimiento` - Métricas de performance

**Total:** 4 endpoints

**Solo técnicos** pueden acceder a estos endpoints.

---

## 🔐 Autenticación

Todos los endpoints protegidos requieren JWT en el header:

```
Authorization: Bearer {access_token}
```

### Obtener Token

1. Registrarse: `POST /api/auth/register/cliente` o `/register/tecnico`
2. Login: `POST /api/auth/login`
3. Respuesta incluye `accessToken` y `refreshToken`

### Refrescar Token

Cuando el `accessToken` expire (15 minutos por defecto):

```bash
POST /api/auth/refresh
{
  "refreshToken": "tu_refresh_token"
}
```

---

## 📊 Códigos de Respuesta

| Código | Significado |
|--------|-------------|
| 200 | OK - Solicitud exitosa |
| 201 | Created - Recurso creado |
| 400 | Bad Request - Datos inválidos |
| 401 | Unauthorized - No autenticado |
| 403 | Forbidden - Sin permisos |
| 404 | Not Found - Recurso no existe |
| 409 | Conflict - Duplicado (ej: email ya existe) |
| 429 | Too Many Requests - Rate limit excedido |
| 500 | Internal Server Error |

---

## 🎯 Formato de Respuestas

### Éxito
```json
{
  "success": true,
  "data": {
    // datos de respuesta
  }
}
```

### Error
```json
{
  "success": false,
  "error": "Mensaje de error",
  "details": {
    // detalles opcionales
  }
}
```

### Paginación
```json
{
  "success": true,
  "data": {
    "items": [...],
    "pagination": {
      "total": 100,
      "page": 1,
      "limit": 20,
      "totalPages": 5,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

---

## 🔍 Ejemplos por Módulo

### Auth - Registro de Cliente

```bash
curl -X POST http://localhost:5000/api/auth/register/cliente \
  -H "Content-Type: application/json" \
  -d '{
    "nombreCompleto": "Juan Pérez",
    "email": "juan@example.com",
    "password": "Password123!",
    "telefono": "+51987654321"
  }'
```

### Técnicos - Buscar Electricistas

```bash
curl "http://localhost:5000/api/tecnicos?categoria=Electricista&disponible=true&calificacionMin=4"
```

### Trabajos - Crear Solicitud

```bash
curl -X POST http://localhost:5000/api/trabajos \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "tecnicoId": "uuid-del-tecnico",
    "servicioNombre": "Instalación eléctrica",
    "descripcion": "Instalar tomacorrientes en 3 habitaciones",
    "direccion": "Av. Arequipa 123, Lima",
    "telefono": "+51987654321"
  }'
```

### Reviews - Calificar Técnico

```bash
curl -X POST http://localhost:5000/api/reviews \
  -H "Authorization: Bearer $TOKEN_CLIENTE" \
  -H "Content-Type: application/json" \
  -d '{
    "trabajoId": "uuid-del-trabajo",
    "calificacion": 5,
    "comentario": "Excelente trabajo, muy profesional y puntual"
  }'
```

### Dashboard - Ver Estadísticas

```bash
curl http://localhost:5000/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN_TECNICO"
```

---

## 📁 Estructura de Archivos

```
Backend/
├── docs/
│   ├── swagger.json          # Spec OpenAPI completa
│   └── README.md            # Este archivo
├── src/
│   ├── config/
│   │   └── swagger.ts       # Configuración Swagger UI
│   ├── routes/              # 6 routers
│   ├── controllers/         # 6 controllers
│   ├── services/            # 6 services
│   ├── validators/          # Schemas Zod
│   └── middlewares/         # Auth, validation, etc
└── test-endpoints.sh        # Script de pruebas
```

---

## ✨ Features Especiales

### Rate Limiting
- General: 100 req/15min por IP
- Auth: 5 req/15min por IP
- Protege contra abuso

### Validación con Zod
- Todos los endpoints validan entrada
- Mensajes de error descriptivos
- Transformaciones automáticas (string → boolean, number)

### Notificaciones
- Automáticas al cambiar estado de trabajo
- Al recibir nueva review
- Al recibir mensaje

### Upload de Archivos
- Certificados: PDF, JPG, PNG, WEBP (5MB máx)
- Imágenes: JPG, PNG, WEBP (5MB máx)
- Almacenamiento en Cloudinary

### WebSocket
- Chat en tiempo real
- Notificaciones push

---

## 🚀 Inicio Rápido

```bash
# 1. Instalar dependencias
pnpm add swagger-ui-express
pnpm add -D @types/swagger-ui-express

# 2. Iniciar servidor
pnpm dev

# 3. Abrir documentación
# Browser: http://localhost:5000/api-docs

# 4. Probar health check
curl http://localhost:5000/health
```

---

## 📞 Soporte

Para más información, consulta:
- `TESTING.md` - Guía completa de pruebas
- `swagger.json` - Especificación OpenAPI
- Código fuente en `/src`

**Total de Endpoints: 50+**  
**Documentación: 100% completa** ✅
