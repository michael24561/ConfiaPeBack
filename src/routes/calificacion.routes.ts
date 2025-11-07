import { Router } from 'express';
import {
  crearCalificacion,
  obtenerCalificaciones
} from '../controllers/calificacion.controller';
import { validarJWT } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/', validarJWT, crearCalificacion);
router.get('/tecnico/:tecnicoId', obtenerCalificaciones);

export default router;
