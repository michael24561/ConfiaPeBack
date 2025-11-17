import { createServer } from 'http';
import { Server } from 'socket.io';
import app from './app';
import { logger } from './config/logger';
import { prisma } from './config/database';
import { initializeWebSocket } from './websockets';
import { setSocketServerInstance } from './websockets/socket';

const PORT = process.env.PORT || 5000;

// Crear servidor HTTP
const httpServer = createServer(app);

// Configurar Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
});

// Guardar instancia de Socket.io para uso global
setSocketServerInstance(io);

// Inicializar WebSocket handlers
initializeWebSocket(io);

// Iniciar servidor
const server = httpServer.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  logger.info(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  logger.info(`🔗 Health check: http://localhost:${PORT}/health`);
  logger.info(`⚡ WebSocket habilitado en puerto ${PORT}`);
});

// Manejo de errores no capturados
process.on('unhandledRejection', (reason: Error) => {
  logger.error('Unhandled Rejection:', reason);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  server.close(() => {
    process.exit(1);
  });
});

// Cierre graceful
process.on('SIGTERM', async () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  server.close(async () => {
    await prisma.$disconnect();
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

export default server;
