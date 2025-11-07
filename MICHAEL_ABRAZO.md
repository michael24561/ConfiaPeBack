# 🚀 Guía de Integración Frontend - ConfiaPE Backend

> **Para:** Michael y equipo Frontend  
> **De:** Backend Team  
> **Fecha:** Enero 2025

Esta guía te ayudará a integrar el backend de ConfiaPE en tu aplicación frontend (Next.js/React).

---

## 📋 Tabla de Contenidos

- [Inicio Rápido](#-inicio-rápido)
- [Variables de Entorno Frontend](#-variables-de-entorno-frontend)
- [Autenticación JWT](#-autenticación-jwt)
- [Endpoints por Módulo](#-endpoints-por-módulo)
- [Manejo de Errores](#-manejo-de-errores)
- [WebSocket Chat](#-websocket-chat)
- [Upload de Archivos](#-upload-de-archivos)
- [Ejemplos de Integración](#-ejemplos-de-integración)

---

## ⚡ Inicio Rápido

### 1. Configurar Variables de Entorno

Crea un archivo `.env.local` en tu proyecto frontend:

```env
# Backend API
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000

# OAuth Google (opcional)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id
```

### 2. Instalar Dependencias

```bash
# Cliente HTTP
npm install axios
# O
npm install ky

# WebSocket para chat
npm install socket.io-client

# (Opcional) React Query para cache
npm install @tanstack/react-query
```

### 3. Configurar Cliente API

```typescript
// lib/api-client.ts
import axios from 'axios';

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token automáticamente
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para refrescar token
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${process.env.NEXT_PUBLIC_API_URL}/api/auth/refresh`,
            { refreshToken }
          );
          
          localStorage.setItem('accessToken', data.data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
          
          return apiClient(originalRequest);
        } catch (err) {
          // Refresh falló, logout
          localStorage.clear();
          window.location.href = '/login';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## 🔐 Autenticación JWT

### Flujo de Autenticación

```typescript
// services/auth.service.ts
import apiClient from '@/lib/api-client';

export const authService = {
  // Registro de cliente
  async registerCliente(data: {
    nombreCompleto: string;
    email: string;
    password: string;
    telefono?: string;
  }) {
    const response = await apiClient.post('/api/auth/register/cliente', data);
    
    // Guardar tokens
    localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
    
    return response.data.data.user;
  },

  // Login
  async login(email: string, password: string) {
    const response = await apiClient.post('/api/auth/login', {
      email,
      password,
    });
    
    localStorage.setItem('accessToken', response.data.data.tokens.accessToken);
    localStorage.setItem('refreshToken', response.data.data.tokens.refreshToken);
    
    return response.data.data.user;
  },

  // Obtener perfil actual
  async getCurrentUser() {
    const response = await apiClient.get('/api/auth/me');
    return response.data.data;
  },

  // Logout
  logout() {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/login';
  },
};
```

### Hook de Autenticación (React)

```typescript
// hooks/useAuth.ts
import { create } from 'zustand';
import { authService } from '@/services/auth.service';

interface User {
  id: string;
  email: string;
  nombre: string;
  rol: 'CLIENTE' | 'TECNICO' | 'ADMIN';
}

interface AuthStore {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  fetchUser: () => Promise<void>;
}

export const useAuth = create<AuthStore>((set) => ({
  user: null,
  isAuthenticated: false,

  login: async (email, password) => {
    const user = await authService.login(email, password);
    set({ user, isAuthenticated: true });
  },

  register: async (data) => {
    const user = await authService.registerCliente(data);
    set({ user, isAuthenticated: true });
  },

  logout: () => {
    authService.logout();
    set({ user: null, isAuthenticated: false });
  },

  fetchUser: async () => {
    try {
      const user = await authService.getCurrentUser();
      set({ user, isAuthenticated: true });
    } catch {
      set({ user: null, isAuthenticated: false });
    }
  },
}));
```

---

## 📡 Endpoints por Módulo

### 1. Autenticación

```typescript
// Todos los endpoints de auth
POST   /api/auth/register/cliente    // Registro cliente
POST   /api/auth/register/tecnico    // Registro técnico (multipart)
POST   /api/auth/login               // Login
GET    /api/auth/me                  // Perfil actual (requiere auth)
POST   /api/auth/refresh             // Refrescar token
POST   /api/auth/google              // Login con Google
```

### 2. Técnicos

```typescript
// services/tecnico.service.ts
export const tecnicoService = {
  // Listar técnicos (público)
  async getTecnicos(filters?: {
    categoria?: string;
    q?: string;
    disponible?: boolean;
    calificacionMin?: number;
    page?: number;
    limit?: number;
  }) {
    const params = new URLSearchParams();
    Object.entries(filters || {}).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });
    
    const response = await apiClient.get(`/api/tecnicos?${params}`);
    return response.data.data;
  },

  // Ver perfil de técnico
  async getTecnicoById(id: string) {
    const response = await apiClient.get(`/api/tecnicos/${id}`);
    return response.data.data;
  },

  // Mi perfil (solo técnico autenticado)
  async getMyProfile() {
    const response = await apiClient.get('/api/tecnicos/me');
    return response.data.data;
  },

  // Actualizar perfil
  async updateProfile(data: any) {
    const response = await apiClient.put('/api/tecnicos/me', data);
    return response.data.data;
  },
};
```

### 3. Trabajos

```typescript
// services/trabajo.service.ts
export const trabajoService = {
  // Crear solicitud (solo cliente)
  async createTrabajo(data: {
    tecnicoId: string;
    servicioNombre: string;
    descripcion: string;
    direccion: string;
    telefono: string;
    fechaProgramada?: string;
  }) {
    const response = await apiClient.post('/api/trabajos', data);
    return response.data.data;
  },

  // Mis trabajos
  async getMyTrabajos(estado?: string) {
    const url = estado ? `/api/trabajos?estado=${estado}` : '/api/trabajos';
    const response = await apiClient.get(url);
    return response.data.data;
  },

  // Ver trabajo
  async getTrabajoById(id: string) {
    const response = await apiClient.get(`/api/trabajos/${id}`);
    return response.data.data;
  },

  // Cambiar estado (solo técnico)
  async updateEstado(id: string, nuevoEstado: string, precio?: number) {
    const response = await apiClient.patch(`/api/trabajos/${id}/estado`, {
      nuevoEstado,
      precio,
    });
    return response.data.data;
  },
};
```

### 4. Reviews

```typescript
// services/review.service.ts
export const reviewService = {
  // Crear review (solo cliente)
  async createReview(data: {
    trabajoId: string;
    calificacion: number;
    comentario: string;
  }) {
    const response = await apiClient.post('/api/reviews', data);
    return response.data.data;
  },

  // Reviews de un técnico (público)
  async getReviewsByTecnico(tecnicoId: string, page = 1, limit = 10) {
    const response = await apiClient.get(
      `/api/reviews/tecnico/${tecnicoId}?page=${page}&limit=${limit}`
    );
    return response.data.data;
  },

  // Estadísticas de reviews
  async getReviewStats(tecnicoId: string) {
    const response = await apiClient.get(`/api/reviews/tecnico/${tecnicoId}/stats`);
    return response.data.data;
  },
};
```

### 5. Dashboard (Solo Técnicos)

```typescript
// services/dashboard.service.ts
export const dashboardService = {
  // Estadísticas generales
  async getStats() {
    const response = await apiClient.get('/api/dashboard/stats');
    return response.data.data;
  },

  // Ingresos
  async getIngresos(periodo: 'semana' | 'mes' | 'año' = 'mes') {
    const response = await apiClient.get(`/api/dashboard/ingresos?periodo=${periodo}`);
    return response.data.data;
  },

  // Clientes
  async getClientes() {
    const response = await apiClient.get('/api/dashboard/clientes');
    return response.data.data;
  },

  // Rendimiento
  async getRendimiento() {
    const response = await apiClient.get('/api/dashboard/rendimiento');
    return response.data.data;
  },
};
```

---

## 🔌 WebSocket Chat

### Configurar Socket.IO

```typescript
// lib/socket.ts
import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export const initSocket = (token: string) => {
  if (socket) return socket;

  socket = io(process.env.NEXT_PUBLIC_WS_URL!, {
    auth: { token },
    transports: ['websocket'],
  });

  socket.on('connect', () => {
    console.log('✅ Socket conectado');
  });

  socket.on('disconnect', () => {
    console.log('❌ Socket desconectado');
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
```

### Hook de Chat

```typescript
// hooks/useChat.ts
import { useEffect, useState } from 'react';
import { getSocket, initSocket } from '@/lib/socket';
import apiClient from '@/lib/api-client';

export const useChat = (chatId: string) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;

    const socket = initSocket(token);

    // Cargar mensajes iniciales
    const fetchMessages = async () => {
      try {
        const response = await apiClient.get(
          `/api/chat/conversations/${chatId}/messages`
        );
        setMessages(response.data.data.messages);
      } catch (error) {
        console.error('Error cargando mensajes', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();

    // Escuchar nuevos mensajes
    socket.on('message:new', (message: any) => {
      if (message.chatId === chatId) {
        setMessages((prev) => [...prev, message]);
      }
    });

    return () => {
      socket.off('message:new');
    };
  }, [chatId]);

  const sendMessage = async (texto: string) => {
    try {
      const response = await apiClient.post('/api/messages', {
        chatId,
        texto,
      });
      // El mensaje se agregará vía socket event
      return response.data.data;
    } catch (error) {
      console.error('Error enviando mensaje', error);
      throw error;
    }
  };

  return { messages, loading, sendMessage };
};
```

---

## 📤 Upload de Archivos

### Upload de Avatar

```typescript
// services/upload.service.ts
export const uploadService = {
  async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await apiClient.post('/api/tecnicos/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data.avatarUrl;
  },

  async uploadCertificado(file: File) {
    const formData = new FormData();
    formData.append('certificado', file);

    const response = await apiClient.post('/api/tecnicos/certificados', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data.data;
  },
};
```

### Componente de Upload (React)

```tsx
// components/FileUpload.tsx
import { useState } from 'react';
import { uploadService } from '@/services/upload.service';

export const FileUpload = () => {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const url = await uploadService.uploadAvatar(file);
      console.log('Avatar uploaded:', url);
      // Actualizar UI
    } catch (error) {
      console.error('Upload failed', error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />
      {uploading && <p>Subiendo...</p>}
    </div>
  );
};
```

---

## ⚠️ Manejo de Errores

### Formato de Errores del Backend

```typescript
// Todos los errores siguen este formato:
{
  "success": false,
  "error": "Mensaje de error",
  "details": { /* detalles opcionales */ }
}
```

### Helper de Manejo de Errores

```typescript
// utils/error-handler.ts
export const handleApiError = (error: any) => {
  if (error.response) {
    // Error de respuesta del servidor
    const { status, data } = error.response;
    
    switch (status) {
      case 400:
        return data.error || 'Datos inválidos';
      case 401:
        return 'No autenticado. Por favor inicia sesión';
      case 403:
        return 'No tienes permisos para esta acción';
      case 404:
        return 'Recurso no encontrado';
      case 409:
        return data.error || 'Conflicto con datos existentes';
      case 429:
        return 'Demasiadas solicitudes. Intenta más tarde';
      case 500:
        return 'Error del servidor. Intenta más tarde';
      default:
        return data.error || 'Error desconocido';
    }
  } else if (error.request) {
    // No hubo respuesta
    return 'No se pudo conectar con el servidor';
  } else {
    // Error de configuración
    return error.message || 'Error desconocido';
  }
};
```

### Uso en Componente

```tsx
import { handleApiError } from '@/utils/error-handler';
import { toast } from 'react-hot-toast';

const handleSubmit = async (data: any) => {
  try {
    await trabajoService.createTrabajo(data);
    toast.success('Trabajo creado exitosamente');
  } catch (error) {
    const message = handleApiError(error);
    toast.error(message);
  }
};
```

---

## 📊 Ejemplos Completos de Integración

### Ejemplo 1: Página de Login

```tsx
// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { handleApiError } from '@/utils/error-handler';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success('¡Bienvenido!');
      router.push('/dashboard');
    } catch (error) {
      toast.error(handleApiError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Contraseña"
        required
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Cargando...' : 'Iniciar Sesión'}
      </button>
    </form>
  );
}
```

### Ejemplo 2: Lista de Técnicos

```tsx
// app/tecnicos/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { tecnicoService } from '@/services/tecnico.service';

export default function TecnicosPage() {
  const [tecnicos, setTecnicos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    disponible: true,
    calificacionMin: 4,
    page: 1,
    limit: 20,
  });

  useEffect(() => {
    const fetchTecnicos = async () => {
      try {
        const data = await tecnicoService.getTecnicos(filters);
        setTecnicos(data.tecnicos);
      } catch (error) {
        console.error('Error cargando técnicos', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTecnicos();
  }, [filters]);

  if (loading) return <div>Cargando...</div>;

  return (
    <div>
      <h1>Técnicos Disponibles</h1>
      <div className="grid grid-cols-3 gap-4">
        {tecnicos.map((tecnico: any) => (
          <div key={tecnico.id} className="card">
            <img src={tecnico.user.avatarUrl || '/default-avatar.png'} />
            <h3>{tecnico.user.nombre}</h3>
            <p>{tecnico.oficio}</p>
            <p>⭐ {tecnico.calificacionPromedio.toFixed(1)}</p>
            <p>✅ {tecnico.trabajosCompletados} trabajos</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Ejemplo 3: Crear Trabajo

```tsx
// app/trabajos/crear/page.tsx
'use client';

import { useState } from 'react';
import { trabajoService } from '@/services/trabajo.service';
import { useRouter } from 'next/navigation';

export default function CrearTrabajoPage({ params }: { params: { tecnicoId: string } }) {
  const [formData, setFormData] = useState({
    servicioNombre: '',
    descripcion: '',
    direccion: '',
    telefono: '',
  });
  
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await trabajoService.createTrabajo({
        ...formData,
        tecnicoId: params.tecnicoId,
      });
      
      router.push('/mis-trabajos');
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        placeholder="Servicio (ej: Instalación eléctrica)"
        value={formData.servicioNombre}
        onChange={(e) => setFormData({ ...formData, servicioNombre: e.target.value })}
        required
      />
      <textarea
        placeholder="Descripción del trabajo"
        value={formData.descripcion}
        onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
        required
      />
      <input
        placeholder="Dirección"
        value={formData.direccion}
        onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
        required
      />
      <input
        placeholder="Teléfono"
        value={formData.telefono}
        onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
        required
      />
      <button type="submit">Crear Solicitud</button>
    </form>
  );
}
```

---

## 🛡️ Variables de Entorno Necesarias

### Frontend (.env.local)

```env
# ========================================
# API Backend
# ========================================
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_WS_URL=http://localhost:5000

# ========================================
# OAuth Google (Opcional)
# ========================================
NEXT_PUBLIC_GOOGLE_CLIENT_ID=tu-google-client-id

# ========================================
# Cloudinary (si subes directamente desde frontend)
# ========================================
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu-cloud-name
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=tu-preset

# ========================================
# Producción
# ========================================
# NEXT_PUBLIC_API_URL=https://api.confiape.com
# NEXT_PUBLIC_WS_URL=https://api.confiape.com
```

---

## ✅ Checklist de Integración

- [ ] Configurar variables de entorno
- [ ] Instalar dependencias (axios, socket.io-client)
- [ ] Crear cliente API con interceptors
- [ ] Implementar servicio de autenticación
- [ ] Crear hook/store de auth (useAuth)
- [ ] Configurar socket.io para chat
- [ ] Implementar servicios por módulo
- [ ] Agregar manejo de errores
- [ ] Proteger rutas con middleware
- [ ] Testear flujo completo

---

## 📞 Soporte

**Documentación completa:** http://localhost:5000/api-docs  
**Repositorio:** Backend/  
**Testing:** Ver `TESTING.md`

---

**¡Listo para integrar! 🎉**

