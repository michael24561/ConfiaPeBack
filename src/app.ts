import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import { errorMiddleware } from './middlewares/error.middleware';
import { generalLimiter } from './middlewares/rateLimit.middleware';
import authRoutes from './routes/auth.routes';
import chatRoutes from './routes/chat.routes';
import tecnicoRoutes from './routes/tecnico.routes';
import trabajoRoutes from './routes/trabajo.routes';
import reviewRoutes from './routes/review.routes';
import dashboardRoutes from './routes/dashboard.routes';
import favoritoRoutes from './routes/favorito.routes';
import pagoRoutes from './routes/pago.routes';
import calificacionRoutes from './routes/calificacion.routes';
import servicioRoutes from './routes/servicio.routes';
import uploadRoutes from './routes/upload.routes';
import adminRoutes from './routes/admin.routes';
import { setupSwagger } from './config/swagger';

// Cargar variables de entorno
dotenv.config();

const app: Application = express();

// Middlewares de seguridad
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Configuración de CORS mejorada
app.use(cors({
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      process.env.FRONTEND_URL
    ].filter(Boolean);

    // Permitir requests sin origin (como Postman, mobile apps, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(null, true); // En desarrollo, permitir todos los orígenes
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  maxAge: 600, // 10 minutos
}));

// Parseo de body
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting general
app.use(generalLimiter);

// Swagger Documentation
setupSwagger(app);

// Health check
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/tecnicos', tecnicoRoutes);
app.use('/api/trabajos', trabajoRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/favoritos', favoritoRoutes);
app.use('/api/pagos', pagoRoutes);
app.use('/api/calificaciones', calificacionRoutes);
app.use('/api/servicios', servicioRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/admin', adminRoutes);

// Ruta 404
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
  });
});

// Middleware de manejo de errores (debe ir al final)
app.use(errorMiddleware);

export default app;
