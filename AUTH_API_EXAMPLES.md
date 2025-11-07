# API de Autenticacion - ConfiaPE Backend

## Endpoints Implementados

### 1. Registro de Cliente
**POST** `/api/auth/register/cliente`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "nombreCompleto": "Juan Perez Garcia",
  "email": "juan.perez@example.com",
  "telefono": "987654321",
  "password": "password123"
}
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-del-usuario",
      "email": "juan.perez@example.com",
      "nombre": "Juan Perez Garcia",
      "telefono": "987654321",
      "rol": "CLIENTE",
      "avatarUrl": null,
      "perfilId": "uuid-del-cliente"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 2. Registro de Tecnico
**POST** `/api/auth/register/tecnico`

**Headers:**
```
Content-Type: multipart/form-data
```

**Body (FormData):**
```
email: tecnico@example.com
telefono: 987654321
password: password123
dni: 12345678
nombres: Carlos
apellidos: Rodriguez Lopez
oficio: Electricista
descripcion: Electricista con 10 anos de experiencia en instalaciones residenciales y comerciales
ubicacion: Lima, Peru
experienciaAnios: 10
precioMin: 50.00
precioMax: 200.00
certificados[0]: [File] certificado1.pdf
certificados[1]: [File] certificado2.jpg
certificados[2]: [File] certificado3.png
```

**Respuesta Exitosa (201):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-del-usuario",
      "email": "tecnico@example.com",
      "nombre": "Carlos Rodriguez Lopez",
      "telefono": "987654321",
      "rol": "TECNICO",
      "avatarUrl": null,
      "perfilId": "uuid-del-tecnico"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

**Nota:** Los certificados son opcionales (0-3 archivos). Formatos permitidos: JPG, PNG, WebP, PDF. Tamano maximo: 5MB por archivo.

---

### 3. Inicio de Sesion
**POST** `/api/auth/login`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "email": "juan.perez@example.com",
  "password": "password123",
  "tipoUsuario": "CLIENTE"
}
```

**Tipos de usuario validos:** `CLIENTE`, `TECNICO`, `ADMIN`

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid-del-usuario",
      "email": "juan.perez@example.com",
      "nombre": "Juan Perez Garcia",
      "telefono": "987654321",
      "rol": "CLIENTE",
      "avatarUrl": null,
      "perfilId": "uuid-del-cliente"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

---

### 4. Refrescar Token
**POST** `/api/auth/refresh`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Respuesta Exitosa (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

---

### 5. Obtener Usuario Actual
**GET** `/api/auth/me`

**Headers:**
```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Respuesta Exitosa (200) - Cliente:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-usuario",
    "email": "juan.perez@example.com",
    "nombre": "Juan Perez Garcia",
    "telefono": "987654321",
    "rol": "CLIENTE",
    "avatarUrl": null,
    "emailVerified": false,
    "isActive": true,
    "createdAt": "2025-10-16T19:30:00.000Z",
    "perfil": {
      "perfilId": "uuid-del-cliente",
      "tipo": "CLIENTE"
    }
  }
}
```

**Respuesta Exitosa (200) - Tecnico:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-del-usuario",
    "email": "tecnico@example.com",
    "nombre": "Carlos Rodriguez Lopez",
    "telefono": "987654321",
    "rol": "TECNICO",
    "avatarUrl": null,
    "emailVerified": false,
    "isActive": true,
    "createdAt": "2025-10-16T19:30:00.000Z",
    "perfil": {
      "perfilId": "uuid-del-tecnico",
      "tipo": "TECNICO",
      "dni": "12345678",
      "nombres": "Carlos",
      "apellidos": "Rodriguez Lopez",
      "oficio": "Electricista",
      "descripcion": "Electricista con 10 anos de experiencia...",
      "ubicacion": "Lima, Peru",
      "experienciaAnios": 10,
      "precioMin": "50.00",
      "precioMax": "200.00",
      "calificacionPromedio": "0.00",
      "trabajosCompletados": 0,
      "verificado": false,
      "disponible": true
    }
  }
}
```

---

## Errores Comunes

### Error 400 - Validacion Fallida
```json
{
  "success": false,
  "error": "Validacion fallida",
  "details": [
    {
      "field": "body.email",
      "message": "Email invalido"
    },
    {
      "field": "body.telefono",
      "message": "El telefono debe tener 9 digitos"
    }
  ]
}
```

### Error 401 - No Autorizado
```json
{
  "success": false,
  "error": "Credenciales invalidas"
}
```

### Error 409 - Conflicto
```json
{
  "success": false,
  "error": "El email ya esta registrado"
}
```

### Error 429 - Limite de Intentos
```json
{
  "success": false,
  "error": "Demasiados intentos de autenticacion, intenta en 15 minutos"
}
```

---

## Rate Limiting

Los endpoints de autenticacion tienen rate limiting activo:

- **Registro y Login:** Maximo 5 intentos fallidos cada 15 minutos
- **Refresh Token:** Sin limite (por ahora)
- **Me:** Protegido por token de acceso

---

## Seguridad

1. **Passwords:** Hasheados con bcryptjs (10 rounds)
2. **JWT Tokens:**
   - Access Token: Expira en 15 minutos
   - Refresh Token: Expira en 7 dias
3. **Certificados:** Subidos a Cloudinary con transformaciones automaticas
4. **Validacion:** Schemas estrictos con Zod

---

## Integracion en el servidor

Para usar estos endpoints, agregar la ruta en tu archivo principal (app.ts o index.ts):

```typescript
import authRoutes from './routes/auth.routes';

app.use('/api/auth', authRoutes);
```

---

## Testing con cURL

### Registro de Cliente
```bash
curl -X POST http://localhost:3000/api/auth/register/cliente \
  -H "Content-Type: application/json" \
  -d '{
    "nombreCompleto": "Juan Perez Garcia",
    "email": "juan.perez@example.com",
    "telefono": "987654321",
    "password": "password123"
  }'
```

### Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "juan.perez@example.com",
    "password": "password123",
    "tipoUsuario": "CLIENTE"
  }'
```

### Obtener Usuario Actual
```bash
curl -X GET http://localhost:3000/api/auth/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Proximos Pasos

1. Integrar las rutas en el servidor principal
2. Configurar variables de entorno (.env):
   - JWT_SECRET
   - JWT_REFRESH_SECRET
   - JWT_ACCESS_EXPIRY
   - JWT_REFRESH_EXPIRY
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
3. Probar endpoints con Postman o Insomnia
4. Implementar endpoint de logout (opcional)
5. Implementar verificacion de email (opcional)
