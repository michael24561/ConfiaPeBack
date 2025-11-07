import { Router } from 'express';
import multer from 'multer';
import { uploadImage, uploadMultipleImages } from '../controllers/upload.controller';
import { validarJWT } from '../middlewares/auth.middleware';

const router: Router = Router();

// Configurar multer para almacenar en memoria
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'));
    }
  }
});

// Rutas protegidas
router.post('/image', validarJWT, upload.single('image'), uploadImage);
router.post('/images', validarJWT, upload.array('images', 10), uploadMultipleImages);

export default router;
