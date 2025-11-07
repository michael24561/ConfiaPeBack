import { Router } from 'express';
import {
  crearSolicitud,
  obtenerSolicitudes
} from '../controllers/servicio.controller';
import { validarJWT } from '../middlewares/auth.middleware';

const router: Router = Router();

router.post('/', validarJWT, crearSolicitud);
router.get('/', validarJWT, obtenerSolicitudes);

export default router;
