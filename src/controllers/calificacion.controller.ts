import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const crearCalificacion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { trabajoId, puntuacion, comentario, fotos = [], esPublico = true } = req.body;

    // Validaciones
    if (![1, 2, 3, 4, 5].includes(puntuacion)) {
      res.status(400).json({ error: 'Puntuación inválida' });
      return;
    }

    if (!req.user) {
      res.status(401).json({ error: 'No autenticado' });
      return;
    }

    const calificacion = await prisma.calificacion.create({
      data: {
        trabajoId,
        puntuacion,
        comentario,
        fotos: JSON.stringify(fotos),
        esPublico,
        userId: req.user.id
      }
    });

    // Actualizar rating del técnico
    await actualizarRatingTecnico(trabajoId);

    res.json(calificacion);
  } catch (error) {
    console.error('Error en crearCalificacion:', error);
    res.status(500).json({ error: 'Error al guardar calificación' });
  }
};

async function actualizarRatingTecnico(trabajoId: string) {
  const trabajo = await prisma.trabajo.findUnique({
    where: { id: trabajoId },
    include: { tecnico: true }
  });

  if (!trabajo || !trabajo.tecnicoId) return;

  const avgRating = await prisma.calificacion.aggregate({
    _avg: { puntuacion: true },
    where: {
      trabajo: {
        is: {
          tecnicoId: trabajo.tecnicoId
        }
      }
    }
  });

  await prisma.tecnico.update({
    where: { id: trabajo.tecnicoId },
    data: { calificacionPromedio: avgRating._avg.puntuacion || 0 }
  });
}

export const obtenerCalificaciones = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tecnicoId } = req.params;

    if (!tecnicoId) {
      res.status(400).json({ error: 'ID de técnico requerido' });
      return;
    }

    const calificaciones = await prisma.calificacion.findMany({
      where: {
        trabajo: {
          is: {
            tecnicoId: tecnicoId
          }
        },
        esPublico: true
      },
      include: {
        user: {
          select: { nombre: true, avatarUrl: true }
        }
      }
    });

    res.json(calificaciones.map(c => ({
      ...c,
      fotos: JSON.parse(c.fotos)
    })));
  } catch (error) {
    console.error('Error en obtenerCalificaciones:', error);
    res.status(500).json({ error: 'Error al obtener calificaciones' });
  }
};
