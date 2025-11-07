import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearSolicitud = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tecnicoId, descripcion, fotos = [], ubicacion, fechaServicio } = req.body;

    // Validaciones básicas
    if (!tecnicoId || !descripcion || !ubicacion) {
      res.status(400).json({ error: 'Datos incompletos' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const solicitud = await prisma.solicitudServicio.create({
      data: {
        clienteId: req.user.id,
        tecnicoId,
        descripcion,
        fotos: JSON.stringify(fotos),
        ubicacion,
        fechaServicio: fechaServicio || new Date(),
        estado: 'PENDIENTE'
      }
    });

    // Notificar al técnico
    await notificarTecnico(tecnicoId, solicitud.id);

    res.json(solicitud);
  } catch (error) {
    console.error('Error en crearSolicitud:', error);
    res.status(500).json({ error: 'Error al crear solicitud' });
  }
};

export const obtenerSolicitudes = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const solicitudes = await prisma.solicitudServicio.findMany({
      where: { clienteId: req.user.id },
      include: {
        tecnico: {
          include: { user: { select: { nombre: true, avatarUrl: true } } }
        }
      },
      orderBy: { id: 'desc' }
    });

    res.json(solicitudes.map(s => ({
      ...s,
      fotos: JSON.parse(s.fotos)
    })));
  } catch (error) {
    console.error('Error en obtenerSolicitudes:', error);
    res.status(500).json({ error: 'Error al obtener solicitudes' });
  }
};

async function notificarTecnico(tecnicoId: string, solicitudId: string) {
  // Implementar lógica de notificación (WebSocket, email, etc.)
  console.log(`Notificando al técnico ${tecnicoId} sobre solicitud ${solicitudId}`);
  
  // Ejemplo con WebSocket:
  // socket.to(`tecnico-${tecnicoId}`).emit('nueva_solicitud', { solicitudId });
}
